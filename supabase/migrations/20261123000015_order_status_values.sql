-- Novos status de pedido: pagamento recusado, pedido de troca e estornado.
-- Arquivo separado de propósito: um valor novo de enum só pode ser usado depois de confirmado (commit).
alter type order_status add value if not exists 'payment_failed';
alter type order_status add value if not exists 'exchange_requested';
alter type order_status add value if not exists 'refunded';
