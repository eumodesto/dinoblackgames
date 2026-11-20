-- Catálogo pronto para importação: SKU próprio da DINO, categorias em árvore, visibilidade,
-- vídeo, bucket de imagens, opção "Condição" no carrinho e uma função única para salvar produto
-- (usada pelo admin e pelo importador, tudo na mesma transação).

-- ----------------------------------------------------------------------------
-- Colunas novas
-- ----------------------------------------------------------------------------
alter table products add column if not exists legacy_id text unique;            -- ID no sistema antigo (WooCommerce): reimportar sem duplicar
alter table products add column if not exists visibility text not null default 'visible' check (visibility in ('visible', 'hidden'));
alter table products add column if not exists video_url text;                    -- YouTube/Vimeo exibido numa janela na página do produto

alter table categories add column if not exists parent_id uuid references categories (id) on delete set null;
create index if not exists categories_parent_idx on categories (parent_id, position);

alter table product_media add column if not exists width int;
alter table product_media add column if not exists height int;
alter table product_media add column if not exists bytes int;

-- ----------------------------------------------------------------------------
-- Bucket público de imagens (só existe no Supabase; no banco local é ignorado)
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('produtos', 'produtos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Slug sem acentos
-- ----------------------------------------------------------------------------
create or replace function dino_slug(p_text text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_text, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- ----------------------------------------------------------------------------
-- ID próprio da DINO: DB-<TIPO>-<NNNNN>. Uma sequência só, então nunca repete.
-- ----------------------------------------------------------------------------
create sequence if not exists dino_sku_seq;

create or replace function next_dino_sku(p_type text) returns text
language sql volatile as $$
  select 'DB-' || case p_type
    when 'console' then 'CON' when 'jogo' then 'JGO' when 'acessorio' then 'ACS' when 'pc' then 'PCG'
    when 'notebook' then 'NTB' when 'periferico' then 'PER' when 'retro' then 'RET' when 'gift' then 'GFT'
    when 'hardware' then 'HRD' else 'GEN' end
    || '-' || lpad(nextval('dino_sku_seq')::text, 5, '0')
$$;

-- ----------------------------------------------------------------------------
-- Opção "Condição" (Novo / Semi-novo) também escolhida no carrinho
-- ----------------------------------------------------------------------------
do $$
declare d text;
begin
  select pg_get_functiondef('checkout_resolve_items(jsonb)'::regprocedure) into d;
  d := replace(d, $q$jsonb_build_object('color', it ->> 'color', 'storage', it ->> 'storage')$q$,
                  $q$jsonb_build_object('color', it ->> 'color', 'storage', it ->> 'storage', 'condition', it ->> 'condition')$q$);
  if d not like '%''condition'', it ->> ''condition''%' then raise exception 'checkout_resolve_items não foi ajustada'; end if;
  execute d;
end $$;

-- ----------------------------------------------------------------------------
-- Listagem: expõe a visibilidade (produto "oculto" não aparece em listas nem busca,
-- mas a página dele continua abrindo pelo link)
-- ----------------------------------------------------------------------------
create or replace view v_product_listing as
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
  ) as facets,
  p.visibility
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

-- ----------------------------------------------------------------------------
-- save_product: cria ou atualiza produto + variações + estoque + mídia + tags + filtros
-- Campos ausentes no JSON são mantidos; "variants" ausente não mexe nas variações.
-- ----------------------------------------------------------------------------
create or replace function save_product(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_legacy text := nullif(p ->> 'legacyId', '');
  v_type text := coalesce(nullif(p ->> 'productType', ''), 'console');
  v_cat uuid;
  v_sku text;
  v_slug text;
  v_status publish_status;
  v_name text;
  v_loc uuid;
  o jsonb; val jsonb; m jsonb; vr jsonb; t jsonb;
  v_opt uuid;
  v_var uuid;
  v_vsku text;
  v_price numeric;
  v_cmp numeric;
  v_stock int;
  v_old int;
  v_tag uuid;
  v_keep uuid[] := '{}';
  v_codes text[] := '{}';
  v_nvars int;
  v_suffix text;
begin
  if v_id is null and v_legacy is not null then
    select id into v_id from products where legacy_id = v_legacy;
  end if;

  if p ? 'categoryId' and nullif(p ->> 'categoryId', '') is not null then
    v_cat := (p ->> 'categoryId')::uuid;
  elsif nullif(p ->> 'categorySlug', '') is not null then
    select id into v_cat from categories where slug = p ->> 'categorySlug';
    if v_cat is null then raise exception 'Categoria não encontrada: %', p ->> 'categorySlug'; end if;
  end if;

  if v_id is null then
    v_name := nullif(btrim(p ->> 'name'), '');
    if v_name is null then raise exception 'Nome do produto é obrigatório.'; end if;
    if v_cat is null then raise exception 'Categoria é obrigatória.'; end if;
    v_sku := coalesce(nullif(btrim(p ->> 'sku'), ''), next_dino_sku(v_type));
    v_slug := coalesce(nullif(dino_slug(p ->> 'slug'), ''), dino_slug(v_name));
    if exists (select 1 from products where slug = v_slug) then v_slug := v_slug || '-' || lower(v_sku); end if;
    v_status := coalesce(nullif(p ->> 'status', ''), 'draft')::publish_status;
    insert into products (slug, sku, name, category_id, condition, status, brand, tagline, description, badge,
                          warranty_months, warranty_text, highlights, specs, in_box, faq, seo_title, seo_description,
                          legacy_id, visibility, video_url, published_at)
    values (v_slug, v_sku, v_name, v_cat, coalesce(nullif(p ->> 'condition', ''), 'novo')::product_condition, v_status,
            nullif(p ->> 'brand', ''), nullif(p ->> 'tagline', ''), nullif(p ->> 'description', ''), nullif(p ->> 'badge', ''),
            coalesce((p ->> 'warrantyMonths')::int, 12), nullif(p ->> 'warrantyText', ''),
            coalesce(p -> 'highlights', '[]'), coalesce(p -> 'specs', '[]'), coalesce(p -> 'inBox', '[]'), coalesce(p -> 'faq', '[]'),
            nullif(p ->> 'seoTitle', ''), nullif(p ->> 'seoDescription', ''),
            v_legacy, coalesce(nullif(p ->> 'visibility', ''), 'visible'), nullif(p ->> 'videoUrl', ''),
            case when v_status = 'published' then now() end)
    returning id into v_id;
  else
    select sku, slug into v_sku, v_slug from products where id = v_id;
    if v_sku is null then raise exception 'Produto não encontrado.'; end if;
    update products set
      name = coalesce(nullif(btrim(p ->> 'name'), ''), name),
      category_id = coalesce(v_cat, category_id),
      condition = coalesce(nullif(p ->> 'condition', '')::product_condition, condition),
      status = coalesce(nullif(p ->> 'status', '')::publish_status, status),
      brand = case when p ? 'brand' then nullif(p ->> 'brand', '') else brand end,
      tagline = case when p ? 'tagline' then nullif(p ->> 'tagline', '') else tagline end,
      description = case when p ? 'description' then nullif(p ->> 'description', '') else description end,
      badge = case when p ? 'badge' then nullif(p ->> 'badge', '') else badge end,
      warranty_months = coalesce((p ->> 'warrantyMonths')::int, warranty_months),
      warranty_text = case when p ? 'warrantyText' then nullif(p ->> 'warrantyText', '') else warranty_text end,
      highlights = case when p ? 'highlights' then p -> 'highlights' else highlights end,
      specs = case when p ? 'specs' then p -> 'specs' else specs end,
      in_box = case when p ? 'inBox' then p -> 'inBox' else in_box end,
      faq = case when p ? 'faq' then p -> 'faq' else faq end,
      seo_title = case when p ? 'seoTitle' then nullif(p ->> 'seoTitle', '') else seo_title end,
      seo_description = case when p ? 'seoDescription' then nullif(p ->> 'seoDescription', '') else seo_description end,
      visibility = coalesce(nullif(p ->> 'visibility', ''), visibility),
      video_url = case when p ? 'videoUrl' then nullif(p ->> 'videoUrl', '') else video_url end,
      legacy_id = coalesce(v_legacy, legacy_id),
      published_at = case when coalesce(nullif(p ->> 'status', ''), status::text) = 'published' and published_at is null then now() else published_at end
    where id = v_id;
  end if;

  -- filtros (plataforma, tipo, ano, marca)
  if p ? 'productType' or p ? 'platform' or p ? 'releaseYear' or p ? 'brand' then
    delete from product_facets where product_id = v_id and facet_key in
      (select k from (values ('type'), ('product_type'), ('platform'), ('release_year'), ('brand')) x(k)
       where (k in ('type', 'product_type') and p ? 'productType') or (k = 'platform' and p ? 'platform')
          or (k = 'release_year' and p ? 'releaseYear') or (k = 'brand' and p ? 'brand'));
    if p ? 'productType' and nullif(p ->> 'productType', '') is not null then
      insert into product_facets values (v_id, 'product_type', p ->> 'productType') on conflict do nothing;
      insert into product_facets values (v_id, 'type', coalesce(nullif(p ->> 'typeLabel', ''), initcap(p ->> 'productType'))) on conflict do nothing;
    end if;
    if nullif(p ->> 'platform', '') is not null then insert into product_facets values (v_id, 'platform', p ->> 'platform') on conflict do nothing; end if;
    if nullif(p ->> 'releaseYear', '') is not null then insert into product_facets values (v_id, 'release_year', p ->> 'releaseYear') on conflict do nothing; end if;
    if nullif(p ->> 'brand', '') is not null then insert into product_facets values (v_id, 'brand', p ->> 'brand') on conflict do nothing; end if;
  end if;

  -- imagens (ordem do array = ordem da galeria; a primeira é a capa)
  if p ? 'media' then
    delete from product_media where product_id = v_id;
    insert into product_media (product_id, kind, url, alt, position, crop, width, height, bytes)
    select v_id, coalesce(nullif(x ->> 'kind', ''), 'image'), x ->> 'url',
           coalesce(nullif(x ->> 'alt', ''), (select name from products where id = v_id)), (i - 1)::int,
           nullif(x ->> 'crop', ''), nullif(x ->> 'width', '')::int, nullif(x ->> 'height', '')::int, nullif(x ->> 'bytes', '')::int
    from jsonb_array_elements(p -> 'media') with ordinality as a(x, i)
    where nullif(x ->> 'url', '') is not null;
  end if;

  -- tags
  if p ? 'tags' then
    delete from product_tags where product_id = v_id;
    for t in select * from jsonb_array_elements(p -> 'tags') loop
      if nullif(btrim(t #>> '{}'), '') is null then continue; end if;
      insert into tags (slug, name) values (dino_slug(t #>> '{}'), btrim(t #>> '{}'))
      on conflict (slug) do update set slug = excluded.slug
      returning id into v_tag;
      insert into product_tags (product_id, tag_id) values (v_id, v_tag) on conflict do nothing;
    end loop;
  end if;

  -- opções, variações e estoque
  if p ? 'variants' then
    select id into v_loc from stock_locations where id = nullif(p ->> 'locationId', '')::uuid;
    if v_loc is null then select id into v_loc from stock_locations order by code limit 1; end if;
    if v_loc is null then
      insert into stock_locations (code, name) values ('LOJA', 'Estoque DinoBlack') returning id into v_loc;
    end if;

    for o in select * from jsonb_array_elements(coalesce(p -> 'options', '[]')) loop
      v_codes := v_codes || (o ->> 'code');
      insert into product_options (product_id, code, name, position)
      values (v_id, o ->> 'code', coalesce(nullif(o ->> 'name', ''), o ->> 'code'), coalesce((o ->> 'position')::int, cardinality(v_codes) - 1))
      on conflict (product_id, code) do update set name = excluded.name, position = excluded.position
      returning id into v_opt;
      delete from product_option_values where option_id = v_opt;
      for val in select * from jsonb_array_elements(o -> 'values') loop
        insert into product_option_values (option_id, label, position)
        values (v_opt, val #>> '{}', (select count(*) from product_option_values where option_id = v_opt)::int)
        on conflict do nothing;
      end loop;
    end loop;
    delete from product_options where product_id = v_id and code <> all (v_codes);

    v_nvars := jsonb_array_length(p -> 'variants');
    for vr in select * from jsonb_array_elements(p -> 'variants') loop
      v_var := nullif(vr ->> 'id', '')::uuid;
      v_vsku := nullif(btrim(vr ->> 'sku'), '');
      if v_var is null and v_vsku is not null then select id into v_var from product_variants where sku = v_vsku; end if;
      if v_var is null then
        if v_vsku is null then
          select coalesce(string_agg(upper(left(dino_slug(value), 6)), '-' order by key), '') into v_suffix
          from jsonb_each_text(coalesce(vr -> 'options', '{}'));
          v_vsku := case when v_nvars = 1 or v_suffix = '' then v_sku else v_sku || '-' || v_suffix end;
        end if;
      end if;
      v_price := (vr ->> 'price')::numeric;
      if v_price is null or v_price < 0 then raise exception 'Preço inválido.'; end if;
      v_cmp := nullif(vr ->> 'compareAt', '')::numeric;
      if v_cmp is not null and v_cmp < v_price then v_cmp := null; end if;
      if v_var is null then
        insert into product_variants (product_id, sku, option_values, price, compare_at, max_installments, weight_grams, width_mm, height_mm, length_mm, is_active)
        values (v_id, v_vsku, coalesce(vr -> 'options', '{}'), v_price, v_cmp, coalesce((vr ->> 'maxInstallments')::int, 10),
                nullif(vr ->> 'weightGrams', '')::int, nullif(vr ->> 'widthMm', '')::int, nullif(vr ->> 'heightMm', '')::int, nullif(vr ->> 'lengthMm', '')::int,
                coalesce((vr ->> 'active')::boolean, true))
        returning id into v_var;
      else
        update product_variants set
          option_values = coalesce(vr -> 'options', option_values), price = v_price, compare_at = v_cmp,
          max_installments = coalesce((vr ->> 'maxInstallments')::int, max_installments),
          weight_grams = nullif(vr ->> 'weightGrams', '')::int, width_mm = nullif(vr ->> 'widthMm', '')::int,
          height_mm = nullif(vr ->> 'heightMm', '')::int, length_mm = nullif(vr ->> 'lengthMm', '')::int,
          is_active = coalesce((vr ->> 'active')::boolean, true)
        where id = v_var and product_id = v_id;
        if not found then raise exception 'Variação não pertence ao produto.'; end if;
      end if;
      v_keep := v_keep || v_var;

      if nullif(vr ->> 'stock', '') is not null then
        v_stock := greatest(0, (vr ->> 'stock')::int);
        select on_hand into v_old from inventory_levels where variant_id = v_var and location_id = v_loc;
        if v_old is null then
          insert into inventory_levels (variant_id, location_id, on_hand, min_level)
          values (v_var, v_loc, v_stock, coalesce((vr ->> 'minStock')::int, 0));
          if v_stock > 0 then
            insert into inventory_movements (variant_id, location_id, type, quantity, reason)
            values (v_var, v_loc, 'entrada', v_stock, 'Cadastro do produto');
          end if;
        else
          update inventory_levels set on_hand = v_stock, min_level = coalesce((vr ->> 'minStock')::int, min_level), updated_at = now()
          where variant_id = v_var and location_id = v_loc;
          if v_stock <> v_old then
            insert into inventory_movements (variant_id, location_id, type, quantity, reason)
            values (v_var, v_loc, 'ajuste', v_stock - v_old, 'Ajuste no cadastro do produto');
          end if;
        end if;
      end if;
    end loop;
    update product_variants set is_active = false where product_id = v_id and id <> all (v_keep) and is_active;
  end if;

  return jsonb_build_object('id', v_id, 'sku', v_sku, 'slug', (select slug from products where id = v_id));
end;
$$;

revoke all on function save_product(jsonb) from public, anon, authenticated;
revoke all on function next_dino_sku(text) from public, anon, authenticated;
