/**
 * Eventos da loja. Cada evento pode (1) avisar o cliente por e-mail, (2) avisar a equipe por e-mail
 * e (3) chamar os webhooks cadastrados. As três saídas partem do mesmo ponto: notifyOrderEvent().
 */
export const STORE_EVENTS = [
  "order.created",
  "order.pending",
  "order.paid",
  "order.payment_failed",
  "order.preparing",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "order.exchange_requested",
  "order.refund_requested",
  "order.refunded",
] as const;
export type StoreEvent = (typeof STORE_EVENTS)[number];

export type EventInfo = {
  label: string;
  description: string;
  /** Template de e-mail para o cliente (ausente = não envia). */
  customer?: string;
  /** Template de e-mail para a equipe. */
  admin?: string;
  /** Eventos que o cadastro de webhook oferece como principais. */
  core?: boolean;
};

export const EVENT_INFO: Record<StoreEvent, EventInfo> = {
  "order.created": { label: "Novo pedido", description: "Cliente finalizou o pedido e a loja reservou o estoque.", customer: "order_created", admin: "admin_new_order", core: true },
  "order.pending": { label: "Pagamento pendente", description: "O pedido continua sem pagamento depois do tempo configurado.", customer: "payment_pending_reminder", admin: "admin_payment_pending", core: true },
  "order.paid": { label: "Pagamento aprovado", description: "O pagamento foi confirmado.", customer: "order_paid" },
  "order.payment_failed": { label: "Pagamento recusado", description: "O Mercado Pago recusou o pagamento; o cliente pode tentar de novo.", customer: "payment_failed" },
  "order.preparing": { label: "Em preparação", description: "A equipe começou a separar o pedido.", customer: "order_preparing" },
  "order.shipped": { label: "Saiu para entrega", description: "O pedido foi despachado.", customer: "order_shipped" },
  "order.delivered": { label: "Entregue", description: "O pedido foi entregue.", customer: "order_delivered" },
  "order.cancelled": { label: "Cancelado", description: "O pedido foi cancelado (pelo cliente, pela equipe ou por falta de pagamento).", customer: "order_cancelled", admin: "admin_order_cancelled", core: true },
  "order.exchange_requested": { label: "Pedido de troca", description: "Foi aberta uma solicitação de troca.", customer: "exchange_requested", admin: "admin_exchange_requested" },
  "order.refund_requested": { label: "Pedido de estorno", description: "Foi aberta uma solicitação de estorno.", customer: "refund_requested", admin: "admin_refund_requested" },
  "order.refunded": { label: "Estornado", description: "O valor foi devolvido ao cliente.", customer: "order_refunded", admin: "admin_order_refunded", core: true },
};

export const isStoreEvent = (value: unknown): value is StoreEvent => typeof value === "string" && (STORE_EVENTS as readonly string[]).includes(value);

/**
 * Status do pedido → evento disparado quando a equipe (ou o sistema) muda para ele.
 * "pending_payment" fica de fora: o evento "order.pending" é por tempo parado, não por mudança de status.
 */
export const STATUS_EVENT: Partial<Record<string, StoreEvent>> = {
  payment_failed: "order.payment_failed",
  paid: "order.paid",
  preparing: "order.preparing",
  shipped: "order.shipped",
  delivered: "order.delivered",
  cancelled: "order.cancelled",
  exchange_requested: "order.exchange_requested",
  refunded: "order.refunded",
};
