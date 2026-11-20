-- Correções de segurança encontradas ao aplicar as migrations num banco novo.

-- 1) exec_sql roda SQL arbitrário como SECURITY DEFINER. O REVOKE de anon/authenticated da migration 5
--    não basta: o Postgres concede EXECUTE a PUBLIC por padrão. Só service_role pode executar.
revoke execute on function public.exec_sql(text, jsonb) from public, anon, authenticated;
grant execute on function public.exec_sql(text, jsonb) to service_role;

-- 2) tags e product_tags (migration 7) foram criadas sem RLS, e o schema public é exposto pela API.
alter table tags enable row level security;
alter table product_tags enable row level security;

-- Loja pública lê só tags ativas e vínculos de produtos publicados (mesmo padrão do catálogo).
create policy public_read on tags for select using (is_active);
create policy public_read on product_tags for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published')
  and exists (select 1 from tags t where t.id = tag_id and t.is_active));

-- Equipe: leitura para qualquer integrante, escrita para owner/manager/editor (igual a products).
create policy staff_select on tags for select to authenticated using (is_staff());
create policy staff_select on product_tags for select to authenticated using (is_staff());
create policy staff_write_tags on tags for all to authenticated
  using (has_any_role('{owner,manager,editor}'::app_role[])) with check (has_any_role('{owner,manager,editor}'::app_role[]));
create policy staff_write_product_tags on product_tags for all to authenticated
  using (has_any_role('{owner,manager,editor}'::app_role[])) with check (has_any_role('{owner,manager,editor}'::app_role[]));
