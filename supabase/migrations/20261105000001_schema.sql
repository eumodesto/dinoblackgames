-- =============================================================================
-- DinoBlack Games e Informática: schema inicial (PostgreSQL / Supabase)
-- Mapeado a partir de: docs/Documento_Desenvolvimento_Ecommerce_DinoBlack.md,
-- admin-preview/admin-map.json e do storefront (storefront/src).
-- Ver docs/Mapeamento_Telas_e_Dados.md para a correspondência tela -> tabela.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Tipos
-- ----------------------------------------------------------------------------
create type app_role as enum ('owner', 'manager', 'stock', 'appraiser', 'support', 'editor');
create type product_condition as enum ('novo', 'seminovo', 'raridade', 'pre_venda');
create type publish_status as enum ('draft', 'scheduled', 'published', 'archived');
create type unit_status as enum ('disponivel', 'reservado', 'vendido', 'baixa');
create type movement_type as enum ('entrada', 'saida', 'reserva', 'liberacao', 'ajuste', 'devolucao');
create type order_status as enum ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned');
create type payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'expired', 'refunded');
create type payment_method as enum ('pix', 'credit_card', 'boleto');
create type shipment_status as enum ('pending', 'ready', 'shipped', 'delivered', 'failed');
create type return_status as enum ('requested', 'approved', 'received', 'refunded', 'rejected');
create type used_status as enum ('new', 'triage', 'awaiting_customer', 'in_review', 'offered', 'accepted', 'declined', 'closed');
create type consent_channel as enum ('email', 'whatsapp', 'sms');
create type consent_purpose as enum ('transactional', 'marketing', 'recovery', 'analytics');
create type privacy_request_type as enum ('access', 'correction', 'deletion');
create type privacy_request_status as enum ('received', 'in_progress', 'done', 'rejected');
create type discount_kind as enum ('percent', 'amount');
create type banner_placement as enum ('home_hero', 'home_strip', 'shop_banner', 'category');
create type integration_status as enum ('not_configured', 'sandbox', 'active', 'failing');

-- ----------------------------------------------------------------------------
-- Utilitários
-- ----------------------------------------------------------------------------
create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Usuários e acesso
-- ----------------------------------------------------------------------------
-- profiles.id == auth.users.id (Supabase Auth). Cliente e equipe usam a mesma tabela;
-- a equipe é identificada por user_roles.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  document_hint text,               -- só os 3 últimos dígitos, nunca o documento inteiro
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on profiles (lower(email));

create table user_roles (
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null,
  granted_by uuid references profiles (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  label text not null default 'Casa',
  recipient text not null,
  phone text,
  cep text not null check (cep ~ '^[0-9]{8}$'),
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state char(2) not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on addresses (user_id);
create unique index addresses_one_default on addresses (user_id) where is_default;

-- ----------------------------------------------------------------------------
-- Catálogo
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null default 0,
  image_url text,
  seo_title text,
  seo_description text,
  is_active boolean not null default true
);

-- Agrupamentos transversais: ofertas, lançamentos, raridades, seminovos...
create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status publish_status not null default 'published',
  position int not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  name text not null,
  category_id uuid not null references categories (id),
  condition product_condition not null default 'novo',
  status publish_status not null default 'draft',
  brand text,
  tagline text,
  description text,
  badge text,                                      -- ex.: Flagship, Premium Gear
  warranty_months int not null default 12 check (warranty_months >= 0),
  warranty_text text,
  -- Blocos editados como um todo no admin, mesmo formato de storefront/src/data/product-details.ts
  highlights jsonb not null default '[]',          -- [{title, text}]
  specs jsonb not null default '[]',               -- [{group, rows:[[label,value]]}]
  in_box jsonb not null default '[]',              -- ["item", ...]
  faq jsonb not null default '[]',                 -- [{q, a}]
  seo_title text,
  seo_description text,
  sold_count int not null default 0,
  rating numeric(2, 1) check (rating between 0 and 5),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products (category_id);
create index products_status_idx on products (status);
create trigger products_touch before update on products for each row execute function touch_updated_at();

create table collection_products (
  collection_id uuid not null references collections (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, product_id)
);

create table product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'video')),
  url text not null,
  alt text not null default '',
  position int not null default 0,
  crop text                                        -- object-position usado na galeria
);
create index product_media_product_idx on product_media (product_id, position);

