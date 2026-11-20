import "server-only";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { StoreEvent } from "@/lib/store-events";
import { PENDING_DEFAULT, WEBHOOKS_DEFAULTS, checkWebhookUrl, type CleanEndpoint, type WebhookEndpoint, type WebhooksConfig } from "@/lib/webhooks-config";
import { getSql } from "./sql";

const KEY = "webhooks_config";
const MAX_ATTEMPTS = 5;

/** Corpo que os destinos recebem. `data.order.customer` só vai se o destino pedir. */
export type OrderPayload = {
  number: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  payment_method: string | null;
  placed_at: string;
  reason?: string | null;
  tracking_code?: string | null;
  pending_minutes?: number;
  items: { slug: string | null; name: string; quantity: number; unit_price: number }[];
  customer?: { name: string | null; email: string | null; phone: string | null };
};

export const newSecret = () => `whsec_${randomBytes(24).toString("hex")}`;
export const newEndpointId = () => `wh_${randomBytes(6).toString("hex")}`;

export async function getWebhooksConfig(): Promise<WebhooksConfig> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: Partial<WebhooksConfig> | null }>("select value from store_settings where key = $1 limit 1", [KEY]);
    const v = rows[0]?.value;
    if (!v || typeof v !== "object") return WEBHOOKS_DEFAULTS;
    const minutes = Number(v.pendingAfterMinutes);
    return {
      endpoints: Array.isArray(v.endpoints) ? v.endpoints : [],
      pendingAfterMinutes: Number.isInteger(minutes) && minutes >= 1 ? minutes : PENDING_DEFAULT,
    };
  } catch {
    return WEBHOOKS_DEFAULTS;
  }
}

/** Mantém os segredos dos destinos que já existem e cria um para cada novo. */
export async function saveWebhooksConfig(clean: { endpoints: CleanEndpoint[]; pendingAfterMinutes: number }): Promise<{ config: WebhooksConfig; created: string[] }> {
  const current = await getWebhooksConfig();
  const created: string[] = [];
  const endpoints: WebhookEndpoint[] = clean.endpoints.map((e) => {
    const existing = current.endpoints.find((c) => c.id === e.id);
    if (existing) return { ...e, secret: existing.secret };
    const id = newEndpointId();
    created.push(id);
    return { ...e, id, secret: newSecret() };
  });
  const config: WebhooksConfig = { endpoints, pendingAfterMinutes: clean.pendingAfterMinutes };
  const sql = await getSql();
  await sql.query(
    "insert into store_settings (key, value, is_public) values ($1, $2::jsonb, false) on conflict (key) do update set value = excluded.value, updated_at = now()",
    [KEY, JSON.stringify(config)],
  );
  return { config, created };
}

export async function regenerateSecret(id: string): Promise<string | null> {
  const config = await getWebhooksConfig();
  const target = config.endpoints.find((e) => e.id === id);
  if (!target) return null;
  target.secret = newSecret();
  const sql = await getSql();
  await sql.query("update store_settings set value = $2::jsonb, updated_at = now() where key = $1", [KEY, JSON.stringify(config)]);
  return target.secret;
}

/** Nunca devolve o segredo inteiro: só o começo e o fim, para reconhecer qual é qual. */
export const maskSecret = (secret: string) => `${secret.slice(0, 10)}…${secret.slice(-4)}`;

type Envelope = { id: string; type: string; created_at: string; data: { order: OrderPayload } };

function sign(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Envia um evento a um destino. Devolve se deu certo e o que o destino respondeu. */
async function post(endpoint: WebhookEndpoint, envelope: Envelope): Promise<{ ok: boolean; status: number; error?: string }> {
  const body = JSON.stringify(envelope);
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "DinoBlack-Webhooks/1.0",
        "X-DinoBlack-Event": envelope.type,
        "X-DinoBlack-Delivery": envelope.id,
        "X-DinoBlack-Timestamp": timestamp,
        "X-DinoBlack-Signature": `sha256=${sign(endpoint.secret, timestamp, body)}`,
      },
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `O destino respondeu ${res.status}.` };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error && e.name === "TimeoutError" ? "O destino não respondeu em 8 segundos." : "Não foi possível conectar ao destino." };
  }
}

async function record(endpoint: WebhookEndpoint, envelope: Envelope, result: { ok: boolean; status: number; error?: string }, attempts: number, existingId?: string) {
  try {
    const sql = await getSql();
    const payload = JSON.stringify({ endpointId: endpoint.id, endpointName: endpoint.name, order: envelope.data.order.number, httpStatus: result.status, envelope });
    const status = result.ok ? "processed" : "failed";
    if (existingId) {
      await sql.query("update integration_events set status = $2, attempts = $3, error = $4, payload = $5::jsonb, processed_at = now() where id = $1::uuid", [existingId, status, attempts, result.error ?? null, payload]);
    } else {
      await sql.query(
        "insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, error, processed_at) values ('webhooks', 'webhook', $1, $2, $3::jsonb, $4, $5, $6, now()) on conflict (provider, external_id) do nothing",
        [`${endpoint.id}:${envelope.id}`, envelope.type, payload, status, attempts, result.error ?? null],
      );
    }
  } catch (e) {
    console.error("[webhooks] não foi possível registrar a entrega:", e instanceof Error ? e.message : e);
  }
}

