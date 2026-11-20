-- =============================================================================
-- Cupons com regras: forma de pagamento, quantidade, valor mínimo, categoria/produto, primeira compra,
-- e-mails permitidos, aplicação automática (sem digitar código) e prazo.
-- O desconto é calculado e validado só no banco (cotação e criação do pedido usam a mesma regra).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Colunas e tabelas novas
-- ----------------------------------------------------------------------------
alter table coupons
  add column title text,                                              -- nome mostrado ao cliente (ex.: "10% no Pix")
  add column auto_apply boolean not null default false,               -- aplica sozinho quando as condições são atendidas
  add column scope text not null default 'all' check (scope in ('all', 'categories', 'products')),
  add column min_quantity int not null default 0 check (min_quantity >= 0),   -- unidades elegíveis mínimas (2, 3, 4...)
  add column payment_methods text[] not null default '{}' check (payment_methods <@ array['pix', 'credit_card', 'boleto']),
  add column first_purchase_only boolean not null default false,
  add column allowed_emails text[] not null default '{}';             -- vazio = qualquer e-mail

create table coupon_categories (
  coupon_id uuid not null references coupons (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (coupon_id, category_id)
);
create table coupon_products (
  coupon_id uuid not null references coupons (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  primary key (coupon_id, product_id)
);
create index coupon_products_product_idx on coupon_products (product_id);

-- Forma de pagamento escolhida no checkout (necessária para cupons por forma de pagamento).
alter table orders add column payment_method payment_method;

alter table coupon_categories enable row level security;
alter table coupon_products enable row level security;
create policy staff_select on coupon_categories for select to authenticated using (is_staff());
create policy staff_select on coupon_products for select to authenticated using (is_staff());
create policy staff_write_coupon_categories on coupon_categories for all to authenticated
  using (has_any_role('{owner,manager}'::app_role[])) with check (has_any_role('{owner,manager}'::app_role[]));
create policy staff_write_coupon_products on coupon_products for all to authenticated
  using (has_any_role('{owner,manager}'::app_role[])) with check (has_any_role('{owner,manager}'::app_role[]));

-- ----------------------------------------------------------------------------
-- Funções antigas de cupom/cotação/pedido (assinaturas mudam)
-- ----------------------------------------------------------------------------
drop function create_checkout_order(jsonb, jsonb, jsonb, text, numeric, int, text, boolean, uuid);
drop function checkout_quote(jsonb, text, uuid, text);
drop function _create_order(uuid, text, text, text, jsonb, jsonb, text, numeric, int, text, boolean);
drop function _coupon_discount(text, numeric, uuid, text);

-- ----------------------------------------------------------------------------
-- Avalia UM cupom contra o carrinho. p_lines: [{ok, productId, categoryId, unitPrice, qty}]
-- Sem erro: devolve {ok:false, message} para a cotação mostrar ao cliente.
-- ----------------------------------------------------------------------------
create function _coupon_eval(cp coupons, p_lines jsonb, p_user uuid, p_email text, p_payment text, p_order uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_elig_sub numeric(12, 2);
  v_elig_qty int;
  v_used int;
  v_labels text;
  v_discount numeric(12, 2);
begin
  if not cp.is_active
     or (cp.starts_at is not null and cp.starts_at > now())
     or (cp.ends_at is not null and cp.ends_at < now()) then
    return jsonb_build_object('ok', false, 'message', 'Cupom inválido ou expirado');
  end if;

  -- Itens que o cupom alcança (todos, categorias ou produtos escolhidos)
  select coalesce(sum((l ->> 'unitPrice')::numeric * (l ->> 'qty')::int), 0), coalesce(sum((l ->> 'qty')::int), 0)
    into v_elig_sub, v_elig_qty
  from jsonb_array_elements(p_lines) l
  where coalesce((l ->> 'ok')::boolean, false)
    and (cp.scope = 'all'
      or (cp.scope = 'categories' and exists (select 1 from coupon_categories cc where cc.coupon_id = cp.id and cc.category_id::text = l ->> 'categoryId'))
      or (cp.scope = 'products' and exists (select 1 from coupon_products cpp where cpp.coupon_id = cp.id and cpp.product_id::text = l ->> 'productId')));

  if v_elig_qty = 0 then
    return jsonb_build_object('ok', false, 'message', 'Este cupom não vale para os itens do carrinho');
  end if;
  if v_elig_sub < cp.min_subtotal then
    return jsonb_build_object('ok', false, 'message', format('Compra mínima de R$ %s para este cupom', replace(to_char(cp.min_subtotal, 'FM999999990.00'), '.', ',')));
  end if;
  if v_elig_qty < cp.min_quantity then
    return jsonb_build_object('ok', false, 'message', format('Leve %s ou mais unidades para usar este cupom', cp.min_quantity));
  end if;

  if cardinality(cp.payment_methods) > 0 then
    v_labels := array_to_string(array(
      select case m when 'pix' then 'Pix' when 'credit_card' then 'cartão de crédito' else 'boleto' end from unnest(cp.payment_methods) m), ' ou ');
    if p_payment is null then
      return jsonb_build_object('ok', false, 'message', 'Escolha a forma de pagamento: este cupom vale para ' || v_labels);
    end if;
    if not (p_payment = any (cp.payment_methods)) then
      return jsonb_build_object('ok', false, 'message', 'Este cupom vale para pagamento via ' || v_labels);
    end if;
  end if;

  if cardinality(cp.allowed_emails) > 0 then
    if v_email is null then
      return jsonb_build_object('ok', false, 'message', 'Informe seu e-mail para usar este cupom');
    end if;
    if not (v_email = any (select lower(e) from unnest(cp.allowed_emails) e)) then
      return jsonb_build_object('ok', false, 'message', 'Este cupom não está disponível para o seu e-mail');
    end if;
  end if;

  if cp.first_purchase_only then
    if v_email is null and p_user is null then
      return jsonb_build_object('ok', false, 'message', 'Informe seu e-mail para validar o cupom de primeira compra');
    end if;
    if exists (
      select 1 from orders o
      where o.status <> 'cancelled' and o.id is distinct from p_order
        and ((p_user is not null and o.user_id = p_user) or (v_email is not null and lower(coalesce(o.customer_email, o.guest_email)) = v_email))
    ) then
      return jsonb_build_object('ok', false, 'message', 'Cupom válido apenas na primeira compra');
    end if;
  end if;

  if cp.max_uses is not null and (select count(*) from coupon_redemptions where coupon_id = cp.id) >= cp.max_uses then
    return jsonb_build_object('ok', false, 'message', 'Cupom esgotado');
  end if;
  select count(*) into v_used from coupon_redemptions
  where coupon_id = cp.id and order_id is distinct from p_order
    and ((p_user is not null and user_id = p_user) or (v_email is not null and lower(email) = v_email));
  if v_used >= cp.max_uses_per_user then
    return jsonb_build_object('ok', false, 'message', 'Cupom já utilizado');
  end if;

  v_discount := least(v_elig_sub, case cp.kind when 'percent' then round(v_elig_sub * cp.value / 100, 2) else cp.value end);
  return jsonb_build_object(
    'ok', true, 'couponId', cp.id, 'code', cp.code, 'title', cp.title, 'auto', cp.auto_apply,
    'message', case when cp.auto_apply then coalesce(cp.title, 'Desconto automático') || ' aplicado' else 'Cupom aplicado' end,
    'discount', v_discount);
end;
$$;

-- Cupom por código
create function _coupon_discount(p_code text, p_lines jsonb, p_user uuid, p_email text, p_payment text, p_order uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  cp coupons%rowtype;
begin
  select * into cp from coupons where upper(code) = upper(trim(p_code));
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Cupom inválido ou expirado');
  end if;
  return _coupon_eval(cp, p_lines, p_user, p_email, p_payment, p_order);
end;
$$;

-- Melhor desconto entre os cupons automáticos que o carrinho atende
create function _auto_coupon(p_lines jsonb, p_user uuid, p_email text, p_payment text, p_order uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  cp coupons%rowtype;
  r jsonb;
  best jsonb := null;
begin
  for cp in select * from coupons where auto_apply and is_active order by created_at loop
    r := _coupon_eval(cp, p_lines, p_user, p_email, p_payment, p_order);
    if (r ->> 'ok')::boolean and (best is null or (r ->> 'discount')::numeric > (best ->> 'discount')::numeric) then
      best := r;
    end if;
  end loop;
  return best;
end;
$$;

-- Regra única de escolha: o cupom digitado vale; se não servir, entra o melhor automático (com o motivo da recusa).
create function _resolve_coupon(p_code text, p_lines jsonb, p_user uuid, p_email text, p_payment text, p_order uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  typed jsonb;
  auto jsonb;
begin
  if p_code is not null and trim(p_code) <> '' then
    typed := _coupon_discount(p_code, p_lines, p_user, p_email, p_payment, p_order);
    if (typed ->> 'ok')::boolean then
      return typed;
    end if;
    auto := _auto_coupon(p_lines, p_user, p_email, p_payment, p_order);
    if auto is not null then
      return auto || jsonb_build_object('rejected', typed ->> 'message');
    end if;
    return typed;
  end if;
  return _auto_coupon(p_lines, p_user, p_email, p_payment, p_order);
end;
$$;

-- ----------------------------------------------------------------------------
-- Itens do carrinho agora levam a categoria (para cupons por categoria)
-- ----------------------------------------------------------------------------
create or replace function checkout_resolve_items(p_items jsonb) returns jsonb
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
      'slug', p.slug, 'productId', p.id, 'categoryId', p.category_id, 'variantId', v.id, 'unitId', u.id, 'sku', v.sku, 'name', p.name,
      'condition', p.condition, 'options', v.option_values, 'qty', v_qty,
      'unitPrice', effective_price(v.id), 'listPrice', greatest(coalesce(v.compare_at, v.price), v.price),
      'available', v_avail, 'weightGrams', coalesce(v.weight_grams, 0), 'unique', v_unique,
      'image', (select url from product_media where product_id = p.id order by position limit 1),
      'ok', v_ok, 'reason', v_reason);
  end loop;
  return v_out;
end;
$$;

-- ----------------------------------------------------------------------------
-- Cotação: agora com a forma de pagamento escolhida
-- ----------------------------------------------------------------------------
create function checkout_quote(p_items jsonb, p_coupon text default null, p_user uuid default null, p_email text default null, p_payment text default null)
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

  v_coupon := _resolve_coupon(p_coupon, v_lines, p_user, p_email, nullif(p_payment, ''), null);

  return jsonb_build_object(
    'lines', v_lines, 'subtotal', v_subtotal, 'weightGrams', v_weight, 'allOk', v_all_ok,
    'discount', case when coalesce((v_coupon ->> 'ok')::boolean, false) then (v_coupon ->> 'discount')::numeric else 0 end,
    'coupon', v_coupon);
end;
$$;

-- ----------------------------------------------------------------------------
-- Criação do pedido (mesmo núcleo, com cupom por regras e forma de pagamento)
-- ----------------------------------------------------------------------------
create function _create_order(
  p_user uuid, p_email text, p_name text, p_phone text,
  p_lines jsonb, p_address jsonb, p_shipping_method text, p_shipping_total numeric, p_eta_days int,
  p_coupon text, p_terms boolean, p_payment text default null
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
  v_pay text := case when p_payment in ('pix', 'credit_card', 'boleto') then p_payment end;
  v_eval_lines jsonb;
begin
  if p_email is null and p_user is null then
    raise exception 'informe um e-mail de contato';
  end if;

  insert into orders (user_id, guest_email, customer_name, customer_email, customer_phone, subtotal, total,
                      shipping_address, shipping_method, shipping_eta_days, shipping_total, terms_accepted_at, payment_method)
  values (p_user, case when p_user is null then p_email end, p_name, p_email, p_phone, 0, p_shipping_total,
          p_address, p_shipping_method, p_eta_days, p_shipping_total, case when p_terms then now() end, v_pay::payment_method)
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

  -- Cupom: o digitado vale; se ele não servir (ou não houver), entra o melhor desconto automático.
  select coalesce(jsonb_agg(jsonb_build_object('ok', true, 'productId', oi.product_id, 'categoryId', pr.category_id,
                                               'unitPrice', oi.unit_price, 'qty', oi.quantity)), '[]'::jsonb)
    into v_eval_lines
  from order_items oi join products pr on pr.id = oi.product_id
  where oi.order_id = v_order;

  v_coupon := _resolve_coupon(p_coupon, v_eval_lines, p_user, p_email, v_pay, v_order);
  if v_coupon is not null then
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

create function create_checkout_order(
  p_items jsonb, p_customer jsonb, p_address jsonb,
  p_shipping_method text, p_shipping_total numeric, p_eta_days int,
  p_coupon text default null, p_terms boolean default false, p_user uuid default null, p_payment text default null
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
    p_address, p_shipping_method, p_shipping_total, p_eta_days, p_coupon, p_terms, p_payment);

  select * into o from orders where id = v_order;
  return jsonb_build_object('id', o.id, 'number', o.number, 'token', o.public_token, 'total', o.total,
                            'subtotal', o.subtotal, 'discount', o.discount_total, 'shipping', o.shipping_total);
end;
$$;

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
    p_address, p_shipping_method, p_shipping_total, p_eta_days, p_coupon_code, true, p_payment_method::text);

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

-- ----------------------------------------------------------------------------
-- Permissões: tudo isto é do servidor (revoga também de anon/authenticated, que o Supabase concede por padrão).
-- ----------------------------------------------------------------------------
revoke all on function _coupon_eval(coupons, jsonb, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function _coupon_discount(text, jsonb, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function _auto_coupon(jsonb, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function _resolve_coupon(text, jsonb, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function checkout_quote(jsonb, text, uuid, text, text) from public, anon, authenticated;
revoke all on function _create_order(uuid, text, text, text, jsonb, jsonb, text, numeric, int, text, boolean, text) from public, anon, authenticated;
revoke all on function create_checkout_order(jsonb, jsonb, jsonb, text, numeric, int, text, boolean, uuid, text) from public, anon, authenticated;
grant execute on function checkout_quote(jsonb, text, uuid, text, text) to service_role;
grant execute on function create_checkout_order(jsonb, jsonb, jsonb, text, numeric, int, text, boolean, uuid, text) to service_role;