-- Atributos filtráveis da loja (plataforma, tipo, processador, placa de vídeo...)
create table product_facets (
  product_id uuid not null references products (id) on delete cascade,
  facet_key text not null,
  facet_value text not null,
  primary key (product_id, facet_key, facet_value)
);
create index product_facets_lookup on product_facets (facet_key, facet_value);

create table product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  code text not null,                              -- color, storage
  name text not null,
  position int not null default 0,
  unique (product_id, code)
);

create table product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references product_options (id) on delete cascade,
  label text not null,
  position int not null default 0,
  unique (option_id, label)
);

-- Cada variação vendável. Produto sem opções tem uma variação só.
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,
  option_values jsonb not null default '{}',       -- {"color":"Branco","storage":"1 TB"}
  price numeric(12, 2) not null check (price >= 0),
  compare_at numeric(12, 2) check (compare_at is null or compare_at >= price),
  max_installments int not null default 10 check (max_installments between 1 and 12),
  weight_grams int,
  width_mm int,
  height_mm int,
  length_mm int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on product_variants (product_id);
create trigger product_variants_touch before update on product_variants for each row execute function touch_updated_at();

-- Kits (evolução posterior): base + componentes compatíveis
create table kits (
  id uuid primary key default gen_random_uuid(),
  base_product_id uuid not null references products (id) on delete cascade,
  name text not null,
  status publish_status not null default 'draft'
);
create table kit_components (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete cascade,
  product_id uuid not null references products (id),
  slot text not null,                              -- ex.: controle, headset
  is_required boolean not null default false,
  extra_price numeric(12, 2) not null default 0
);

-- ----------------------------------------------------------------------------
-- Estoque
-- ----------------------------------------------------------------------------
create table stock_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_pickup boolean not null default false         -- retirada na loja
);

-- Saldo por variação (itens novos, em quantidade)
create table inventory_levels (
  variant_id uuid not null references product_variants (id) on delete cascade,
  location_id uuid not null references stock_locations (id),
  on_hand int not null default 0 check (on_hand >= 0),
  reserved int not null default 0 check (reserved >= 0),
  min_level int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (variant_id, location_id),
  check (reserved <= on_hand)
);

-- Unidade única (seminovo e raridade): cada item tem laudo, fotos e garantia próprios
create table inventory_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  variant_id uuid not null references product_variants (id),
  location_id uuid references stock_locations (id),
  serial text,
  status unit_status not null default 'disponivel',
  grade text not null,                             -- escala padronizada a validar com o cliente
  report jsonb not null default '{}',              -- {summary, tested[], included[], knownMarks[]}
  photos jsonb not null default '[]',              -- [{url, alt}] fotos reais DESTA unidade
  warranty_days int not null default 90,
  cost numeric(12, 2),
  acquired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_units_product_idx on inventory_units (product_id, status);
create unique index inventory_units_serial_key on inventory_units (serial) where serial is not null;
create trigger inventory_units_touch before update on inventory_units for each row execute function touch_updated_at();

