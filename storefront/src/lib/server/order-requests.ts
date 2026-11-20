import "server-only";
import { CheckoutError } from "./checkout";
import { notifyLater } from "./notify";
import { getSql } from "./sql";
import { extendedStatusesSupported } from "./status-support";

export type RequestKind = "exchange" | "refund";
export type OrderRequestRow = { id: string; kind: RequestKind; reason: string; status: string; createdAt: string };

const KIND_LABEL: Record<RequestKind, string> = { exchange: "troca", refund: "estorno" };
const ELIGIBLE: Record<RequestKind, string[]> = {
  exchange: ["shipped", "delivered"],
  refund: ["paid", "preparing", "shipped", "delivered"],
};

/** Pedidos de troca e estorno de um pedido (painel). Sem a migration, devolve lista vazia. */
export async function listOrderRequests(orderId: string): Promise<OrderRequestRow[]> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ id: string; kind: RequestKind; reason: string; status: string; created_at: string | Date }>(
      "select id, kind, reason, status, created_at from order_requests where order_id = $1::uuid order by created_at desc",
      [orderId],
    );
    return rows.map((r) => ({ id: r.id, kind: r.kind, reason: r.reason, status: r.status, createdAt: new Date(r.created_at).toISOString() }));
  } catch {
    return [];
  }
}

/**
 * O cliente (com o link do pedido) pede troca ou estorno. Fica registrado, muda o status quando é troca
 * e avisa o cliente, a equipe e os webhooks.
 */
export async function createOrderRequest(number: string, token: string, kind: string, reason: string): Promise<void> {
  if (kind !== "exchange" && kind !== "refund") throw new CheckoutError("Escolha troca ou estorno.");
  const why = reason.trim();
  if (why.length < 3 || why.length > 1000) throw new CheckoutError("Conte em poucas palavras o motivo (de 3 a 1000 caracteres).");
  if (!/^DB-\d{3,10}$/.test(number) || !/^[0-9a-f-]{36}$/i.test(token)) throw new CheckoutError("Pedido não encontrado.", 404);

  const sql = await getSql();
  const [order] = await sql.query<{ id: string; status: string }>("select id, status::text as status from orders where number = $1 and public_token = $2::uuid", [number, token]);
  if (!order) throw new CheckoutError("Pedido não encontrado.", 404);
  if (!ELIGIBLE[kind].includes(order.status)) {
    throw new CheckoutError(`Este pedido não aceita pedido de ${KIND_LABEL[kind]} no status atual.`, 409);
  }

  try {
    const open = await sql.query("select 1 as ok from order_requests where order_id = $1::uuid and kind = $2 and status = 'open' limit 1", [order.id, kind]);
    if (open.length > 0) throw new CheckoutError(`Já existe um pedido de ${KIND_LABEL[kind]} em análise para este pedido.`, 409);
    await sql.query("insert into order_requests (order_id, kind, reason) values ($1::uuid, $2, $3)", [order.id, kind, why]);
  } catch (e) {
    if (e instanceof CheckoutError) throw e;
    console.error("[pedidos] não foi possível registrar o pedido de troca/estorno:", e instanceof Error ? e.message : e);
    throw new CheckoutError("Pedidos de troca e estorno ainda não estão disponíveis. Fale com a gente pelo WhatsApp.", 503);
  }

  if (kind === "exchange" && (await extendedStatusesSupported())) {
    await sql.query("update orders set status = 'exchange_requested' where id = $1::uuid", [order.id]);
    await sql.query(
      "insert into order_events (order_id, type, from_status, to_status, message) values ($1::uuid, 'status_changed', $2, 'exchange_requested', $3)",
      [order.id, order.status, `Pedido de troca: ${why.slice(0, 200)}`],
    );
  } else {
    await sql.query("insert into order_events (order_id, type, message) values ($1::uuid, 'request', $2)", [order.id, `Pedido de ${KIND_LABEL[kind]}: ${why.slice(0, 200)}`]);
  }
  notifyLater(kind === "exchange" ? "order.exchange_requested" : "order.refund_requested", number, { reason: why });
}
