import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { env, mpMode } from "./env";
import { getSql } from "./sql";

export type CredentialKind = "test" | "app_usr" | "unknown";
export type Credentials = {
  mode: "simulated" | "live";
  accessToken: { set: boolean; kind: CredentialKind };
  publicKey: { set: boolean; kind: CredentialKind; hint: string };
  webhookSecret: { set: boolean };
  siteUrl: { value: string; https: boolean };
  database: boolean;
};

const kindOf = (value: string): CredentialKind => (value.startsWith("TEST-") ? "test" : value.startsWith("APP_USR-") ? "app_usr" : "unknown");

/** Só o status das credenciais: nenhum valor secreto sai do servidor. */
export function readCredentials(): Credentials {
  const pub = env.mpPublicKey;
  return {
    mode: mpMode(),
    accessToken: { set: Boolean(env.mpAccessToken), kind: kindOf(env.mpAccessToken) },
    publicKey: { set: Boolean(pub), kind: kindOf(pub), hint: pub ? `${pub.slice(0, 12)}…` : "" },
    webhookSecret: { set: Boolean(env.mpWebhookSecret) },
    siteUrl: { value: env.siteUrl, https: env.siteUrl.startsWith("https://") },
    database: Boolean(env.databaseUrl) || env.localDb,
  };
}

export type BrandInfo = { id: string; name: string; type: "credit_card" | "debit_card" | "pix"; thumbnail: string | null };
export type Connection = {
  state: "connected" | "missing" | "invalid" | "unreachable";
  message: string;
  checkedAt: string;
  account?: { id: string; nickname: string; siteId: string };
  brands: BrandInfo[];
  /** true quando a lista veio de um padrão de referência, não da conta. */
  brandsFromReference: boolean;
};

const REFERENCE_BRANDS: BrandInfo[] = [
  { id: "visa", name: "Visa", type: "credit_card", thumbnail: null },
  { id: "master", name: "Mastercard", type: "credit_card", thumbnail: null },
  { id: "elo", name: "Elo", type: "credit_card", thumbnail: null },
  { id: "amex", name: "American Express", type: "credit_card", thumbnail: null },
  { id: "hipercard", name: "Hipercard", type: "credit_card", thumbnail: null },
  { id: "debvisa", name: "Visa Débito", type: "debit_card", thumbnail: null },
  { id: "debmaster", name: "Mastercard Débito", type: "debit_card", thumbnail: null },
  { id: "debelo", name: "Elo Débito", type: "debit_card", thumbnail: null },
  { id: "pix", name: "Pix", type: "pix", thumbnail: null },
];

async function mpGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${env.mpApiBase}${path}`, {
    headers: { Authorization: `Bearer ${env.mpAccessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { status: res.status, data };
}

/** Confere a conta e as bandeiras aceitas com chamadas de LEITURA à API (nada é cobrado nem alterado no Mercado Pago). */
export async function checkConnection(): Promise<Connection> {
  const checkedAt = new Date().toISOString();
  const base = { checkedAt, brands: REFERENCE_BRANDS, brandsFromReference: true };
  if (!env.mpAccessToken) return { ...base, state: "missing", message: "MP_ACCESS_TOKEN não está definido no ambiente." };
  try {
    const me = await mpGet<{ id?: number; nickname?: string; site_id?: string; message?: string }>("/users/me");
    if (me.status === 401 || me.status === 403) return { ...base, state: "invalid", message: "O Mercado Pago recusou o Access Token. Gere um novo em Suas integrações → Credenciais." };
    if (me.status >= 400 || !me.data?.id) return { ...base, state: "unreachable", message: `O Mercado Pago respondeu ${me.status}. Tente de novo em instantes.` };
    const account = { id: String(me.data.id), nickname: me.data.nickname ?? "—", siteId: me.data.site_id ?? "—" };

    let brands = REFERENCE_BRANDS;
    let fromReference = true;
    const pm = await mpGet<{ id: string; name: string; payment_type_id: string; status?: string; thumbnail?: string; secure_thumbnail?: string }[]>("/v1/payment_methods").catch(() => null);
    if (pm && pm.status === 200 && Array.isArray(pm.data)) {
      const wanted = new Set(["credit_card", "debit_card"]);
      const fromApi = pm.data
        .filter((m) => m.status !== "deactive" && (wanted.has(m.payment_type_id) || m.id === "pix"))
        .map<BrandInfo>((m) => ({ id: m.id, name: m.name, type: m.id === "pix" ? "pix" : (m.payment_type_id as "credit_card" | "debit_card"), thumbnail: m.secure_thumbnail ?? m.thumbnail ?? null }));
      if (fromApi.length > 0) {
        brands = fromApi;
        fromReference = false;
      }
    }
    return { checkedAt, state: "connected", message: "Conta conectada.", account, brands, brandsFromReference: fromReference };
  } catch {
    return { ...base, state: "unreachable", message: "Não foi possível falar com o Mercado Pago (sem resposta). Confira a conexão do servidor." };
  }
}

