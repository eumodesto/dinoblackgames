-- Fluxo de status do pedido com "Pagamento recusado", "Pedido de troca" e "Estornado".
--
-- Regras:
--  * Pagamento recusado: o pedido continua reservando o estoque e o cliente pode tentar de novo;
--    se pagar depois (ou outro meio aprovar), volta para o fluxo normal. Vence no mesmo prazo do pendente.
--  * Cancelar e expirar valem para pendente e recusado.
--  * Troca e estorno: o cliente (ou a equipe) abre um pedido em order_requests; o status do pedido muda
--    para "exchange_requested" no caso da troca.

-- ----------------------------------------------------------------------------
-- Pedidos de troca e estorno
-- ----------------------------------------------------------------------------
create table if not exists order_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  kind text not null check (kind in ('exchange', 'refund')),
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'done')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists order_requests_order_idx on order_requests (order_id, created_at desc);
create index if not exists order_requests_open_idx on order_requests (status) where status = 'open';
alter table order_requests enable row level security;   -- sem política: só o servidor (service role) acessa

-- ----------------------------------------------------------------------------
-- confirm_payment: também confirma pedidos com pagamento recusado (cliente tentou de novo e passou)
-- ----------------------------------------------------------------------------
create or replace function confirm_payment(p_order_id uuid, p_provider text default 'mock', p_provider_ref text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  it order_items%rowtype;
  loc uuid;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'pedido inexistente'; end if;
  if o.status not in ('pending_payment', 'payment_failed') then
    return;                                         -- webhook repetido: sem efeito
  end if;

  update payments
  set status = 'paid', paid_at = now(), provider = coalesce(p_provider, provider),
      provider_ref = coalesce(p_provider_ref, provider_ref)
  where order_id = p_order_id and status in ('pending', 'authorized')
    and (p_provider_ref is null or provider_ref is null or provider_ref = p_provider_ref);

  update orders set status = 'paid', paid_at = now() where id = p_order_id;

  for it in select * from order_items where order_id = p_order_id loop
    if it.unit_id is not null then
      update inventory_units set status = 'vendido' where id = it.unit_id;
      insert into inventory_movements (unit_id, type, quantity, reason, order_id)
      values (it.unit_id, 'saida', 1, 'venda ' || o.number, p_order_id);
    else
      loc := nullif(it.snapshot ->> 'locationId', '')::uuid;
      update inventory_levels
      set on_hand = on_hand - it.quantity, reserved = reserved - it.quantity, updated_at = now()
      where variant_id = it.variant_id and location_id = loc;
      insert into inventory_movements (variant_id, location_id, type, quantity, reason, order_id)
      values (it.variant_id, loc, 'saida', it.quantity, 'venda ' || o.number, p_order_id);
    end if;
    update products set sold_count = sold_count + it.quantity where id = it.product_id;
  end loop;

  insert into shipments (order_id, status) values (p_order_id, 'pending');
  insert into order_events (order_id, type, from_status, to_status, message)
  values (p_order_id, 'status_changed', o.status::text, 'paid', 'Pagamento confirmado');
end;
$$;

-- ----------------------------------------------------------------------------
-- _release_order_stock: pedido com pagamento recusado ainda só RESERVA estoque (como o pendente);
-- sem isto o cancelamento somaria ao saldo físico em vez de liberar a reserva.
-- ----------------------------------------------------------------------------
create or replace function _release_order_stock(p_order_id uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  it order_items%rowtype;
  loc uuid;
begin
  select * into o from orders where id = p_order_id;
  for it in select * from order_items where order_id = p_order_id loop
    if it.unit_id is not null then
      update inventory_units set status = 'disponivel' where id = it.unit_id and status in ('reservado', 'vendido');
      insert into inventory_movements (unit_id, type, quantity, reason, order_id, actor_id)
      values (it.unit_id, 'liberacao', 1, 'cancelamento ' || o.number, p_order_id, p_actor);
    else
      loc := nullif(it.snapshot ->> 'locationId', '')::uuid;
      if o.status in ('pending_payment', 'payment_failed') then
        update inventory_levels set reserved = reserved - it.quantity, updated_at = now()
        where variant_id = it.variant_id and location_id = loc;
      else
        update inventory_levels set on_hand = on_hand + it.quantity, updated_at = now()
        where variant_id = it.variant_id and location_id = loc;
      end if;
      insert into inventory_movements (variant_id, location_id, type, quantity, reason, order_id, actor_id)
      values (it.variant_id, loc, 'liberacao', it.quantity, 'cancelamento ' || o.number, p_order_id, p_actor);
    end if;
  end loop;
end;
$$;
revoke all on function _release_order_stock(uuid, uuid) from public;

-- ----------------------------------------------------------------------------
-- cancel_order: o cliente só cancela enquanto o pagamento não foi aprovado (pendente ou recusado)
-- ----------------------------------------------------------------------------
create or replace function cancel_order(p_order_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'pedido inexistente'; end if;
  if o.status in ('cancelled', 'shipped', 'delivered', 'returned', 'refunded', 'exchange_requested') then
    raise exception 'pedido em status % não pode ser cancelado', o.status;
  end if;
  if auth.uid() is not null
     and not has_any_role(array['owner', 'manager', 'support']::app_role[])
     and not (o.user_id = auth.uid() and o.status in ('pending_payment', 'payment_failed')) then
    raise exception 'sem permissão para cancelar este pedido';
  end if;

  perform _release_order_stock(p_order_id, auth.uid());

  update payments
  set status = case when status = 'paid' then 'refunded'::payment_status else 'expired'::payment_status end
  where order_id = p_order_id and status in ('pending', 'paid', 'authorized');
  update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = p_order_id;
  insert into order_events (order_id, type, from_status, to_status, message, actor_id)
  values (p_order_id, 'status_changed', o.status::text, 'cancelled', coalesce(p_reason, 'Cancelado'), auth.uid());
end;
$$;

-- ----------------------------------------------------------------------------
-- expire_pending_orders: pagamento recusado também vence no prazo
-- ----------------------------------------------------------------------------
create or replace function expire_pending_orders(p_minutes int default 30) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from orders where status in ('pending_payment', 'payment_failed') and placed_at < now() - make_interval(mins => p_minutes) loop
    perform cancel_order(r.id, 'Pagamento não confirmado no prazo');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ----------------------------------------------------------------------------
-- sync_mp_payment: recusa vira "Pagamento recusado"; nova tentativa em andamento volta para "pendente"
-- (corpo igual ao da migration 4, com os dois ramos novos marcados com "novo:")
-- ----------------------------------------------------------------------------
create or replace function sync_mp_payment(p_order_number text, p_payment jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  v_id text := p_payment ->> 'id';
  v_status text := p_payment ->> 'status';
  v_amount numeric(12, 2) := (p_payment ->> 'transaction_amount')::numeric;
  v_method payment_method;
  v_pay_status payment_status;
  v_event uuid;
  v_pay_id uuid;
  v_data jsonb;
begin
  select * into o from orders where number = p_order_number for update;
  if not found then
    raise exception 'pedido % inexistente', p_order_number;
  end if;

  -- Uma notificação repetida (mesmo pagamento e mesmo status) não reprocessa.
  insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts)
  values ('payments', 'mercadopago', v_id || ':' || v_status, 'payment.' || v_status,
          jsonb_build_object('order', p_order_number, 'status', v_status, 'detail', p_payment ->> 'status_detail'),
          'received', 1)
  on conflict (provider, external_id) do nothing
  returning id into v_event;
  if v_event is null then
    return jsonb_build_object('orderStatus', o.status, 'duplicate', true);
  end if;

  v_method := case
    when p_payment ->> 'payment_method_id' = 'pix' or p_payment ->> 'payment_type_id' = 'bank_transfer' then 'pix'
    when p_payment ->> 'payment_type_id' = 'ticket' then 'boleto'
    else 'credit_card' end::payment_method;

  v_pay_status := case v_status
    when 'approved' then 'paid'
    when 'authorized' then 'authorized'
    when 'pending' then 'pending'
    when 'in_process' then 'pending'
    when 'in_mediation' then 'pending'
    when 'rejected' then 'failed'
    when 'cancelled' then case when p_payment ->> 'status_detail' like '%expired%' then 'expired' else 'failed' end
    when 'refunded' then 'refunded'
    when 'charged_back' then 'refunded'
    else 'pending' end::payment_status;

  v_data := jsonb_strip_nulls(jsonb_build_object(
    'qrCode', p_payment ->> 'qr_code', 'qrCodeBase64', p_payment ->> 'qr_code_base64',
    'ticketUrl', p_payment ->> 'ticket_url', 'barcode', p_payment ->> 'barcode',
    'expiresAt', p_payment ->> 'date_of_expiration', 'methodId', p_payment ->> 'payment_method_id'));

  -- O valor aprovado precisa ser o do pedido; senão o pagamento é registrado mas o pedido não é liberado.
  if v_status = 'approved' and v_amount is distinct from o.total then
    update integration_events set status = 'failed', error = format('valor divergente: pago %s, pedido %s', v_amount, o.total), attempts = 1
    where id = v_event;
    insert into admin_notifications (kind, title, body, ref_table, ref_id)
    values ('pagamento_divergente', 'Pagamento com valor divergente no pedido ' || o.number,
            format('Mercado Pago %s: pago %s, pedido %s', v_id, v_amount, o.total), 'orders', o.id::text);
    return jsonb_build_object('orderStatus', o.status, 'error', 'amount_mismatch');
  end if;

  insert into payments (order_id, method, status, status_detail, amount, installments, provider, provider_ref,
                        pix_expires_at, paid_at, provider_data)
  values (o.id, v_method, case when v_pay_status = 'paid' then 'pending' else v_pay_status end, p_payment ->> 'status_detail',
          coalesce(v_amount, o.total), coalesce((p_payment ->> 'installments')::int, 1), 'mercadopago', v_id,
          nullif(p_payment ->> 'date_of_expiration', '')::timestamptz, null, v_data)
  on conflict (provider, provider_ref) where provider_ref is not null
  do update set status = case
                  when payments.status = 'paid' and excluded.status <> 'refunded' then payments.status
                  when excluded.status = 'paid' then payments.status
                  else excluded.status end,
                status_detail = excluded.status_detail,
                provider_data = payments.provider_data || excluded.provider_data,
                updated_at = now()
  returning id into v_pay_id;

  if v_pay_status = 'paid' then
    if o.status in ('pending_payment', 'payment_failed') then
      perform confirm_payment(o.id, 'mercadopago', v_id);
      -- as outras tentativas deste pedido deixam de valer
      update payments set status = 'expired' where order_id = o.id and id <> v_pay_id and status = 'pending';
    elsif o.status = 'cancelled' then
      -- pagou depois de o pedido expirar: registra e avisa a equipe (estorno ou reativação manual)
      update payments set status = 'paid', paid_at = now() where id = v_pay_id;
      insert into admin_notifications (kind, title, body, ref_table, ref_id)
      values ('pagamento_pedido_cancelado', 'Pagamento aprovado em pedido cancelado ' || o.number,
              'Mercado Pago ' || v_id || ': conferir estorno ou reativar o pedido.', 'orders', o.id::text);
    else
      update payments set status = 'paid', paid_at = coalesce(paid_at, now()) where id = v_pay_id;
    end if;
  elsif v_pay_status = 'refunded' then
    insert into order_events (order_id, type, message) values (o.id, 'payment', 'Pagamento estornado no Mercado Pago (' || v_id || ')');
    insert into admin_notifications (kind, title, body, ref_table, ref_id)
    values ('pagamento_estornado', 'Pagamento estornado no pedido ' || o.number, 'Mercado Pago ' || v_id, 'orders', o.id::text);
    -- novo: pedido já pago passa a "estornado" (cancelado continua cancelado)
    if o.status in ('paid', 'preparing', 'exchange_requested', 'returned', 'delivered', 'shipped') then
      update orders set status = 'refunded' where id = o.id;
      insert into order_events (order_id, type, from_status, to_status, message)
      values (o.id, 'status_changed', o.status::text, 'refunded', 'Pagamento estornado');
    end if;
  elsif v_pay_status = 'failed' then
    insert into order_events (order_id, type, message)
    values (o.id, 'payment', 'Pagamento não aprovado: ' || coalesce(p_payment ->> 'status_detail', v_status));
    -- novo: pedido aberto passa a "pagamento recusado" (continua reservando o estoque; o cliente pode tentar de novo)
    if o.status = 'pending_payment' then
      update orders set status = 'payment_failed' where id = o.id;
      insert into order_events (order_id, type, from_status, to_status, message)
      values (o.id, 'status_changed', 'pending_payment', 'payment_failed', 'Pagamento recusado');
    end if;
  elsif v_pay_status = 'expired' then
    insert into order_events (order_id, type, message)
    values (o.id, 'payment', 'Pagamento não aprovado: ' || coalesce(p_payment ->> 'status_detail', v_status));
  elsif v_pay_status in ('pending', 'authorized') and o.status = 'payment_failed' then
    -- novo: nova tentativa em andamento: volta para "pagamento pendente"
    update orders set status = 'pending_payment' where id = o.id;
    insert into order_events (order_id, type, from_status, to_status, message)
    values (o.id, 'status_changed', 'payment_failed', 'pending_payment', 'Nova tentativa de pagamento');
  end if;

  update integration_events set status = 'processed', processed_at = now() where id = v_event;
  select * into o from orders where id = o.id;
  return jsonb_build_object('orderStatus', o.status, 'paymentStatus', v_pay_status, 'duplicate', false);
end;
$$;

revoke all on function sync_mp_payment(text, jsonb) from public;
grant execute on function sync_mp_payment(text, jsonb) to service_role;
revoke all on function confirm_payment(uuid, text, text) from public;
grant execute on function confirm_payment(uuid, text, text) to service_role;
revoke all on function cancel_order(uuid, text) from public;
grant execute on function cancel_order(uuid, text) to authenticated, service_role;
revoke all on function expire_pending_orders(int) from public;
grant execute on function expire_pending_orders(int) to service_role;
