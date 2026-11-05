-- =============================================================================
-- Funções de acesso, preço efetivo, regras de estoque/pedido e views de leitura
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Papéis (usados nas políticas de RLS)
-- ----------------------------------------------------------------------------
create function has_any_role(roles app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = any (roles)
  );
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- Preço efetivo: preço da variação menos a melhor promoção vigente.
-- compare_at é o preço "de" de vitrine; promoções são campanhas com vigência.
-- ----------------------------------------------------------------------------
create function effective_price(p_variant uuid) returns numeric
language sql stable as $$
  select greatest(0, round(coalesce(min(
    case pr.kind
      when 'percent' then v.price * (1 - pr.value / 100)
      else v.price - pr.value
    end
  ), v.price), 2))
  from product_variants v
  join products p on p.id = v.product_id
  left join promotions pr
    on pr.status = 'published'
   and now() between pr.starts_at and pr.ends_at
   and (
        (pr.scope = 'products' and exists (
           select 1 from promotion_products pp where pp.promotion_id = pr.id and pp.product_id = p.id))
     or (pr.scope = 'collection' and exists (
           select 1 from collection_products cp where cp.collection_id = pr.collection_id and cp.product_id = p.id))
     or (pr.scope = 'category' and pr.category_id = p.category_id)
   )
  where v.id = p_variant
  group by v.price;
$$;

-- ----------------------------------------------------------------------------
-- Leitura da listagem da loja (espelha storefront/src/lib/shop.ts).
-- View "definer" de propósito: a loja pública não pode ler inventory_levels nem
-- inventory_units (custo, serial); a view expõe só colunas seguras e já filtra
-- por status = 'published'.
-- ----------------------------------------------------------------------------
create view v_product_listing as
select
  p.id,
  p.slug,
  p.sku,
  p.name,
  c.slug as category_slug,
  c.name as category_name,
  p.condition,
  p.badge,
  p.sold_count,
  p.rating,
  p.published_at,
  (select m.url from product_media m where m.product_id = p.id order by m.position limit 1) as image_url,
  best.current_price,
  best.list_price,
  case when best.list_price > best.current_price
       then round((1 - best.current_price / best.list_price) * 100)::int end as discount_percent,
  coalesce(stock.available, 0) as available,
  coalesce(stock.available, 0) > 0 as in_stock,
  (
    select coalesce(jsonb_object_agg(f.facet_key, f.vals), '{}'::jsonb)
    from (
      select facet_key, jsonb_agg(facet_value order by facet_value) as vals
      from product_facets pf where pf.product_id = p.id group by facet_key
    ) f
  ) as facets
from products p
join categories c on c.id = p.category_id
cross join lateral (
  select effective_price(v.id) as current_price,
         greatest(coalesce(v.compare_at, v.price), v.price) as list_price
  from product_variants v
  where v.product_id = p.id and v.is_active
  order by effective_price(v.id) asc
  limit 1
) best
left join lateral (
  select
    coalesce((select sum(il.on_hand - il.reserved)
              from inventory_levels il
              join product_variants v on v.id = il.variant_id
              where v.product_id = p.id and v.is_active), 0)
    + (select count(*) from inventory_units u where u.product_id = p.id and u.status = 'disponivel') as available
) stock on true
where p.status = 'published';

-- Unidades únicas disponíveis, sem custo nem serial: alimenta o laudo da página de produto.
create view v_public_units as
select u.id, u.product_id, u.variant_id, u.grade, u.report, u.photos, u.warranty_days
from inventory_units u
join products p on p.id = u.product_id
where u.status = 'disponivel' and p.status = 'published';

-- Alertas de estoque do painel (abaixo do mínimo ou sem saldo)
create view v_inventory_alerts with (security_invoker = true) as
select
  v.id as variant_id,
  v.sku,
  p.name as product_name,
  sum(il.on_hand - il.reserved)::int as available,
  max(il.min_level) as min_level,
  case when sum(il.on_hand - il.reserved) <= 0 then 'sem_saldo' else 'abaixo_do_minimo' end as situation
