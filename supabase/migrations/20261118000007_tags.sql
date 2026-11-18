-- Tags gerenciáveis para busca e curadoria do catálogo.
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_tags (
  product_id uuid not null references products (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);

create index if not exists product_tags_tag_idx on product_tags (tag_id);
create index if not exists tags_active_idx on tags (is_active, name);
