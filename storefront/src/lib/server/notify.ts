import "server-only";
import { brl } from "@/lib/checkout-types";
import { statusLabel } from "@/lib/order-status";
import { EVENT_INFO, type StoreEvent } from "@/lib/store-events";
import { PENDING_MAX } from "@/lib/webhooks-config";
import { SEND_AFTER_DEFAULT, SEND_AFTER_MAX, SEND_AFTER_MIN } from "@/lib/email-templates";
import { sendAdminEmail, sendTransactionalEmail, getEmailTemplates, resendConfigured } from "./email";
import { clickUrl, REMINDER_PROVIDER } from "./email-tracking";
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

export type NotifyExtra = { reason?: string; pendingMinutes?: number; trackingCode?: string; /** Template cujo link do pedido passa pelo contador de cliques. */ trackTemplate?: string };

function variablesFor(s: Snapshot, extra: NotifyExtra) {
  const p = s.payload;
  return {
    name: p.customer?.name?.trim() || "cliente",
    order_number: p.number,
    total: brl(p.total),
    status: statusLabel(p.status),
    order_url: extra.trackTemplate ? clickUrl(p.number, s.token, extra.trackTemplate) : `${env.siteUrl}/checkout/confirmacao/${encodeURIComponent(p.number)}?t=${encodeURIComponent(s.token)}`,
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
 * Webhook "Pagamento pendente" (só conexões externas, como n8n): pedidos sem pagamento há mais que o tempo configurado
 * em Webhooks (por padrão 15 min, sempre antes dos 30 do prazo). Não envia e-mail: os e-mails têm tempo próprio (scanPendingEmails).
 * Cada pedido avisa uma vez só: a marca fica em integration_events.
 */
export async function scanPendingWebhooks(): Promise<{ checked: number; notified: number; minutes: number }> {
  const { pendingAfterMinutes, endpoints } = await getWebhooksConfig();
  const minutes = Math.min(Math.max(1, pendingAfterMinutes), PENDING_MAX);
  // Sem destino ativo assinando o evento não há o que avisar (e a marca não deve gastar o aviso de um destino futuro).
  if (!endpoints.some((e) => e.active && e.events.includes("order.pending"))) return { checked: 0, notified: 0, minutes };
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

const PENDING_EMAILS = [
  { template: "payment_pending_reminder", provider: REMINDER_PROVIDER, audience: "customer" as const },
  { template: "admin_payment_pending", provider: "email-admin-pending", audience: "admin" as const },
];

/**
 * E-mails de pagamento pendente (lembrete ao cliente e aviso à equipe). O tempo vem de cada template, em Integrações → E-mail.
 * Cada pedido recebe cada e-mail uma vez; o envio do lembrete ao cliente alimenta o relatório do Dashboard.
 */
export async function scanPendingEmails(): Promise<{ checked: number; sent: number }> {
  if (!(await resendConfigured())) return { checked: 0, sent: 0 };
  const templates = await getEmailTemplates();
  const sql = await getSql();
  let checked = 0;
  let sent = 0;
  for (const spec of PENDING_EMAILS) {
    const tpl = templates[spec.template];
    if (!tpl?.enabled) continue;
    const minutes = Math.min(Math.max(SEND_AFTER_MIN, tpl.sendAfterMinutes ?? SEND_AFTER_DEFAULT), SEND_AFTER_MAX);
    const due = await sql.query<{ number: string }>(
      `select o.number from orders o
       where o.status = 'pending_payment' and o.placed_at < now() - make_interval(mins => $1::int)
         and not exists (select 1 from integration_events e where e.provider = $2 and e.external_id = o.number)
       order by o.placed_at limit 50`,
      [minutes, spec.provider],
    );
    checked += due.length;
    for (const row of due) {
      // A marca vem antes do envio: se duas execuções cruzarem, só uma consegue inserir e só ela envia.
      const marked = await sql.query<{ id: string }>(
        "insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, processed_at) values ('email', $1, $2, 'email.sent', $3::jsonb, 'processed', 1, now()) on conflict (provider, external_id) do nothing returning id",
        [spec.provider, row.number, JSON.stringify({ template: spec.template, minutes })],
      );
      if (marked.length === 0) continue;
      const settle = (status: "failed" | "ignored", error: string) =>
        sql.query("update integration_events set status = $3, error = $4 where provider = $1 and external_id = $2", [spec.provider, row.number, status, error]);
      try {
        const snapshot = await loadSnapshot(row.number);
        if (!snapshot) { await settle("ignored", "Pedido não encontrado."); continue; }
        const extra: NotifyExtra = { pendingMinutes: minutes, ...(spec.audience === "customer" ? { trackTemplate: spec.template } : {}) };
        const input = { template: spec.template, variables: variablesFor(snapshot, extra), items: snapshot.items, totals: snapshot.totals };
        if (spec.audience === "customer") {
          if (!snapshot.email) { await settle("ignored", "Pedido sem e-mail."); continue; }
          const result = await sendTransactionalEmail({ to: snapshot.email, ...input });
          if (result.sent) sent += 1; else await settle("ignored", `Não enviado: ${result.reason}.`);
        } else {
          const result = await sendAdminEmail(input);
          if (result.sent) sent += 1; else await settle("ignored", `Não enviado: ${result.reason}.`);
        }
      } catch (e) {
        await settle("failed", e instanceof Error ? e.message : "Falha ao enviar.").catch(() => undefined);
        console.error(`[notify] ${spec.template} ${row.number}:`, e instanceof Error ? e.message : e);
      }
    }
  }
  return { checked, sent };
}

/** Rotina do agendador: webhooks de "pendente" (conexões externas) e e-mails de "pendente" (tempos separados). */
export async function scanPendingOrders() {
  const webhooks = await scanPendingWebhooks();
  const emails = await scanPendingEmails().catch((e) => {
    console.error("[notify] lembretes por e-mail:", e instanceof Error ? e.message : e);
    return { checked: 0, sent: 0 };
  });
  return { ...webhooks, emails };
}
