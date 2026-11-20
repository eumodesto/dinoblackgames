-- Destaques da home ligados ao cadastro do produto:
--   hero  = slider grande à esquerda (até 10 produtos)
--   flash = cartão "Flash Drop" à direita (até 5 produtos)
-- Nome, imagem, preço, preço original, desconto, avaliação, vendidos e estoque vêm do próprio produto;
-- aqui ficam só os textos e opções específicos de cada destaque.

create table product_highlights (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  slot text not null check (slot in ('hero', 'flash')),
  position int not null default 0,
  is_active boolean not null default true,
  -- slider (hero)
  eyebrow text,                 -- texto pequeno acima do título (ex.: "Performance para jogo e criação")
  headline text,                -- título do slide; vazio = nome do produto
  description text,             -- frase de apoio; vazio = resumo curto do produto
  cta_label text,               -- texto do botão; vazio = "Explorar agora"
  image_url text,               -- fundo do slide; vazio = imagem principal do produto
  -- flash drop
  badge text,                   -- selo na imagem; vazio = "Oferta exclusiva"
  ends_at timestamptz,          -- fim da oferta (contagem regressiva real); vazio = sem contagem
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, slot)
);

create index product_highlights_slot_idx on product_highlights (slot, is_active, position);

-- Limites por vaga, garantidos no banco (a API também confere para dar uma mensagem amigável).
create function enforce_product_highlight_limit() returns trigger
language plpgsql as $$
declare
  max_items int := case new.slot when 'hero' then 10 else 5 end;
  current_items int;
begin
  -- Ignora a própria linha do produto: um upsert (ON CONFLICT) dispara este gatilho antes de detectar o conflito.
  select count(*) into current_items from product_highlights where slot = new.slot and product_id is distinct from new.product_id;
  if current_items >= max_items then
    raise exception 'Limite de % produtos atingido para o destaque "%".', max_items, new.slot using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger product_highlights_limit before insert or update of slot on product_highlights
  for each row execute function enforce_product_highlight_limit();

create trigger product_highlights_touch before update on product_highlights
  for each row execute function touch_updated_at();

-- RLS: leitura pública só de destaques ativos de produtos publicados; equipe lê tudo; escrita para owner/manager/editor.
alter table product_highlights enable row level security;

create policy public_read on product_highlights for select using (
  is_active and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy staff_select on product_highlights for select to authenticated using (is_staff());
create policy staff_write_product_highlights on product_highlights for all to authenticated
  using (has_any_role('{owner,manager,editor}'::app_role[])) with check (has_any_role('{owner,manager,editor}'::app_role[]));
