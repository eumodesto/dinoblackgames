// Testa o relatório do lembrete de pagamento pendente (SQL de email-tracking.ts) num Postgres local (PGlite).
// Não depende da suíte principal: carrega as migrations e o seed (sem as linhas de analytics_events) e roda os cenários.
// Uso: node tests-reminders.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite({ extensions: { pgcrypto } });
let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name} ${detail}`); }
};
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const throws = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

await db.exec(`
  create extension if not exists pgcrypto;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, encrypted_password text, email_confirmed_at timestamptz, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
const migDir = join(root, "migrations");
for (const file of readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(join(migDir, file), "utf8"));
// O seed atual tem um insert em analytics_events que não bate com o schema: fica de fora aqui.
await db.exec(readFileSync(join(root, "seed.sql"), "utf8").replace(/insert into analytics_events[\s\S]*?;\r?\n/, ""));



const STATS = "with r as (\n       select e.external_id as number, e.received_at as sent_at, e.status\n       from integration_events e\n       where e.provider = $1 and e.received_at >= $3::timestamptz and e.received_at < $4::timestamptz\n     ),\n     c as (\n       select (e.payload ->> 'order') as number, count(*) as clicks, min(e.received_at) as first_click\n       from integration_events e\n       where e.provider = $2 and e.received_at >= $3::timestamptz\n       group by 1\n     ),\n     joined as (\n       select r.number, r.status, r.sent_at, coalesce(c.clicks, 0) as clicks, c.first_click,\n              o.paid_at, o.total, o.status::text as order_status\n       from r\n       left join c on c.number = r.number\n       left join orders o on o.number = r.number\n     )\n     select count(*) filter (where status = 'processed')::int as sent,\n            count(*) filter (where status = 'failed')::int as failed,\n            count(*) filter (where status = 'processed' and clicks > 0)::int as clicked_orders,\n            coalesce(sum(clicks) filter (where status = 'processed'), 0)::int as clicks,\n            count(*) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and order_status not in ('cancelled', 'refunded'))::int as paid_after,\n            count(*) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and first_click is not null and first_click <= paid_at and order_status not in ('cancelled', 'refunded'))::int as paid_after_click,\n            coalesce(sum(total) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and order_status not in ('cancelled', 'refunded')), 0) as revenue_after,\n            coalesce(sum(total) filter (where status = 'processed' and paid_at is not null and paid_at >= sent_at and first_click is not null and first_click <= paid_at and order_status not in ('cancelled', 'refunded')), 0) as revenue_after_click\n     from joined";
const stats = async () => (await one(STATS, ["email-reminder", "email-click", "2000-01-01T00:00:00Z", "2100-01-01T00:00:00Z"]));
const addr = { recipient: "T", phone: "(61) 90000-0001", cep: "72510000", street: "Q1", number: "1", district: "S", city: "Brasília", state: "DF" };
let n = 0;
const order = async () => { n += 1; const r = (await one("select create_checkout_order($1::jsonb, $2::jsonb, $3::jsonb, 'Retirada na loja', 0, 0, null, true, null) as r", [JSON.stringify([{ slug: "mouse-gamer-8000-dpi", qty: 1 }]), JSON.stringify({ name: "T T", email: `lem${n}@t.example`, phone: "(61) 90000-0001" }), JSON.stringify(addr)])).r; return one("select id, number, total from orders where id = $1", [r.id]); };
const send = (o, status = "processed") => db.query("insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, processed_at) values ('email','email-reminder',$1,'email.sent','{}'::jsonb,$2,1,now())", [o.number, status]);
const click = (o, bucket) => db.query("insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, processed_at) values ('email','email-click',$1,'email.click',$2::jsonb,'processed',1,now()) on conflict (provider, external_id) do nothing", [`${o.number}:payment_pending_reminder:${bucket}`, JSON.stringify({ order: o.number })]);

console.log("-- lembrete: envios, cliques e compras");
const base = await stats();
check("sem envios o relatório zera", Number(base.sent) === 0 && Number(base.paid_after) === 0, JSON.stringify(base));
const a1 = await order(), a2 = await order(), a3 = await order(), a4 = await order();
await send(a1); await send(a2); await send(a3); await send(a4, "failed");
await click(a1, 1); await click(a1, 2); await click(a1, 1); // o terceiro repete o minuto 1: não conta
await click(a2, 1);
let st = await stats();
check("conta envios com sucesso e separa os que falharam", Number(st.sent) === 3 && Number(st.failed) === 1, JSON.stringify(st));
check("cliques: 2 pedidos distintos, 3 cliques (o repetido no mesmo minuto não conta)", Number(st.clicked_orders) === 2 && Number(st.clicks) === 3, JSON.stringify(st));
check("ninguém pagou ainda", Number(st.paid_after) === 0 && Number(st.paid_after_click) === 0);
await db.query("update orders set status = 'paid', paid_at = now() + interval '1 minute' where id = $1", [a1.id]); // clicou e pagou
await db.query("update orders set status = 'paid', paid_at = now() + interval '1 minute' where id = $1", [a3.id]); // pagou sem clicar
st = await stats();
check("pagaram depois do lembrete: 2 pedidos", Number(st.paid_after) === 2, JSON.stringify(st));
check("clicaram e pagaram: só 1 (o que pagou sem clicar fica fora)", Number(st.paid_after_click) === 1, JSON.stringify(st));
check("receita bate com os pedidos pagos", Math.abs(Number(st.revenue_after) - (Number(a1.total) + Number(a3.total))) < 0.01 && Math.abs(Number(st.revenue_after_click) - Number(a1.total)) < 0.01, JSON.stringify(st));
await db.query("update orders set status = 'cancelled' where id = $1", [a3.id]);
check("pedido cancelado depois não conta como compra", Number((await stats()).paid_after) === 1);
await db.query("update orders set paid_at = now() - interval '1 hour' where id = $1", [a2.id]);
await db.query("update orders set status = 'paid' where id = $1", [a2.id]);
check("pagamento ANTES do lembrete não é creditado ao e-mail", Number((await stats()).paid_after) === 1);
console.log(`
${passed} verificações ok, ${failed} falhas`);
process.exit(failed ? 1 : 0);
