import "server-only";
import { createHash } from "node:crypto";
import { env, mpMode } from "./env";
import { getSql } from "./sql";
import { getTrackingSettings } from "./tracking-settings";

const GRAPH_VERSION = "v21.0";

export const capiTokenConfigured = () => Boolean(process.env.META_CAPI_ACCESS_TOKEN);

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

type CapiEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url?: string;
  user_data: Record<string, string[]>;
  custom_data?: Record<string, unknown>;
};

async function post(pixelId: string, events: CapiEvent[], testEventCode?: string) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return { ok: false as const, status: 0, error: "META_CAPI_ACCESS_TOKEN não está definido no ambiente." };
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: events, ...(testEventCode ? { test_event_code: testEventCode } : {}) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const body = (await res.json().catch(() => ({}))) as { events_received?: number; error?: { message?: string } };
  if (!res.ok) return { ok: false as const, status: res.status, error: body.error?.message ?? `A Meta respondeu ${res.status}.` };
  return { ok: true as const, status: res.status, received: body.events_received ?? 0 };
}

/** Evento de teste: aparece em Gerenciador de Eventos → Testar eventos, com o código de teste informado. */
export async function sendMetaTestEvent() {
  const s = (await getTrackingSettings()).meta;
  if (!s.pixelId) return { ok: false as const, status: 0, error: "Informe e salve o ID do Pixel primeiro." };
  if (!s.testEventCode) return { ok: false as const, status: 0, error: "Informe e salve o código de teste (Gerenciador de Eventos → Testar eventos)." };
  return post(
    s.pixelId,
    [{ event_name: "PageView", event_time: Math.floor(Date.now() / 1000), event_id: `teste-${Date.now()}`, action_source: "website", event_source_url: env.siteUrl || undefined, user_data: { em: [sha256("teste@dinoblack.example")] } }],
    s.testEventCode,
  );
}

/**
 * Compra confirmada, enviada pelo servidor (não depende de o cliente voltar à página de confirmação).
 * O event_id é o número do pedido, o mesmo usado pelo Pixel no navegador: a Meta junta os dois e conta uma só vez.
 * Só dispara em produção (modo live); nunca bloqueia o pagamento.
 */
export async function sendMetaPurchase(orderNumber: string): Promise<void> {
  try {
    if (mpMode() !== "live" || !capiTokenConfigured()) return;
    const s = (await getTrackingSettings()).meta;
    if (!s.enabled || !s.capi || !s.pixelId) return;
    const sql = await getSql();
    const [order] = await sql.query<{ number: string; total: string | number; customer_email: string | null; customer_phone: string | null; customer_name: string | null; paid_at: string | Date | null }>(
      "select o.number, o.total, o.customer_email, o.customer_phone, o.customer_name, (select max(paid_at) from payments p where p.order_id = o.id) as paid_at from orders o where o.number = $1",
      [orderNumber],
    );
    if (!order) return;
    const items = await sql.query<{ quantity: number; unit_price: string | number; slug: string | null; sku: string | null }>(
      "select oi.quantity, oi.unit_price, (select p.slug from products p where p.id = oi.product_id) as slug, oi.snapshot ->> 'sku' as sku from order_items oi where oi.order_id = (select id from orders where number = $1)",
      [orderNumber],
    );
    const phone = (order.customer_phone ?? "").replace(/\D/g, "");
    const [first, ...rest] = norm(order.customer_name).split(/\s+/);
    const user_data: Record<string, string[]> = {};
    if (order.customer_email) user_data.em = [sha256(norm(order.customer_email))];
    if (phone) user_data.ph = [sha256(phone.startsWith("55") ? phone : `55${phone}`)];
    if (first) user_data.fn = [sha256(first)];
    if (rest.length) user_data.ln = [sha256(rest.join(" "))];
    const result = await post(s.pixelId, [{
      event_name: "Purchase",
      event_time: Math.floor((order.paid_at ? new Date(order.paid_at) : new Date()).getTime() / 1000),
      event_id: order.number,
      action_source: "website",
      event_source_url: env.siteUrl ? `${env.siteUrl}/checkout` : undefined,
      user_data,
      custom_data: {
        currency: "BRL",
        value: Number(order.total),
        order_id: order.number,
        content_type: "product",
        contents: items.map((i) => ({ id: i.slug ?? i.sku ?? "item", quantity: i.quantity, item_price: Number(i.unit_price) })),
      },
    }]);
    if (!result.ok) console.error("[meta capi] falha ao enviar Purchase", order.number, result.error);
  } catch (e) {
    console.error("[meta capi]", e instanceof Error ? e.message : e);
  }
}
