import "server-only";
import { brl } from "@/lib/checkout-types";
import { statusLabel } from "@/lib/order-status";
import { EVENT_INFO, type StoreEvent } from "@/lib/store-events";
import { PENDING_MAX } from "@/lib/webhooks-config";
import { sendAdminEmail, sendTransactionalEmail } from "./email";
import type { EmailItem, EmailTotals } from "./email-layout";
import { env } from "./env";
import { later } from "./later";
import { getSql } from "./sql";
import { dispatchWebhooks, getWebhooksConfig, type OrderPayload } from "./webhooks";

type Snapshot = {
  id: string;
  token: string;
  email: string | null;
  payload: OrderPayload;
  items: EmailItem[];
  totals: EmailTotals;
};

const PAYMENT_LABEL: Record<string, string> = { pix: "Pix", credit_card: "Cartão", debit_card: "Cartão de débito", boleto: "Boleto" };

/** Lê o pedido do banco no formato que e-mails e webhooks usam. */
async function loadSnapshot(number: string): Promise<Snapshot | null> {
  const sql = await getSql();
  const [o] = await sql.query<{
    id: string; number: string; status: string; subtotal: string | number; discount_total: string | number; shipping_total: string | number; total: string | number;
    customer_name: string | null; customer_email: string | null; guest_email: string | null; customer_phone: string | null; public_token: string;
    placed_at: string | Date; cancel_reason: string | null; payment_method: string | null; tracking_code: string | null; method_id: string | null;
  }>(
    `select o.id, o.number, o.status::text as status, o.subtotal, o.discount_total, o.shipping_total, o.total, o.customer_name, o.customer_email, o.guest_email,
            o.customer_phone, o.public_token, o.placed_at, o.cancel_reason, o.payment_method::text as payment_method,
            (select s.tracking_code from shipments s where s.order_id = o.id order by s.created_at desc limit 1) as tracking_code,
            (select p.provider_data ->> 'methodId' from payments p where p.order_id = o.id order by p.created_at desc limit 1) as method_id
     from orders o where o.number = $1`,
    [number],
  );
  if (!o) return null;
  const rows = await sql.query<{ quantity: number; unit_price: string | number; slug: string | null; snapshot: { name?: string; image?: string | null; options?: Record<string, string> } }>(
    "select oi.quantity, oi.unit_price, oi.snapshot, (select p.slug from products p where p.id = oi.product_id) as slug from order_items oi where oi.order_id = $1::uuid order by oi.id",
    [o.id],
  );
  const debit = (o.method_id ?? "").startsWith("deb");
  const method = debit ? "debit_card" : o.payment_method;
  const items: EmailItem[] = rows.map((r) => ({
    name: r.snapshot?.name ?? "Produto", image: r.snapshot?.image ?? null, qty: r.quantity, unitPrice: Number(r.unit_price),
    options: Object.values(r.snapshot?.options ?? {}).filter(Boolean).join(" · ") || undefined,
  }));
  const totals: EmailTotals = { subtotal: Number(o.subtotal), discount: Number(o.discount_total), shipping: Number(o.shipping_total), total: Number(o.total) };
  return {
    id: o.id,
    token: o.public_token,
    email: o.customer_email ?? o.guest_email,
    items,
    totals,
    payload: {
      number: o.number, status: o.status, total: totals.total, subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping,
      payment_method: method, placed_at: new Date(o.placed_at).toISOString(), reason: o.cancel_reason, tracking_code: o.tracking_code,
      items: rows.map((r) => ({ slug: r.slug, name: r.snapshot?.name ?? "Produto", quantity: r.quantity, unit_price: Number(r.unit_price) })),
      customer: { name: o.customer_name, email: o.customer_email ?? o.guest_email, phone: o.customer_phone },
    },
  };
}

export type NotifyExtra = { reason?: string; pendingMinutes?: number; trackingCode?: string };

function variablesFor(s: Snapshot, extra: NotifyExtra) {
  const p = s.payload;
  return {
    name: p.customer?.name?.trim() || "cliente",
    order_number: p.number,
    total: brl(p.total),
    status: statusLabel(p.status),
    order_url: `${env.siteUrl}/checkout/confirmacao/${encodeURIComponent(p.number)}?t=${encodeURIComponent(s.token)}`,
    admin_url: `${env.siteUrl}/admin/pedidos/${s.id}`,
    tracking_code: extra.trackingCode ?? p.tracking_code ?? "ainda não informado",
    payment_method: p.payment_method ? PAYMENT_LABEL[p.payment_method] ?? p.payment_method : "a definir",
    customer_email: p.customer?.email ?? "",
    reason: extra.reason ?? p.reason ?? "não informado",
    pending_minutes: String(extra.pendingMinutes ?? ""),
  };
}

