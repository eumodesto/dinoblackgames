-- =============================================================================
-- Row Level Security: loja pública, cliente (só o que é dele) e equipe por papel
-- Papéis do Supabase: anon (visitante), authenticated (logado), service_role (servidor).
-- =============================================================================

-- Perfil criado automaticamente quando nasce um usuário no Supabase Auth.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Liga RLS em todas as tabelas: sem política, ninguém lê nem grava.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Loja pública (visitante e cliente)
-- ----------------------------------------------------------------------------
create policy public_read on categories for select using (is_active);
create policy public_read on collections for select using (status = 'published');
create policy public_read on collection_products for select using (
  exists (select 1 from collections c where c.id = collection_id and c.status = 'published')
  and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy public_read on products for select using (status = 'published');
create policy public_read on product_media for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy public_read on product_facets for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy public_read on product_options for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy public_read on product_option_values for select using (
  exists (select 1 from product_options o join products p on p.id = o.product_id
          where o.id = option_id and p.status = 'published'));
create policy public_read on product_variants for select using (
  is_active and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy public_read on banners for select using (
  status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy public_read on pages for select using (status = 'published');
create policy public_read on nav_items for select using (is_active);
create policy public_read on redirects for select using (true);
create policy public_read on store_settings for select using (is_public);
create policy public_read on promotions for select using (
  status = 'published' and now() between starts_at and ends_at);
create policy public_read on promotion_products for select using (
  exists (select 1 from promotions pr where pr.id = promotion_id and pr.status = 'published' and now() between pr.starts_at and pr.ends_at));
create policy public_read on product_reviews for select using (status = 'published');

-- Eventos e mensagens: qualquer visitante envia, ninguém lê pelo cliente.
create policy anyone_insert on analytics_events for insert with check (true);
create policy anyone_insert on contact_messages for insert with check (true);
create policy anyone_insert on back_in_stock_alerts for insert with check (user_id is null or user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Cliente logado: só os próprios dados
-- ----------------------------------------------------------------------------
create policy own_select on profiles for select to authenticated using (id = auth.uid());
create policy own_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy own_roles on user_roles for select to authenticated using (user_id = auth.uid());

create policy own_all on addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on cart_items for all to authenticated
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));

-- Pedido nasce e muda só por funções (create_order_from_cart, confirm_payment, cancel_order).
create policy own_select on orders for select to authenticated using (user_id = auth.uid());
create policy own_select on order_items for select to authenticated using (
  exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy own_select on order_events for select to authenticated using (
  exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy own_select on payments for select to authenticated using (
  exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy own_select on shipments for select to authenticated using (
  exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy own_select on return_requests for select to authenticated using (user_id = auth.uid());
create policy own_insert on return_requests for insert to authenticated with check (user_id = auth.uid());

create policy own_select on consents for select to authenticated using (user_id = auth.uid());
create policy own_insert on consents for insert to authenticated with check (user_id = auth.uid());
create policy own_select on privacy_requests for select to authenticated using (user_id = auth.uid());
create policy own_insert on privacy_requests for insert to authenticated with check (user_id = auth.uid());
create policy own_select on back_in_stock_alerts for select to authenticated using (user_id = auth.uid());

create policy own_select on used_requests for select to authenticated using (user_id = auth.uid());
create policy own_insert on used_requests for insert to authenticated with check (user_id = auth.uid());
create policy own_select on used_request_photos for select to authenticated using (
  exists (select 1 from used_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy own_insert on used_request_photos for insert to authenticated with check (
  exists (select 1 from used_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy own_select on used_offers for select to authenticated using (
  exists (select 1 from used_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy own_select on used_request_events for select to authenticated using (
  exists (select 1 from used_requests r where r.id = request_id and r.user_id = auth.uid()));

create policy own_insert on product_reviews for insert to authenticated with check (user_id = auth.uid() and status = 'draft');

-- ----------------------------------------------------------------------------
-- Equipe: leitura para qualquer papel; escrita só nos papéis de cada módulo
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- leitura da equipe (tabelas sensíveis ficam só com owner e manager)
  for r in
    select tablename as tbl from pg_tables
    where schemaname = 'public'
      and tablename not in ('audit_log', 'integrations', 'integration_events', 'store_settings')
  loop
    execute format('create policy staff_select on %I for select to authenticated using (is_staff())', r.tbl);
  end loop;
  for r in select unnest(array['audit_log', 'integrations', 'integration_events', 'store_settings']) as tbl loop
    execute format(
      'create policy staff_select_sensitive on %I for select to authenticated using (has_any_role(%L::app_role[]))',
      r.tbl, '{owner,manager}');
  end loop;

  -- escrita por módulo
  for r in select * from (values
    ('categories', 'owner,manager,editor'),
    ('collections', 'owner,manager,editor'),
    ('collection_products', 'owner,manager,editor'),
    ('products', 'owner,manager,editor'),
    ('product_media', 'owner,manager,editor'),
    ('product_facets', 'owner,manager,editor'),
    ('product_options', 'owner,manager,editor'),
    ('product_option_values', 'owner,manager,editor'),
    ('product_variants', 'owner,manager,editor'),
    ('kits', 'owner,manager'),
    ('kit_components', 'owner,manager'),
    ('promotions', 'owner,manager'),
    ('promotion_products', 'owner,manager'),
    ('coupons', 'owner,manager'),
    ('stock_locations', 'owner,manager,stock'),
    ('inventory_levels', 'owner,manager,stock'),
    ('inventory_units', 'owner,manager,stock'),
    ('inventory_movements', 'owner,manager,stock'),
    ('orders', 'owner,manager,support'),
    ('order_items', 'owner,manager'),
    ('order_events', 'owner,manager,support,stock'),
    ('payments', 'owner,manager,support'),
    ('shipments', 'owner,manager,stock,support'),
    ('return_requests', 'owner,manager,support'),
    ('coupon_redemptions', 'owner,manager'),
    ('profiles', 'owner,manager,support'),
    ('addresses', 'owner,manager,support'),
    ('consents', 'owner,manager,support'),
    ('privacy_requests', 'owner,manager'),
    ('contact_messages', 'owner,manager,support'),
    ('back_in_stock_alerts', 'owner,manager,support'),
    ('product_reviews', 'owner,manager,support'),
    ('used_requests', 'owner,manager,appraiser'),
    ('used_request_photos', 'owner,manager,appraiser'),
    ('used_offers', 'owner,manager,appraiser'),
    ('used_request_events', 'owner,manager,appraiser'),
    ('banners', 'owner,manager,editor'),
    ('pages', 'owner,manager,editor'),
    ('nav_items', 'owner,manager,editor'),
    ('redirects', 'owner,manager,editor'),
    ('store_settings', 'owner'),
    ('integrations', 'owner'),
    ('integration_events', 'owner'),
    ('user_roles', 'owner'),
    ('admin_notifications', 'owner,manager,stock,support,appraiser,editor')
  ) as t(tbl, roles)
  loop
    execute format(
      'create policy staff_write_%1$s on %1$I for all to authenticated using (has_any_role(%2$L::app_role[])) with check (has_any_role(%2$L::app_role[]))',
      r.tbl, '{' || r.roles || '}');
  end loop;
end $$;

-- Auditoria: qualquer integrante da equipe registra; só owner e manager leem (política staff_select_sensitive).
create policy staff_insert_audit on audit_log for insert to authenticated with check (is_staff());

-- ----------------------------------------------------------------------------
-- Permissões de objeto
-- ----------------------------------------------------------------------------
grant select on v_product_listing, v_public_units to anon, authenticated;
grant select on v_inventory_alerts, v_sales_daily to authenticated;

grant execute on function has_any_role(app_role[]), is_staff(), effective_price(uuid) to anon, authenticated, service_role;
grant execute on function create_order_from_cart(uuid, jsonb, text, numeric, int, payment_method, int, text) to authenticated, service_role;
grant execute on function cancel_order(uuid, text) to authenticated, service_role;
grant execute on function confirm_payment(uuid, text, text) to service_role;
grant execute on function expire_pending_orders(int) to service_role;
