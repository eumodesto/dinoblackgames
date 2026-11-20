-- Usuários do painel administrativo: Super Admin (tudo) e Gerente de Loja (áreas escolhidas).
-- O acesso "raiz" continua sendo o usuário definido nas variáveis ADMIN_USER / ADMIN_PASSWORD; esta tabela guarda os demais.
--
-- Senhas: nunca em texto puro. O servidor grava só o hash (scrypt com sal) em password_hash.
-- session_version sobe a cada mudança de perfil, permissões, senha ou desativação e derruba as sessões abertas do usuário.

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null check (char_length(name) between 2 and 120),
  role text not null check (role in ('super_admin', 'manager')),
  -- áreas liberadas para o gerente: orders, products, categories, coupons, settings (Super Admin ignora esta lista)
  permissions text[] not null default '{}' check (permissions <@ array['orders', 'products', 'categories', 'coupons', 'settings']),
  password_hash text not null,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  session_version int not null default 1,
  last_login_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admin_users_email_key on admin_users (lower(email));
create trigger admin_users_touch before update on admin_users for each row execute function touch_updated_at();

-- Só o servidor (service role) acessa: sem política, nenhum acesso pela chave pública.
alter table admin_users enable row level security;
