-- =============================================================================
-- Checkout: compra sem cadastro, cotação e criação de pedido a partir de itens,
-- tentativas de pagamento e sincronização com o Mercado Pago.
-- Chamado só pelo servidor (service_role). O navegador nunca grava pedido direto.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Colunas novas
-- ----------------------------------------------------------------------------
alter table orders
  add column public_token uuid not null default gen_random_uuid(),   -- chave de acesso do visitante ao próprio pedido
  add column customer_name text,
  add column customer_email text,
  add column customer_phone text,
  add column terms_accepted_at timestamptz;
create unique index orders_public_token_key on orders (public_token);

alter table payments
  add column status_detail text,
  add column provider_data jsonb not null default '{}';              -- Pix copia e cola, link do boleto (sem dados do pagador)

alter table coupon_redemptions add column email text;                -- limite por cliente também para visitante

-- ----------------------------------------------------------------------------
-- Cupom: calcula sem levantar erro (a cotação mostra a mensagem ao cliente)
-- ----------------------------------------------------------------------------
create function _coupon_discount(p_code text, p_subtotal numeric, p_user uuid, p_email text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  cp coupons%rowtype;
  v_used int;
begin
  select * into cp from coupons
  where upper(code) = upper(trim(p_code)) and is_active
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now());
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Cupom inválido ou expirado');
  end if;
  if p_subtotal < cp.min_subtotal then
    return jsonb_build_object('ok', false, 'message', format('Pedido abaixo do mínimo do cupom (R$ %s)', to_char(cp.min_subtotal, 'FM999G999D00')));
  end if;
  if cp.max_uses is not null and (select count(*) from coupon_redemptions where coupon_id = cp.id) >= cp.max_uses then
    return jsonb_build_object('ok', false, 'message', 'Cupom esgotado');
  end if;
  select count(*) into v_used from coupon_redemptions
  where coupon_id = cp.id
    and ((p_user is not null and user_id = p_user) or (p_email is not null and lower(email) = lower(p_email)));
  if v_used >= cp.max_uses_per_user then
    return jsonb_build_object('ok', false, 'message', 'Cupom já utilizado');
  end if;
  return jsonb_build_object(
    'ok', true, 'couponId', cp.id, 'code', cp.code, 'message', 'Cupom aplicado',
    'discount', least(p_subtotal, case cp.kind when 'percent' then round(p_subtotal * cp.value / 100, 2) else cp.value end));
end;
$$;

-- ----------------------------------------------------------------------------
-- Itens do carrinho (slug + opções) -> variação, unidade e preço do servidor
-- ----------------------------------------------------------------------------
create function checkout_resolve_items(p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb;
  p products%rowtype;
  v product_variants%rowtype;
  u inventory_units%rowtype;
  v_out jsonb := '[]'::jsonb;
  v_opts jsonb;
  v_qty int;
  v_avail int;
  v_unique boolean;
  v_ok boolean;
  v_reason text;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(20, coalesce((it ->> 'qty')::int, 1)));
    select * into p from products where slug = it ->> 'slug' and status = 'published';
    if not found then
      v_out := v_out || jsonb_build_object('slug', it ->> 'slug', 'qty', v_qty, 'ok', false, 'reason', 'Produto indisponível');
      continue;
    end if;

    v_opts := jsonb_strip_nulls(jsonb_build_object('color', it ->> 'color', 'storage', it ->> 'storage'));
    select * into v from product_variants
    where product_id = p.id and is_active and option_values @> v_opts
    order by price limit 1;
    if not found then
      v_out := v_out || jsonb_build_object('slug', p.slug, 'name', p.name, 'qty', v_qty, 'ok', false, 'reason', 'Variação indisponível');
      continue;
    end if;

    v_unique := exists (select 1 from inventory_units where product_id = p.id);
    u := null;
    if v_unique then
      v_qty := 1;
      select * into u from inventory_units
      where variant_id = v.id and status = 'disponivel' order by created_at limit 1;
      v_ok := u.id is not null;
      v_avail := case when v_ok then 1 else 0 end;
      v_reason := case when v_ok then null else 'Unidade única já vendida ou reservada' end;
    else
      select coalesce(sum(on_hand - reserved), 0) into v_avail from inventory_levels where variant_id = v.id;
      v_ok := v_avail >= v_qty and p.condition <> 'pre_venda';
      v_reason := case
        when p.condition = 'pre_venda' then 'Pré-venda: reserva ainda não disponível'
        when v_avail <= 0 then 'Sem estoque'
        when v_avail < v_qty then format('Estoque insuficiente (restam %s)', v_avail)
        else null end;
    end if;

    v_out := v_out || jsonb_build_object(
      'slug', p.slug, 'productId', p.id, 'variantId', v.id, 'unitId', u.id, 'sku', v.sku, 'name', p.name,
      'condition', p.condition, 'options', v.option_values, 'qty', v_qty,
      'unitPrice', effective_price(v.id), 'listPrice', greatest(coalesce(v.compare_at, v.price), v.price),
      'available', v_avail, 'weightGrams', coalesce(v.weight_grams, 0), 'unique', v_unique,
      'image', (select url from product_media where product_id = p.id order by position limit 1),
      'ok', v_ok, 'reason', v_reason);
  end loop;
  return v_out;