from inventory_levels il
join product_variants v on v.id = il.variant_id
join products p on p.id = v.product_id
group by v.id, v.sku, p.name
having sum(il.on_hand - il.reserved) <= max(il.min_level);

-- Vendas por dia (relatórios)
create view v_sales_daily with (security_invoker = true) as
select
  date_trunc('day', paid_at)::date as day,
  count(*)::int as orders,
  sum(total) as revenue,
  round(avg(total), 2) as avg_ticket
from orders
where paid_at is not null and status not in ('cancelled')
group by 1;

-- ----------------------------------------------------------------------------
-- Estoque e pedido: regras atômicas (reserva, confirmação, cancelamento)
-- ----------------------------------------------------------------------------

-- Devolve ao estoque o que o pedido tinha reservado ou vendido.
create function _release_order_stock(p_order_id uuid, p_actor uuid) returns void
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
      if o.status = 'pending_payment' then
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

-- Cria o pedido a partir do carrinho: valida estoque, reserva, congela preços e endereço.
create function create_order_from_cart(
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
  ci cart_items%rowtype;
  v product_variants%rowtype;
  p products%rowtype;
  u inventory_units%rowtype;
  cp coupons%rowtype;
  v_order uuid;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_price numeric(12, 2);
  v_loc uuid;
  v_avail int;
  v_snapshot jsonb;
  v_item_count int := 0;
begin
  select * into c from carts where id = p_cart_id and status = 'open' for update;
  if not found then
    raise exception 'carrinho inexistente ou já finalizado';
  end if;
  if auth.uid() is not null and c.user_id is distinct from auth.uid() then
    raise exception 'carrinho de outro usuário';
  end if;

  insert into orders (user_id, subtotal, total, shipping_address, shipping_method, shipping_eta_days, shipping_total)
  values (c.user_id, 0, p_shipping_total, p_address, p_shipping_method, p_eta_days, p_shipping_total)
  returning id into v_order;

  for ci in select * from cart_items where cart_id = p_cart_id order by created_at loop
    select * into v from product_variants where id = ci.variant_id and is_active;
    if not found then raise exception 'variação indisponível'; end if;
    select * into p from products where id = v.product_id and status = 'published';
    if not found then raise exception 'produto não publicado'; end if;

    v_price := effective_price(v.id);
    v_snapshot := jsonb_build_object(
      'name', p.name, 'sku', v.sku, 'condition', p.condition, 'options', v.option_values,
      'warrantyMonths', p.warranty_months,
      'image', (select url from product_media where product_id = p.id order by position limit 1)
    );

    if ci.unit_id is not null then
      if ci.quantity <> 1 then raise exception 'unidade única só aceita quantidade 1'; end if;
      select * into u from inventory_units where id = ci.unit_id for update;
      if not found or u.status <> 'disponivel' then
        raise exception 'unidade % não está mais disponível', ci.unit_id;
      end if;
      update inventory_units set status = 'reservado' where id = u.id;
      insert into inventory_movements (unit_id, type, quantity, reason, order_id, actor_id)
      values (u.id, 'reserva', 1, 'pedido em criação', v_order, c.user_id);
      v_snapshot := v_snapshot || jsonb_build_object('unitReport', u.report, 'grade', u.grade, 'warrantyDays', u.warranty_days);
    else
      v_loc := null;
      v_avail := 0;
      select location_id, on_hand - reserved into v_loc, v_avail
      from inventory_levels where variant_id = v.id
      order by on_hand - reserved desc limit 1 for update;
      if v_loc is null or v_avail < ci.quantity then
        raise exception 'estoque insuficiente para %', v.sku;
      end if;
      update inventory_levels set reserved = reserved + ci.quantity, updated_at = now()
      where variant_id = v.id and location_id = v_loc;
      insert into inventory_movements (variant_id, location_id, type, quantity, reason, order_id, actor_id)
      values (v.id, v_loc, 'reserva', ci.quantity, 'pedido em criação', v_order, c.user_id);
      v_snapshot := v_snapshot || jsonb_build_object('locationId', v_loc);
    end if;

    insert into order_items (order_id, product_id, variant_id, unit_id, quantity, unit_price, snapshot)
    values (v_order, p.id, v.id, ci.unit_id, ci.quantity, v_price, v_snapshot);
    v_subtotal := v_subtotal + v_price * ci.quantity;
    v_item_count := v_item_count + 1;
  end loop;

  if v_item_count = 0 then raise exception 'carrinho vazio'; end if;

  if p_coupon_code is not null then
    select * into cp from coupons
    where upper(code) = upper(p_coupon_code) and is_active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now());
    if not found then raise exception 'cupom inválido ou expirado'; end if;
    if v_subtotal < cp.min_subtotal then raise exception 'pedido abaixo do mínimo do cupom'; end if;
    if cp.max_uses is not null and (select count(*) from coupon_redemptions where coupon_id = cp.id) >= cp.max_uses then
      raise exception 'cupom esgotado';
    end if;
    if c.user_id is not null
       and (select count(*) from coupon_redemptions where coupon_id = cp.id and user_id = c.user_id) >= cp.max_uses_per_user then
      raise exception 'cupom já utilizado';
    end if;
    v_discount := least(v_subtotal, case cp.kind when 'percent' then round(v_subtotal * cp.value / 100, 2) else cp.value end);
  end if;

  update orders
  set subtotal = v_subtotal,
      discount_total = v_discount,
      total = v_subtotal - v_discount + p_shipping_total,
      coupon_id = cp.id
  where id = v_order;

  if cp.id is not null then
    insert into coupon_redemptions (coupon_id, order_id, user_id, discount) values (cp.id, v_order, c.user_id, v_discount);
  end if;

  insert into payments (order_id, method, status, amount, installments, pix_expires_at)
  values (v_order, p_payment_method, 'pending', v_subtotal - v_discount + p_shipping_total,
          case when p_payment_method = 'credit_card' then greatest(1, p_installments) else 1 end,
          case when p_payment_method = 'pix' then now() + interval '30 minutes' end);

  insert into order_events (order_id, type, to_status, message, actor_id)
  values (v_order, 'status_changed', 'pending_payment', 'Pedido criado', c.user_id);

  update carts set status = 'converted', updated_at = now() where id = p_cart_id;
  return v_order;