/**
 * Ponto único de notificação: avisa o cliente, avisa a equipe e chama os webhooks.
 * Cada saída é independente: se o e-mail falhar, o webhook segue (e vice-versa). Nunca lança erro.
 */
export async function notifyOrderEvent(event: StoreEvent, orderNumber: string, extra: NotifyExtra = {}): Promise<void> {
  try {
    const snapshot = await loadSnapshot(orderNumber);
    if (!snapshot) return;
    const info = EVENT_INFO[event];
    const variables = variablesFor(snapshot, extra);
    const payload: OrderPayload = { ...snapshot.payload, ...(extra.reason ? { reason: extra.reason } : {}), ...(extra.pendingMinutes ? { pending_minutes: extra.pendingMinutes } : {}), ...(extra.trackingCode ? { tracking_code: extra.trackingCode } : {}) };
    const tasks: Promise<unknown>[] = [];
    if (info.customer && snapshot.email) {
      tasks.push(sendTransactionalEmail({ to: snapshot.email, template: info.customer, variables, items: snapshot.items, totals: snapshot.totals }));
    }
    if (info.admin) tasks.push(sendAdminEmail({ template: info.admin, variables, items: snapshot.items, totals: snapshot.totals }));
    tasks.push(dispatchWebhooks(event, payload));
    const results = await Promise.allSettled(tasks);
    for (const r of results) if (r.status === "rejected") console.error(`[notify] ${event} ${orderNumber}:`, r.reason instanceof Error ? r.reason.message : r.reason);
  } catch (e) {
    console.error(`[notify] ${event} ${orderNumber}:`, e instanceof Error ? e.message : e);
  }
}

/** Reenvia um e-mail específico ao cliente (botão do painel), sem acionar webhooks nem avisar a equipe. */
export async function resendCustomerEmail(orderNumber: string, template: string): Promise<"sent" | "no_email" | "not_found" | "not_configured" | "disabled"> {
  const snapshot = await loadSnapshot(orderNumber);
  if (!snapshot) return "not_found";
  if (!snapshot.email) return "no_email";
  const result = await sendTransactionalEmail({ to: snapshot.email, template, variables: variablesFor(snapshot, {}), items: snapshot.items, totals: snapshot.totals });
  return result.sent ? "sent" : result.reason === "disabled" ? "disabled" : "not_configured";
}

/** Dispara a notificação sem prender a resposta ao cliente. */
export function notifyLater(event: StoreEvent, orderNumber: string, extra: NotifyExtra = {}) {
  later(() => notifyOrderEvent(event, orderNumber, extra));
}

/**
 * Pedidos sem pagamento há mais que o tempo configurado em Webhooks (por padrão 15 min, sempre antes dos 30 do prazo).
 * Cada pedido avisa uma vez só: a marca fica em integration_events. Chamada pelo agendador (cron) ou pelo botão do painel.
 */
export async function scanPendingOrders(): Promise<{ checked: number; notified: number; minutes: number }> {
  const { pendingAfterMinutes } = await getWebhooksConfig();
  const minutes = Math.min(Math.max(1, pendingAfterMinutes), PENDING_MAX);
  const sql = await getSql();
  const due = await sql.query<{ number: string }>(
    `select o.number from orders o
     where o.status = 'pending_payment' and o.placed_at < now() - make_interval(mins => $1::int)
       and not exists (select 1 from integration_events e where e.provider = 'order-pending' and e.external_id = o.number)
     order by o.placed_at limit 50`,
    [minutes],
  );
  let notified = 0;
  for (const row of due) {
    // A marca vem antes do aviso: se duas execuções cruzarem, só uma consegue inserir e só ela avisa.
    const marked = await sql.query<{ id: string }>(
      "insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, processed_at) values ('webhooks', 'order-pending', $1, 'order.pending', $2::jsonb, 'processed', 1, now()) on conflict (provider, external_id) do nothing returning id",
      [row.number, JSON.stringify({ minutes })],
    );
    if (marked.length === 0) continue;
    await notifyOrderEvent("order.pending", row.number, { pendingMinutes: minutes });
    notified += 1;
  }
  return { checked: due.length, notified, minutes };
}