end;
$$;

-- Cotação: linhas, subtotal, cupom e peso total. Não grava nada.
create function checkout_quote(p_items jsonb, p_coupon text default null, p_user uuid default null, p_email text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_lines jsonb := checkout_resolve_items(p_items);
  v_subtotal numeric(12, 2);
  v_weight int;
  v_all_ok boolean;
  v_coupon jsonb := null;
begin
  select coalesce(sum((l ->> 'unitPrice')::numeric * (l ->> 'qty')::int) filter (where (l ->> 'ok')::boolean), 0),
         coalesce(sum((l ->> 'weightGrams')::int * (l ->> 'qty')::int) filter (where (l ->> 'ok')::boolean), 0),
         coalesce(bool_and((l ->> 'ok')::boolean), false)
    into v_subtotal, v_weight, v_all_ok
  from jsonb_array_elements(v_lines) l;

  if p_coupon is not null and trim(p_coupon) <> '' then
    v_coupon := _coupon_discount(p_coupon, v_subtotal, p_user, p_email);
  end if;

  return jsonb_build_object(
    'lines', v_lines, 'subtotal', v_subtotal, 'weightGrams', v_weight, 'allOk', v_all_ok,
    'discount', coalesce((v_coupon ->> 'discount')::numeric, 0),
    'coupon', v_coupon);
end;
$$;

-- ----------------------------------------------------------------------------
-- Núcleo da criação do pedido (reserva estoque, congela preço, endereço e cupom)
-- p_lines: [{variantId, unitId, qty}]
-- ----------------------------------------------------------------------------
create function _create_order(
  p_user uuid, p_email text, p_name text, p_phone text,
  p_lines jsonb, p_address jsonb, p_shipping_method text, p_shipping_total numeric, p_eta_days int,
  p_coupon text, p_terms boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  l jsonb;
  v product_variants%rowtype;
  p products%rowtype;
  u inventory_units%rowtype;
  v_order uuid;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_coupon jsonb;
  v_price numeric(12, 2);
  v_loc uuid;
  v_avail int;
  v_qty int;
  v_unit uuid;
  v_snapshot jsonb;
  v_count int := 0;
begin
  if p_email is null and p_user is null then
    raise exception 'informe um e-mail de contato';
  end if;

  insert into orders (user_id, guest_email, customer_name, customer_email, customer_phone, subtotal, total,
                      shipping_address, shipping_method, shipping_eta_days, shipping_total, terms_accepted_at)
  values (p_user, case when p_user is null then p_email end, p_name, p_email, p_phone, 0, p_shipping_total,
          p_address, p_shipping_method, p_eta_days, p_shipping_total, case when p_terms then now() end)
  returning id into v_order;

  for l in select * from jsonb_array_elements(p_lines) loop
    v_qty := (l ->> 'qty')::int;
    v_unit := nullif(l ->> 'unitId', '')::uuid;
    select * into v from product_variants where id = (l ->> 'variantId')::uuid and is_active;
    if not found then raise exception 'variação indisponível'; end if;
    select * into p from products where id = v.product_id and status = 'published';
    if not found then raise exception 'produto não publicado'; end if;

    v_price := effective_price(v.id);
    v_snapshot := jsonb_build_object(
      'name', p.name, 'slug', p.slug, 'sku', v.sku, 'condition', p.condition, 'options', v.option_values,
      'warrantyMonths', p.warranty_months,
      'image', (select url from product_media where product_id = p.id order by position limit 1));

    if v_unit is not null then
      if v_qty <> 1 then raise exception 'unidade única só aceita quantidade 1'; end if;
      select * into u from inventory_units where id = v_unit for update;
      if not found or u.status <> 'disponivel' then
        raise exception 'unidade % não está mais disponível', v_unit;
      end if;
      update inventory_units set status = 'reservado' where id = u.id;
      insert into inventory_movements (unit_id, type, quantity, reason, order_id, actor_id)
      values (u.id, 'reserva', 1, 'pedido em criação', v_order, p_user);
      v_snapshot := v_snapshot || jsonb_build_object('unitReport', u.report, 'grade', u.grade, 'warrantyDays', u.warranty_days);
    else
      v_loc := null;
      v_avail := 0;
      select location_id, on_hand - reserved into v_loc, v_avail
      from inventory_levels where variant_id = v.id
      order by on_hand - reserved desc limit 1 for update;
      if v_loc is null or v_avail < v_qty then
        raise exception 'estoque insuficiente para %', v.sku;
      end if;
      update inventory_levels set reserved = reserved + v_qty, updated_at = now()
      where variant_id = v.id and location_id = v_loc;
      insert into inventory_movements (variant_id, location_id, type, quantity, reason, order_id, actor_id)
      values (v.id, v_loc, 'reserva', v_qty, 'pedido em criação', v_order, p_user);
      v_snapshot := v_snapshot || jsonb_build_object('locationId', v_loc);
    end if;

    insert into order_items (order_id, product_id, variant_id, unit_id, quantity, unit_price, snapshot)
    values (v_order, p.id, v.id, v_unit, v_qty, v_price, v_snapshot);
    v_subtotal := v_subtotal + v_price * v_qty;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then raise exception 'carrinho vazio'; end if;

  if p_coupon is not null and trim(p_coupon) <> '' then
    v_coupon := _coupon_discount(p_coupon, v_subtotal, p_user, p_email);
    if not (v_coupon ->> 'ok')::boolean then
      raise exception '%', v_coupon ->> 'message';
    end if;
    v_discount := (v_coupon ->> 'discount')::numeric;
    insert into coupon_redemptions (coupon_id, order_id, user_id, email, discount)
    values ((v_coupon ->> 'couponId')::uuid, v_order, p_user, lower(p_email), v_discount);
    update orders set coupon_id = (v_coupon ->> 'couponId')::uuid where id = v_order;
  end if;

  update orders
  set subtotal = v_subtotal, discount_total = v_discount, total = v_subtotal - v_discount + p_shipping_total
  where id = v_order;

  insert into order_events (order_id, type, to_status, message, actor_id)
  values (v_order, 'status_changed', 'pending_payment', 'Pedido criado', p_user);

  return v_order;
end;
$$;

-- Pedido do checkout: recebe os itens como o carrinho da loja os conhece (slug, opções, quantidade).
create function create_checkout_order(
  p_items jsonb, p_customer jsonb, p_address jsonb,
  p_shipping_method text, p_shipping_total numeric, p_eta_days int,
  p_coupon text default null, p_terms boolean default false, p_user uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_lines jsonb := checkout_resolve_items(p_items);
  v_bad jsonb;
  v_order uuid;
  o orders%rowtype;
begin
  if not p_terms then raise exception 'é preciso aceitar os termos de compra'; end if;
  select l into v_bad from jsonb_array_elements(v_lines) l where not (l ->> 'ok')::boolean limit 1;
  if v_bad is not null then
    raise exception '%: %', coalesce(v_bad ->> 'name', v_bad ->> 'slug'), v_bad ->> 'reason';
  end if;

  v_order := _create_order(
    p_user, lower(trim(p_customer ->> 'email')), trim(p_customer ->> 'name'), p_customer ->> 'phone',
    (select jsonb_agg(jsonb_build_object('variantId', l ->> 'variantId', 'unitId', l ->> 'unitId', 'qty', (l ->> 'qty')::int))
       from jsonb_array_elements(v_lines) l),
    p_address, p_shipping_method, p_shipping_total, p_eta_days, p_coupon, p_terms);

  select * into o from orders where id = v_order;
  return jsonb_build_object('id', o.id, 'number', o.number, 'token', o.public_token, 'total', o.total,
                            'subtotal', o.subtotal, 'discount', o.discount_total, 'shipping', o.shipping_total);
end;
$$;

-- create_order_from_cart passa a usar o mesmo núcleo (mesma assinatura e mesmo comportamento de antes).
create or replace function create_order_from_cart(
  p_cart_id uuid,
  p_address jsonb,
  p_shipping_method text,
  p_shipping_total numeric,
  p_eta_days int,
  p_payment_method payment_method,
  p_installments int default 1,
  p_coupon_code text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c carts%rowtype;
  v_order uuid;
  v_total numeric(12, 2);
begin
  select * into c from carts where id = p_cart_id and status = 'open' for update;
  if not found then
    raise exception 'carrinho inexistente ou já finalizado';
  end if;
  if auth.uid() is not null and c.user_id is distinct from auth.uid() then
    raise exception 'carrinho de outro usuário';
  end if;

  v_order := _create_order(
    c.user_id, (select email from profiles where id = c.user_id), (select full_name from profiles where id = c.user_id),
    (select phone from profiles where id = c.user_id),
    coalesce((select jsonb_agg(jsonb_build_object('variantId', variant_id, 'unitId', unit_id, 'qty', quantity) order by created_at)
              from cart_items where cart_id = p_cart_id), '[]'::jsonb),
    p_address, p_shipping_method, p_shipping_total, p_eta_days, p_coupon_code, true);

  select total into v_total from orders where id = v_order;
  if p_payment_method is not null then
    insert into payments (order_id, method, status, amount, installments, pix_expires_at)
    values (v_order, p_payment_method, 'pending', v_total,
            case when p_payment_method = 'credit_card' then greatest(1, p_installments) else 1 end,
            case when p_payment_method = 'pix' then now() + interval '30 minutes' end);
  end if;

  update carts set status = 'converted', updated_at = now() where id = p_cart_id;
  return v_order;
end;
$$;

-- confirm_payment só marca como paga a tentativa informada (as outras ficam pendentes até serem substituídas).
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
  if o.status <> 'pending_payment' then
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
  values (p_order_id, 'status_changed', 'pending_payment', 'paid', 'Pagamento confirmado');
end;
$$;

-- ----------------------------------------------------------------------------
-- Sincroniza um pagamento do Mercado Pago com o pedido. Idempotente por (pagamento, status).
-- p_payment: resposta de GET /v1/payments/{id} reduzida aos campos que usamos.
-- ----------------------------------------------------------------------------
create function sync_mp_payment(p_order_number text, p_payment jsonb) returns jsonb
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
    if o.status = 'pending_payment' then
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
  elsif v_pay_status in ('failed', 'expired') then
    insert into order_events (order_id, type, message)
    values (o.id, 'payment', 'Pagamento não aprovado: ' || coalesce(p_payment ->> 'status_detail', v_status));
  end if;

  update integration_events set status = 'processed', processed_at = now() where id = v_event;
  select * into o from orders where id = o.id;
  return jsonb_build_object('orderStatus', o.status, 'paymentStatus', v_pay_status, 'duplicate', false);
end;
$$;

-- ----------------------------------------------------------------------------
-- Permissões: tudo isto é do servidor.
-- ----------------------------------------------------------------------------
revoke all on function _coupon_discount(text, numeric, uuid, text) from public;
revoke all on function checkout_resolve_items(jsonb) from public;
revoke all on function checkout_quote(jsonb, text, uuid, text) from public;
revoke all on function _create_order(uuid, text, text, text, jsonb, jsonb, text, numeric, int, text, boolean) from public;
revoke all on function create_checkout_order(jsonb, jsonb, jsonb, text, numeric, int, text, boolean, uuid) from public;
revoke all on function sync_mp_payment(text, jsonb) from public;
grant execute on function checkout_quote(jsonb, text, uuid, text) to service_role;
grant execute on function create_checkout_order(jsonb, jsonb, jsonb, text, numeric, int, text, boolean, uuid) to service_role;
grant execute on function sync_mp_payment(text, jsonb) to service_role;
-- create_order_from_cart, cancel_order e confirm_payment mantêm as permissões da migration 2.
grant execute on function create_order_from_cart(uuid, jsonb, text, numeric, int, payment_method, int, text) to authenticated, service_role;
grant execute on function confirm_payment(uuid, text, text) to service_role;