/** Leva o evento a todos os destinos ativos que o assinaram. Falhas ficam registradas para nova tentativa. */
export async function dispatchWebhooks(event: StoreEvent, order: OrderPayload & { customer?: OrderPayload["customer"] }) {
  const config = await getWebhooksConfig();
  const targets = config.endpoints.filter((e) => e.active && e.events.includes(event));
  if (targets.length === 0) return;
  await Promise.allSettled(
    targets.map(async (endpoint) => {
      const { customer, ...rest } = order;
      const envelope: Envelope = { id: `evt_${randomUUID()}`, type: event, created_at: new Date().toISOString(), data: { order: endpoint.includeCustomer && customer ? { ...rest, customer } : rest } };
      await record(endpoint, envelope, await post(endpoint, envelope), 1);
    }),
  );
}

/**
 * Evento de teste com um pedido de exemplo. Aceita o que está no formulário: um destino salvo (usa o segredo dele,
 * com o endereço que estiver na tela) ou um destino novo (usa um segredo provisório só para este teste).
 */
export async function sendTestWebhook(input: { id?: string; url?: string; includeCustomer?: boolean }, allowLocal: boolean): Promise<{ ok: boolean; status: number; message: string; temporarySecret?: boolean } | { error: string }> {
  const config = await getWebhooksConfig();
  const saved = input.id ? config.endpoints.find((e) => e.id === input.id) : undefined;
  const url = (input.url ?? saved?.url ?? "").trim();
  const urlError = checkWebhookUrl(url, allowLocal);
  if (urlError) return { error: urlError };
  const temporary = !saved;
  const endpoint: WebhookEndpoint = {
    id: saved?.id ?? "wh_teste",
    name: saved?.name ?? "Teste (destino não salvo)",
    url,
    secret: saved?.secret ?? `whsec_teste_${randomBytes(12).toString("hex")}`,
    events: saved?.events ?? [],
    active: true,
    includeCustomer: input.includeCustomer ?? saved?.includeCustomer ?? true,
  };
  const order: OrderPayload = {
    number: "DB-TESTE", status: "paid", total: 149.99, subtotal: 149.99, discount: 0, shipping: 0, payment_method: "pix", placed_at: new Date().toISOString(),
    items: [{ slug: "controle-sem-fio-xbox-pulse-red", name: "Controle sem Fio Xbox Pulse Red", quantity: 1, unit_price: 149.99 }],
    ...(endpoint.includeCustomer ? { customer: { name: "Cliente de Teste", email: "cliente@exemplo.com", phone: "(61) 90000-0000" } } : {}),
  };
  const envelope: Envelope = { id: `evt_${randomUUID()}`, type: "webhook.test", created_at: new Date().toISOString(), data: { order } };
  const result = await post(endpoint, envelope);
  await record(endpoint, envelope, result, 1);
  return { ok: result.ok, status: result.status, message: result.ok ? `O destino respondeu ${result.status}.` : result.error ?? "Falhou.", ...(temporary ? { temporarySecret: true } : {}) };
}

/** Reenvia entregas que falharam (até 5 tentativas, dentro de 24 horas, com espera crescente entre elas). */
export async function retryFailedDeliveries(): Promise<number> {
  const sql = await getSql();
  const config = await getWebhooksConfig();
  const failed = await sql.query<{ id: string; attempts: number; payload: { endpointId: string; envelope: Envelope } }>(
    `select id, attempts, payload from integration_events
     where provider = 'webhook' and status = 'failed' and attempts < ${MAX_ATTEMPTS}
       and received_at > now() - interval '24 hours'
       and coalesce(processed_at, received_at) < now() - (attempts * attempts * interval '1 minute')
     order by received_at limit 20`,
  );
  let retried = 0;
  for (const row of failed) {
    const endpoint = config.endpoints.find((e) => e.id === row.payload?.endpointId && e.active);
    if (!endpoint || !row.payload?.envelope) continue;
    await record(endpoint, row.payload.envelope, await post(endpoint, row.payload.envelope), row.attempts + 1, row.id);
    retried += 1;
  }
  return retried;
}

export type DeliveryRow = { id: string; event: string; endpoint: string; order: string | null; status: string; attempts: number; httpStatus: number | null; error: string | null; at: string };

export async function listDeliveries(limit = 25): Promise<DeliveryRow[]> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ id: string; event_type: string; status: string; attempts: number; error: string | null; received_at: string | Date; payload: { endpointName?: string; order?: string; httpStatus?: number } | null }>(
      "select id, event_type, status, attempts, error, received_at, payload from integration_events where provider = 'webhook' order by received_at desc limit $1",
      [limit],
    );
    return rows.map((r) => ({ id: r.id, event: r.event_type, endpoint: r.payload?.endpointName ?? "—", order: r.payload?.order ?? null, status: r.status, attempts: r.attempts, httpStatus: r.payload?.httpStatus ?? null, error: r.error, at: new Date(r.received_at).toISOString() }));
  } catch {
    return [];
  }
}