create table inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid references product_variants (id),
  unit_id uuid references inventory_units (id),
  location_id uuid references stock_locations (id),
  type movement_type not null,
  quantity int not null,
  reason text,
  order_id uuid,                                   -- FK adicionada após orders
  actor_id uuid references profiles (id),
  created_at timestamptz not null default now(),
  check (variant_id is not null or unit_id is not null)
);
create index inventory_movements_variant_idx on inventory_movements (variant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Carrinho, pedido, pagamento, envio
-- ----------------------------------------------------------------------------
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_one_open_per_user on carts (user_id) where status = 'open' and user_id is not null;

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  unit_id uuid references inventory_units (id),    -- obrigatório para item de unidade única
  quantity int not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  -- a "linha" do carrinho é variação (+ unidade): o mesmo produto em cores diferentes são linhas diferentes
  unique (cart_id, variant_id, unit_id)
);

create sequence order_number_seq start 1001;

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind discount_kind not null,
  value numeric(12, 2) not null check (value > 0),
  min_subtotal numeric(12, 2) not null default 0,
  max_uses int,
  max_uses_per_user int not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('DB-' || nextval('order_number_seq')),
  user_id uuid references profiles (id),
  guest_email text,                                -- compra sem cadastro
  status order_status not null default 'pending_payment',
  coupon_id uuid references coupons (id),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12, 2) not null default 0 check (shipping_total >= 0),
  total numeric(12, 2) not null check (total >= 0),
  -- retrato do endereço e do frete na hora da compra
  shipping_address jsonb not null,
  shipping_method text not null,
  shipping_eta_days int,
  notes text,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_email is not null),
  check (total = subtotal - discount_total + shipping_total)
);
create index orders_user_idx on orders (user_id, placed_at desc);
create index orders_status_idx on orders (status, placed_at desc);
create trigger orders_touch before update on orders for each row execute function touch_updated_at();

alter table inventory_movements add constraint inventory_movements_order_fk foreign key (order_id) references orders (id);

-- O pedido guarda o retrato do que foi anunciado (nome, condição, preço, opções)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id),
  variant_id uuid references product_variants (id),
  unit_id uuid references inventory_units (id),
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  snapshot jsonb not null                          -- {name, sku, condition, options, image, warrantyMonths, unitReport?}
);
create index order_items_order_idx on order_items (order_id);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders (id) on delete cascade,
  type text not null,                              -- status_changed, note, payment, shipment...
  from_status text,
  to_status text,
  message text,
  actor_id uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  method payment_method not null,
  status payment_status not null default 'pending',
  amount numeric(12, 2) not null check (amount >= 0),
  installments int not null default 1,
  provider text,                                   -- definido na escolha do gateway
  provider_ref text,
  pix_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on payments (order_id);
create unique index payments_provider_ref_key on payments (provider, provider_ref) where provider_ref is not null;
create trigger payments_touch before update on payments for each row execute function touch_updated_at();

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  status shipment_status not null default 'pending',
  carrier text,
  service text,
  tracking_code text,
  label_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  events jsonb not null default '[]',              -- [{at, status, place}]
  created_at timestamptz not null default now()
);

