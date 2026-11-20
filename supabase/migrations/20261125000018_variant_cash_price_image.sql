-- ----------------------------------------------------------------------------
-- Variações com preço à vista (Pix) e imagem própria
--  * cash_price: preço quando o cliente paga no Pix. Vazio = sem preço à vista. Sempre menor que o preço da variação.
--  * image_url:  foto da variação. Na página do produto, escolher a variação troca a imagem principal.
-- O preço do Pix vale na cotação e na criação do pedido (o servidor decide; o navegador só exibe).
-- ----------------------------------------------------------------------------
alter table product_variants
  add column if not exists cash_price numeric(12, 2) check (cash_price is null or cash_price >= 0),
  add column if not exists image_url text;

-- Troca o preço da linha pelo preço do Pix quando a forma de pagamento é Pix.
create or replace function _apply_cash_price(p_lines jsonb, p_payment text) returns jsonb
language sql immutable set search_path = public as $$
  select case when p_payment = 'pix' then
    coalesce((
      select jsonb_agg(
               case when nullif(l ->> 'cashPrice', '') is not null
                    then l || jsonb_build_object('unitPrice', (l ->> 'cashPrice')::numeric, 'cashApplied', true, 'cashListPrice', (l ->> 'unitPrice')::numeric)
                    else l end
               order by ord)
      from jsonb_array_elements(p_lines) with ordinality as t(l, ord)
    ), '[]'::jsonb)
  else p_lines end
$$;
revoke all on function _apply_cash_price(jsonb, text) from public, anon, authenticated;

do $$
declare d text;
begin
  -- Itens do carrinho: levam o preço do Pix e a imagem da variação
  select pg_get_functiondef('checkout_resolve_items(jsonb)'::regprocedure) into d;
  d := replace(d, $q$'unitPrice', effective_price(v.id), 'listPrice'$q$,
                  $q$'unitPrice', effective_price(v.id), 'cashPrice', case when v.cash_price is not null and v.cash_price < effective_price(v.id) then v.cash_price end, 'listPrice'$q$);
  d := replace(d, $q$'image', (select url from product_media where product_id = p.id order by position limit 1)$q$,
                  $q$'image', coalesce(v.image_url, (select url from product_media where product_id = p.id order by position limit 1))$q$);
  -- Qualquer opção escolhida (Cor, Armazenamento, Condição, Edição, Memória...) escolhe a variação:
  -- o carrinho passa a mandar o mapa "options" além dos campos color/storage/condition.
  d := replace(d, $q$'condition', it ->> 'condition'));$q$,
                  $q$'condition', it ->> 'condition')) || case when jsonb_typeof(it -> 'options') = 'object' then it -> 'options' else '{}'::jsonb end;$q$);
  if d not like '%cashPrice%' or d not like '%v.image_url%' or d not like '%jsonb_typeof(it -> ''options'')%' then raise exception 'checkout_resolve_items não foi ajustada'; end if;
  execute d;

  -- Cotação: com Pix escolhido, o subtotal e os cupons já usam o preço do Pix
  select pg_get_functiondef('checkout_quote(jsonb, text, uuid, text, text)'::regprocedure) into d;
  d := replace(d, 'v_lines jsonb := checkout_resolve_items(p_items);', 'v_lines jsonb := _apply_cash_price(checkout_resolve_items(p_items), nullif(p_payment, ''''));');
  if d not like '%_apply_cash_price%' then raise exception 'checkout_quote não foi ajustada'; end if;
  execute d;

  -- Pedido: grava o preço do Pix e a foto da variação no item
  select pg_get_functiondef('_create_order(uuid, text, text, text, jsonb, jsonb, text, numeric, int, text, boolean, text)'::regprocedure) into d;
  d := replace(d, 'v_price := effective_price(v.id);',
                  $q$v_price := case when v_pay = 'pix' and v.cash_price is not null and v.cash_price < effective_price(v.id) then v.cash_price else effective_price(v.id) end;$q$);
  d := replace(d, $q$'image', (select url from product_media where product_id = p.id order by position limit 1)$q$,
                  $q$'image', coalesce(v.image_url, (select url from product_media where product_id = p.id order by position limit 1))$q$);
  if d not like '%v.cash_price%' or d not like '%v.image_url%' then raise exception '_create_order não foi ajustada'; end if;
  execute d;

  -- save_product: grava preço do Pix e imagem de cada variação (campo ausente mantém o valor atual)
  select pg_get_functiondef('save_product(jsonb)'::regprocedure) into d;
  d := replace(d, 'length_mm, is_active)', 'length_mm, is_active, cash_price, image_url)');
  d := replace(d, $q$coalesce((vr ->> 'active')::boolean, true))$q$,
                  $q$coalesce((vr ->> 'active')::boolean, true), (case when nullif(vr ->> 'cashPrice', '') is not null and (vr ->> 'cashPrice')::numeric < v_price then round((vr ->> 'cashPrice')::numeric, 2) end), nullif(btrim(vr ->> 'imageUrl'), ''))$q$);
  d := replace(d, $q$is_active = coalesce((vr ->> 'active')::boolean, true)$q$,
                  $q$is_active = coalesce((vr ->> 'active')::boolean, true),
          cash_price = case when vr ? 'cashPrice' then (case when nullif(vr ->> 'cashPrice', '') is not null and (vr ->> 'cashPrice')::numeric < v_price then round((vr ->> 'cashPrice')::numeric, 2) end) else cash_price end,
          image_url = case when vr ? 'imageUrl' then nullif(btrim(vr ->> 'imageUrl'), '') else image_url end$q$);
  if d not like '%cashPrice%' or d not like '%is_active, cash_price, image_url)%' or d not like '%image_url = case%' then raise exception 'save_product não foi ajustada'; end if;
  execute d;
end $$;

revoke all on function save_product(jsonb) from public, anon, authenticated;
revoke all on function checkout_resolve_items(jsonb) from public, anon, authenticated;
revoke all on function checkout_quote(jsonb, text, uuid, text, text) from public, anon, authenticated;
revoke all on function _create_order(uuid, text, text, text, jsonb, jsonb, text, numeric, int, text, boolean, text) from public, anon, authenticated;
grant execute on function checkout_quote(jsonb, text, uuid, text, text) to service_role;