end;
$$;

-- Confirma o pagamento (chamada pelo webhook do gateway, via service role). Idempotente.
create function confirm_payment(p_order_id uuid, p_provider text default 'mock', p_provider_ref text default null)
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
  where order_id = p_order_id and status = 'pending';

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

-- Cancela o pedido e devolve o estoque. O cliente só cancela enquanto aguarda pagamento.
create function cancel_order(p_order_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'pedido inexistente'; end if;
  if o.status in ('cancelled', 'shipped', 'delivered', 'returned') then
    raise exception 'pedido em status % não pode ser cancelado', o.status;
  end if;
  if auth.uid() is not null
     and not has_any_role(array['owner', 'manager', 'support']::app_role[])
     and not (o.user_id = auth.uid() and o.status = 'pending_payment') then
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

-- Cancela pedidos cujo pagamento não chegou a tempo (chamar por agendador).
create function expire_pending_orders(p_minutes int default 30) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from orders where status = 'pending_payment' and placed_at < now() - make_interval(mins => p_minutes) loop
    perform cancel_order(r.id, 'Pagamento não confirmado no prazo');
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function create_order_from_cart(uuid, jsonb, text, numeric, int, payment_method, int, text) from public;
revoke all on function confirm_payment(uuid, text, text) from public;
revoke all on function cancel_order(uuid, text) from public;
revoke all on function expire_pending_orders(int) from public;
revoke all on function _release_order_stock(uuid, uuid) from public;
