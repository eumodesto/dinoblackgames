-- Sufixo do SKU de variação sem hífen interno: DB-CON-00004-SEMINO em vez de DB-CON-00004-SEMI-N.
do $$
declare d text;
begin
  select pg_get_functiondef('save_product(jsonb)'::regprocedure) into d;
  d := replace(d, 'upper(left(dino_slug(value), 6))', $q$upper(left(replace(dino_slug(value), '-', ''), 6))$q$);
  if d not like '%replace(dino_slug(value)%' then raise exception 'save_product não foi ajustada'; end if;
  execute d;
end $$;

-- SKUs já gerados com o padrão antigo (a função cuida só de variações novas)
update product_variants set sku = regexp_replace(sku, '-SEMI-N$', '-SEMINO') where sku ~ '-SEMI-N$';

revoke all on function save_product(jsonb) from public, anon, authenticated;