/** Guarda o resultado na tabela de integrações (status que aparece no painel). */
export async function recordConnection(connection: Connection) {
  try {
    const sql = await getSql();
    const status = connection.state === "connected" ? (mpMode() === "live" ? "active" : "sandbox") : connection.state === "missing" ? "not_configured" : "failing";
    const notes = connection.state === "connected" ? `Conta ${connection.account?.id} (${connection.account?.nickname}). Modo ${mpMode()}.` : connection.message;
    await sql.query(
      `insert into integrations (domain, provider, status, owner_name, last_checked_at, notes)
       values ('payments', 'mercadopago', $1::integration_status, 'Mercado Pago', now(), $2)
       on conflict (domain) do update set provider = 'mercadopago', status = excluded.status, last_checked_at = now(), notes = excluded.notes`,
      [status, notes],
    );
  } catch {
    // sem banco: o painel só não guarda o histórico
  }
}

export type Dashboard = {
  stats: { method: string; status: string; n: number; total: number }[];
  events: { id: string; eventType: string; status: string; error: string | null; receivedAt: string; order: string | null }[];
  lastReceivedAt: string | null;
  pendingAlerts: number;
  integration: { status: string; lastCheckedAt: string | null; notes: string | null } | null;
};

/** Números dos últimos 30 dias e as últimas notificações recebidas. Sem banco, devolve null. */
export async function loadDashboard(): Promise<Dashboard | null> {
  try {
    const sql = await getSql();
    const stats = await sql.query<{ method: string; status: string; n: number; total: number }>(
      `select case when method = 'credit_card' and coalesce(provider_data ->> 'methodId', '') like 'deb%' then 'debit_card' else method::text end as method,
              status::text as status, count(*)::int as n, coalesce(sum(amount), 0)::float8 as total
       from payments where provider = 'mercadopago' and created_at > now() - interval '30 days' group by 1, 2`,
    );
    const events = await sql.query<{ id: string; event_type: string; status: string; error: string | null; received_at: string | Date; payload: { order?: string } | null }>(
      "select id, event_type, status, error, received_at, payload from integration_events where provider = 'mercadopago' order by received_at desc limit 12",
    );
    const [alerts] = await sql.query<{ n: number }>(
      "select count(*)::int as n from admin_notifications where kind in ('pagamento_divergente', 'pagamento_pedido_cancelado', 'pagamento_estornado') and coalesce(is_read, false) = false",
    ).catch(() => [{ n: 0 }]);
    const [integration] = await sql.query<{ status: string; last_checked_at: string | Date | null; notes: string | null }>(
      "select status::text as status, last_checked_at, notes from integrations where domain = 'payments' limit 1",
    ).catch(() => []);
    return {
      stats,
      events: events.map((e) => ({ id: e.id, eventType: e.event_type, status: e.status, error: e.error, receivedAt: new Date(e.received_at).toISOString(), order: e.payload?.order ?? null })),
      lastReceivedAt: events[0] ? new Date(events[0].received_at).toISOString() : null,
      pendingAlerts: alerts?.n ?? 0,
      integration: integration ? { status: integration.status, lastCheckedAt: integration.last_checked_at ? new Date(integration.last_checked_at).toISOString() : null, notes: integration.notes } : null,
    };
  } catch {
    return null;
  }
}

/** Envia ao nosso próprio webhook uma notificação assinada com o segredo configurado, para provar que a assinatura e a rota funcionam. */
export async function testWebhook(origin: string): Promise<{ ok: boolean; status: number; message: string }> {
  const dataId = "100000001";
  const requestId = `teste-${randomUUID()}`;
  const ts = String(Date.now());
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-request-id": requestId };
  if (env.mpWebhookSecret) {
    const v1 = createHmac("sha256", env.mpWebhookSecret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
    headers["x-signature"] = `ts=${ts},v1=${v1}`;
  }
  try {
    const res = await fetch(`${origin}/api/webhooks/mercadopago`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "payment", data: { id: dataId } }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true, status: res.status, message: "A rota respondeu 200 e aceitou a assinatura. (Notificação de teste: nenhum pedido foi alterado.)" };
    if (res.status === 401) return { ok: false, status: 401, message: mpMode() === "live" && !env.mpWebhookSecret ? "Sem MP_WEBHOOK_SECRET no ambiente, o modo live recusa todas as notificações." : "A assinatura foi recusada. Confira se MP_WEBHOOK_SECRET é a chave secreta mostrada no painel do Mercado Pago." };
    return { ok: false, status: res.status, message: `A rota respondeu ${res.status}. Veja o log do servidor.` };
  } catch {
    return { ok: false, status: 0, message: "Não foi possível chamar a rota do webhook a partir do servidor." };
  }
}
