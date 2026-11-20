import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { getSql } from "./sql";

/**
 * Relatório do lembrete de pagamento pendente: envios, cliques de volta à loja e compras feitas depois.
 * Tudo fica em integration_events (sem tabela nova):
 *   provider "email-reminder"  → um envio por pedido (external_id = número do pedido)
 *   provider "email-click"     → um clique no botão do e-mail
 */
export const REMINDER_PROVIDER = "email-reminder";
export const CLICK_PROVIDER = "email-click";
export const REMINDER_TEMPLATE = "payment_pending_reminder";

/** Link do botão do e-mail: passa por aqui, conta o clique e leva ao pedido. O destino é montado no servidor, nunca vem da URL. */
export function clickUrl(orderNumber: string, token: string, template: string) {
  const q = new URLSearchParams({ n: orderNumber, t: token, k: template });
  return `${env.siteUrl}/api/e/click?${q.toString()}`;
}

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Registra o clique (se o token do pedido confere) e devolve o endereço do pedido; sem pedido válido, devolve null. */
export async function recordEmailClick(orderNumber: string, token: string, template: string): Promise<string | null> {
  if (!orderNumber || !token || template !== REMINDER_TEMPLATE) return null;
  const sql = await getSql();
  const [order] = await sql.query<{ public_token: string }>("select public_token from orders where number = $1 limit 1", [orderNumber]);
  if (!order || !sameToken(String(order.public_token), token)) return null;
  // Um clique por pedido a cada minuto: recarregar a página ou o leitor de e-mail abrindo o link duas vezes não infla o número.
  const bucket = Math.floor(Date.now() / 60_000);
  await sql
    .query(
      "insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, processed_at) values ('email', $1, $2, 'email.click', $3::jsonb, 'processed', 1, now()) on conflict (provider, external_id) do nothing",
      [CLICK_PROVIDER, `${orderNumber}:${template}:${bucket}`, JSON.stringify({ order: orderNumber, template })],
    )
    .catch((e: unknown) => console.error("[email-click]", e instanceof Error ? e.message : e));
  return `${env.siteUrl}/checkout/confirmacao/${encodeURIComponent(orderNumber)}?t=${encodeURIComponent(token)}`;
}

export type ReminderStats = {
  sent: number;
  failed: number;
  /** Pedidos distintos que clicaram no botão. */
  clickedOrders: number;
  clicks: number;
  /** Pedidos que foram pagos depois do lembrete. */
  paidAfter: number;
  /** Desses, os que clicaram no e-mail antes de pagar. */
  paidAfterClick: number;
  revenueAfter: number;
  revenueAfterClick: number;
};

/** Lembretes enviados no período e o que veio depois. Compra "depois do lembrete" não prova que o e-mail causou a compra: por isso o painel separa quem clicou. */
export async function getReminderStats(from: Date, to: Date): Promise<ReminderStats> {
  const sql = await getSql();
  const params = [REMINDER_PROVIDER, CLICK_PROVIDER, from.toISOString(), to.toISOString()];
  const [row] = await sql.query<{ sent: number; failed: number; clicked_orders: number; clicks: number; paid_after: number; paid_after_click: number; revenue_after: string | number; revenue_after_click: string | number }>(
    `with r as (
       select e.external_id as number, e.received_at as sent_at, e.status
       from integration_events e
       where e.provider = $1 and e.received_at >= $3::timestamptz and e.received_at < $4::timestamptz
     ),
     c as (
       select (e.payload ->> 'order') as number, count(*) as clicks, min(e.received_at) as first_click
       from integration_events e
       where e.provider = $2 and e.received_at >= $3::timestamptz
       group by 1
     ),
     joined as (
       select r.number, r.status, r.sent_at, coalesce(c.clicks, 0) as clicks, c.first_click,
              o.paid_at, o.total, o.status::text as order_status
       from r
       left join c on c.number = r.number
       left join orders o on o.number = r.number
     )
     select count(*) filter (where status = 'processed')::int as sent,
            count(*) filter (where status = 'failed')::int as failed,
            count(*) filter (where status = 'processed' and clicks > 0)::int as clicked_orders,
            coalesce(sum(clicks) filter (where status = 'processed'), 0)::int as clicks,
            count(*) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and order_status not in ('cancelled', 'refunded'))::int as paid_after,
            count(*) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and first_click is not null and first_click <= paid_at and order_status not in ('cancelled', 'refunded'))::int as paid_after_click,
            coalesce(sum(total) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and order_status not in ('cancelled', 'refunded')), 0) as revenue_after,
            coalesce(sum(total) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and first_click is not null and first_click <= paid_at and order_status not in ('cancelled', 'refunded')), 0) as revenue_after_click
     from joined`,
    params,
  );
  return {
    sent: row?.sent ?? 0,
    failed: row?.failed ?? 0,
    clickedOrders: row?.clicked_orders ?? 0,
    clicks: row?.clicks ?? 0,
    paidAfter: row?.paid_after ?? 0,
    paidAfterClick: row?.paid_after_click ?? 0,
    revenueAfter: Number(row?.revenue_after ?? 0),
    revenueAfterClick: Number(row?.revenue_after_click ?? 0),
  };
}
