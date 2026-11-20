-- Eventos próprios para o funil de jornada (sem cookies de terceiros e sem dado pessoal):
-- cada visita recebe um id de sessão anônimo gerado no navegador.
-- A tabela já existia (vazia) no esquema inicial; aqui ela ganha as colunas do funil.
alter table analytics_events add column if not exists path text;
alter table analytics_events add column if not exists product_slug text;
alter table analytics_events add column if not exists device text;
alter table analytics_events add column if not exists source text;        -- utm_source ou domínio de quem indicou; "direto" sem origem
alter table analytics_events add column if not exists meta jsonb not null default '{}';

alter table analytics_events drop constraint if exists analytics_events_device_check;
alter table analytics_events add constraint analytics_events_device_check check (device is null or device in ('mobile', 'tablet', 'desktop'));
alter table analytics_events drop constraint if exists analytics_events_event_check;
alter table analytics_events add constraint analytics_events_event_check
  check (event in ('page_view', 'product_view', 'add_to_cart', 'checkout_start', 'shipping_quoted', 'payment_created', 'search', 'stock_out_view', 'coupon_applied'));

create index if not exists analytics_events_time_idx on analytics_events (created_at);
create index if not exists analytics_events_session_idx on analytics_events (session_id, created_at);
create index if not exists analytics_events_product_idx on analytics_events (product_slug, created_at) where product_slug is not null;

-- Só o servidor grava (conexão direta / service role). Inserção pública pelo cliente do Supabase
-- deixaria qualquer um encher a tabela de lixo, então a política antiga sai.
drop policy if exists anyone_insert on analytics_events;
revoke insert, update, delete on table analytics_events from anon, authenticated;
