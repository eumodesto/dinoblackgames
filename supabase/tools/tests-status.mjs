// Testa o fluxo de status do pedido (migrations 15 e 16) num Postgres local (PGlite).
// Não depende da suíte principal: carrega as migrations e o seed (sem as linhas de analytics_events) e roda os cenários.
// Uso: node tests-status.mjs
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

const addr = { recipient: "Teste Status", phone: "(61) 90000-0001", cep: "72510000", street: "Quadra 1", number: "1", district: "Santa Maria", city: "Brasília", state: "DF" };
let seq = 0;
const newOrder = async () => {
  seq += 1;
  const customer = { name: "Teste Status", email: `status${seq}@teste.dinoblack.example`, phone: "(61) 90000-0001" };
  const r = (await one("select create_checkout_order($1::jsonb, $2::jsonb, $3::jsonb, 'Retirada na loja', 0, 0, null, true, null) as r", [JSON.stringify([{ slug: "mouse-gamer-8000-dpi", qty: 1 }]), JSON.stringify(customer), JSON.stringify(addr)])).r;
  return one("select id, number, total from orders where id = $1", [r.id]);
};
const status = async (id) => (await one("select status::text as s from orders where id = $1", [id])).s;
const level = async () => one("select il.on_hand, il.reserved from inventory_levels il join product_variants v on v.id = il.variant_id where v.sku = 'DB-MS-13-U'");
const pay = (o, id, st, extra = {}) =>
  one("select sync_mp_payment($1, $2::jsonb) as r", [o.number, JSON.stringify({ id, status: st, status_detail: st === "rejected" ? "cc_rejected_other_reason" : "accredited", payment_method_id: "visa", payment_type_id: "credit_card", transaction_amount: Number(o.total), installments: 1, ...extra })]).then((x) => x.r);

console.log("-- status: valores novos");
const labels = (await rows("select unnest(enum_range(null::order_status))::text as v")).map((r) => r.v);
check("enum tem payment_failed, exchange_requested e refunded", ["payment_failed", "exchange_requested", "refunded"].every((v) => labels.includes(v)), labels.join(","));

console.log("-- status: pagamento recusado e nova tentativa");
const base = await level();
const a = await newOrder();
check("pedido novo nasce como pagamento pendente e reserva estoque", (await status(a.id)) === "pending_payment" && (await level()).reserved === base.reserved + 1);
const r1 = await pay(a, "7000001", "rejected");
check("cartão recusado vira 'Pagamento recusado'", r1.orderStatus === "payment_failed" && (await status(a.id)) === "payment_failed", JSON.stringify(r1));
check("o estoque continua reservado após a recusa", (await level()).reserved === base.reserved + 1);
check("a recusa fica no histórico do pedido", Number((await one("select count(*)::int as n from order_events where order_id = $1 and to_status = 'payment_failed'", [a.id])).n) === 1);
check("recusa repetida não duplica o histórico", ((await pay(a, "7000001", "rejected")).duplicate === true) && Number((await one("select count(*)::int as n from order_events where order_id = $1 and to_status = 'payment_failed'", [a.id])).n) === 1);
const r2 = await pay(a, "7000002", "pending", { payment_method_id: "pix", payment_type_id: "bank_transfer" });
check("nova tentativa em andamento volta para pagamento pendente", r2.orderStatus === "pending_payment", JSON.stringify(r2));
await pay(a, "7000002", "rejected", { payment_method_id: "pix", payment_type_id: "bank_transfer" });
check("recusado de novo", (await status(a.id)) === "payment_failed");
const r3 = await pay(a, "7000003", "approved");
check("aprovar um pedido com pagamento recusado confirma o pedido", r3.orderStatus === "paid" && (await status(a.id)) === "paid", JSON.stringify(r3));
const after = await level();
check("a aprovação baixa o saldo e libera a reserva", after.on_hand === base.on_hand - 1 && after.reserved === base.reserved, JSON.stringify(after));

console.log("-- status: estorno");
const r4 = await pay(a, "7000003", "refunded");
check("estorno no Mercado Pago deixa o pedido 'Estornado'", r4.orderStatus === "refunded" && (await status(a.id)) === "refunded", JSON.stringify(r4));
check("pedido estornado não pode ser cancelado", /não pode ser cancelado/.test(await throws(() => one("select cancel_order($1::uuid, 'x')", [a.id])) ?? ""));

console.log("-- status: expiração");
const b = await newOrder();
await pay(b, "7100001", "rejected");
// os pedidos pendentes do seed ficam de fora: só o pedido deste teste deve vencer
await db.query("update orders set placed_at = now() + interval '1 hour' where id <> $1 and status in ('pending_payment', 'payment_failed')", [b.id]);
const reservedBefore = (await level()).reserved;
const n = (await one("select expire_pending_orders(0) as n")).n;
check("pedido com pagamento recusado também expira e vira cancelado", n === 1 && (await status(b.id)) === "cancelled", `n=${n}`);
check("a expiração devolve o estoque reservado", (await level()).reserved === reservedBefore - 1);

console.log("-- status: pedidos de troca e estorno");
await db.query("insert into order_requests (order_id, kind, reason) values ($1, 'exchange', 'Produto veio com defeito')", [a.id]);
check("pedido de troca é gravado", (await one("select status from order_requests where order_id = $1", [a.id])).status === "open");
check("motivo muito curto é recusado", /check|violates/i.test((await throws(() => db.query("insert into order_requests (order_id, kind, reason) values ($1, 'refund', 'x')", [a.id]))) ?? ""));
await db.query("update orders set status = 'exchange_requested' where id = $1", [a.id]);
check("status 'Pedido de troca' é aceito pelo banco", (await status(a.id)) === "exchange_requested");

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