create table return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  order_item_id uuid references order_items (id),
  user_id uuid references profiles (id),
  kind text not null check (kind in ('troca', 'devolucao', 'garantia', 'cancelamento')),
  status return_status not null default 'requested',
  reason text not null,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons (id),
  order_id uuid not null references orders (id) on delete cascade,
  user_id uuid references profiles (id),
  discount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind discount_kind not null,
  value numeric(12, 2) not null check (value > 0),
  scope text not null check (scope in ('collection', 'products', 'category')),
  collection_id uuid references collections (id),
  category_id uuid references categories (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status publish_status not null default 'draft',
  show_countdown boolean not null default false,    -- Flash Drop da home
  check (ends_at > starts_at)
);
create table promotion_products (
  promotion_id uuid not null references promotions (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  primary key (promotion_id, product_id)
);

-- ----------------------------------------------------------------------------
-- Venda de usados (Projeto Drop)
-- ----------------------------------------------------------------------------
create sequence used_protocol_seq start 85;

create table used_requests (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique default ('US-' || lpad(nextval('used_protocol_seq')::text, 4, '0')),
  user_id uuid references profiles (id),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  item_description text not null,
  category_id uuid references categories (id),
  declared_condition text not null,
  accessories text,
  status used_status not null default 'new',
  assigned_to uuid references profiles (id),
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index used_requests_status_idx on used_requests (status, created_at desc);
create trigger used_requests_touch before update on used_requests for each row execute function touch_updated_at();

create table used_request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references used_requests (id) on delete cascade,
  storage_path text not null,                      -- bucket privado, com expiração
  uploaded_at timestamptz not null default now()
);

create table used_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references used_requests (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  kind text not null default 'dinheiro' check (kind in ('dinheiro', 'credito')),
  message text,
  decision text not null default 'pending' check (decision in ('pending', 'accepted', 'declined')),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table used_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references used_requests (id) on delete cascade,
  type text not null,
  message text,
  actor_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Conteúdo da loja
-- ----------------------------------------------------------------------------
create table banners (
  id uuid primary key default gen_random_uuid(),
  placement banner_placement not null,
  title text not null,
  eyebrow text,
  description text,
  cta_label text,
  href text,
  image_url text not null,
  image_mobile_url text,
  position int not null default 0,
  status publish_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind text not null default 'institutional' check (kind in ('institutional', 'policy', 'campaign')),
  body_md text not null default '',
  status publish_status not null default 'draft',
  seo_title text,
  seo_description text,
  noindex boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger pages_touch before update on pages for each row execute function touch_updated_at();

create table nav_items (
  id uuid primary key default gen_random_uuid(),
  menu text not null check (menu in ('header', 'footer', 'categories')),
  parent_id uuid references nav_items (id) on delete cascade,
  label text not null,
  href text,                                       -- null = texto sem link (página ainda não existe)
  position int not null default 0,
  is_active boolean not null default true
);

create table redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code int not null default 301 check (status_code in (301, 302)),
  note text
);

create table store_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Relacionamento, privacidade e suporte
-- ----------------------------------------------------------------------------
create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  email text,
  channel consent_channel not null,
  purpose consent_purpose not null,
  granted boolean not null,
  source text not null,                            -- checkout, cadastro, formulário de usado...
  ip_hash text,
  created_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);
create index consents_user_idx on consents (user_id, channel, purpose, created_at desc);

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id),
  contact_email text not null,
  type privacy_request_type not null,
  status privacy_request_status not null default 'received',
  details text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table back_in_stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references product_variants (id),
  user_id uuid references profiles (id) on delete cascade,
  email text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

-- Só exibir quando houver fonte confiável (documento, seção 2.1). Por isso nasce moderada.
create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid references profiles (id),
  order_item_id uuid references order_items (id),
  rating int not null check (rating between 1 and 5),
  body text,
  source text not null default 'compra_verificada',
  status publish_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Operação, integrações e auditoria
-- ----------------------------------------------------------------------------
create table integrations (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique check (domain in ('payments', 'shipping', 'erp', 'fiscal', 'messaging', 'analytics')),
  provider text,
  status integration_status not null default 'not_configured',
  owner_name text,
  last_checked_at timestamptz,
  notes text
);

-- Idempotência de webhooks e eventos externos (pagamento repetido não duplica efeito)
create table integration_events (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  provider text not null,
  external_id text not null,
  event_type text not null,
  payload jsonb not null default '{}',
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  attempts int not null default 0,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_id)
);

create table admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                              -- estoque_baixo, pagamento_expirado, integracao_falha...
  title text not null,
  body text,
  ref_table text,
  ref_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity, entity_id, created_at desc);

-- Eventos de navegação e compra, sem dado pessoal (documento, seção 14)
create table analytics_events (
  id bigint generated always as identity primary key,
  event text not null,                             -- view_item_list, view_item, add_to_cart, ...
  session_id text,
  user_id uuid,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index analytics_events_event_idx on analytics_events (event, created_at desc);
