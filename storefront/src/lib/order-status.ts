/**
 * Status do pedido: rótulos, cores e transições permitidas, em um lugar só (admin, loja, e-mails e webhooks).
 * "payment_failed", "exchange_requested" e "refunded" existem a partir da migration 20261123000016.
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "exchange_requested",
  "returned",
  "refunded",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Valores que só o banco já migrado aceita. Antes da migration, o painel esconde estes status. */
export const EXTENDED_STATUSES: readonly OrderStatus[] = ["payment_failed", "exchange_requested", "refunded"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pagamento pendente",
  payment_failed: "Pagamento recusado",
  paid: "Pagamento aprovado",
  preparing: "Em preparação",
  shipped: "Saiu para entrega",
  delivered: "Entregue",
  exchange_requested: "Pedido de troca",
  returned: "Devolvido",
  refunded: "Estornado",
  cancelled: "Cancelado",
};

export type StatusTone = "wait" | "ok" | "bad" | "info";
export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending_payment: "wait",
  payment_failed: "bad",
  paid: "ok",
  preparing: "info",
  shipped: "info",
  delivered: "ok",
  exchange_requested: "wait",
  returned: "bad",
  refunded: "bad",
  cancelled: "bad",
};

export const TONE_CLASS: Record<StatusTone, string> = {
  wait: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  bad: "bg-red-500/10 text-red-400 border-red-500/30",
  info: "bg-sky-500/10 text-sky-300 border-sky-500/30",
};

/** Para onde o admin pode mover cada status. Cancelado e estornado são finais. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "payment_failed", "cancelled"],
  payment_failed: ["pending_payment", "paid", "cancelled"],
  paid: ["preparing", "cancelled", "refunded"],
  preparing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "exchange_requested", "returned"],
  delivered: ["exchange_requested", "returned", "refunded"],
  exchange_requested: ["preparing", "delivered", "returned", "refunded"],
  returned: ["refunded"],
  refunded: [],
  cancelled: [],
};

export const isOrderStatus = (value: unknown): value is OrderStatus => typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
export const statusLabel = (value: string) => (isOrderStatus(value) ? ORDER_STATUS_LABEL[value] : value);
