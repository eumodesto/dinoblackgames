// Testa o preço do Pix e imagem por variação (migration 18) num Postgres local (PGlite).
// Não depende da suíte principal: carrega as migrations e o seed (sem as linhas de analytics_events) e roda os cenários.
// Uso: node tests-cash.mjs
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


const addr = { recipient: "Teste Pix", phone: "(61) 90000-0001", cep: "72510000", street: "Quadra 1", number: "1", district: "Santa Maria", city: "Brasília", state: "DF" };
const cust = (n) => ({ name: "Teste Pix", email: `pix${n}@teste.dinoblack.example`, phone: "(61) 90000-0001" });
const items = JSON.stringify([{ slug: "mouse-gamer-8000-dpi", qty: 1 }]);

console.log("-- variação: preço do Pix e imagem");
const v = await one("select v.id, v.sku, v.price, p.id as pid from product_variants v join products p on p.id = v.product_id where v.sku = 'DB-MS-13-U'");
const price = Number(v.price);
const eff = Number((await one("select effective_price($1) as e", [v.id])).e); // o produto pode estar em promoção
const cash = Number((eff - 10).toFixed(2));
check("a variação do teste existe", Boolean(v.id));

const save = (variant) => one("select save_product($1::jsonb) as r", [JSON.stringify({ id: v.pid, variants: [{ sku: v.sku, options: {}, price, ...variant }] })]);
await save({ cashPrice: cash, imageUrl: "https://exemplo.test/var.jpg" });
let row = await one("select cash_price, image_url from product_variants where id = $1", [v.id]);
check("save_product grava o preço do Pix e a imagem da variação", Number(row.cash_price) === cash && row.image_url === "https://exemplo.test/var.jpg", JSON.stringify(row));
await save({});
row = await one("select cash_price, image_url from product_variants where id = $1", [v.id]);
check("campo ausente mantém o valor atual", Number(row.cash_price) === cash && row.image_url === "https://exemplo.test/var.jpg", JSON.stringify(row));
await save({ cashPrice: price + 5 });
row = await one("select cash_price from product_variants where id = $1", [v.id]);
check("preço do Pix maior ou igual ao preço normal é descartado", row.cash_price === null, JSON.stringify(row));
await save({ cashPrice: cash, imageUrl: "" });
row = await one("select cash_price, image_url from product_variants where id = $1", [v.id]);
check("imagem vazia remove a imagem da variação", Number(row.cash_price) === cash && row.image_url === null, JSON.stringify(row));
await save({ cashPrice: cash, imageUrl: "https://exemplo.test/var.jpg" });

const q = async (pay) => (await one("select checkout_quote($1::jsonb, null, null, null, $2) as r", [items, pay])).r;
const none = await q(null);
const cardQ = await q("credit_card");
const pixQ = await q("pix");
check("sem forma de pagamento, vale o preço normal", Number(none.subtotal) === eff && Number(none.lines[0].unitPrice) === eff, JSON.stringify(none.subtotal));
check("cartão paga o preço normal", Number(cardQ.subtotal) === eff);
check("Pix paga o preço do Pix na cotação", Number(pixQ.subtotal) === Number((eff - 10).toFixed(2)) && pixQ.lines[0].cashApplied === true && Number(pixQ.lines[0].cashListPrice) === eff, JSON.stringify(pixQ.subtotal));
check("a linha informa o preço do Pix e a imagem da variação", Number(none.lines[0].cashPrice) === cash && none.lines[0].image === "https://exemplo.test/var.jpg", JSON.stringify(none.lines[0]));

const order = async (n, pay) => (await one("select create_checkout_order($1::jsonb, $2::jsonb, $3::jsonb, 'Retirada na loja', 0, 0, null, true, null, $4) as r", [items, JSON.stringify(cust(n)), JSON.stringify(addr), pay])).r;
const op = await order(1, "pix");
const oc = await order(2, "credit_card");
const itemOf = (id) => one("select unit_price, snapshot ->> 'image' as image from order_items where order_id = $1", [id]);
check("pedido no Pix grava o preço do Pix e total confere", Number(op.total) === cash && Number((await itemOf(op.id)).unit_price) === cash, JSON.stringify(op));
check("pedido no cartão grava o preço normal", Number(oc.total) === eff && Number((await itemOf(oc.id)).unit_price) === eff, JSON.stringify(oc));
check("o item do pedido guarda a imagem da variação", (await itemOf(op.id)).image === "https://exemplo.test/var.jpg");


console.log("-- opções: qualquer opção escolhe a variação");
const cat = (await one("select id from categories limit 1")).id;
const made = (await one("select save_product($1::jsonb) as r", [JSON.stringify({
  name: "Notebook Teste Opções", categoryId: cat, productType: "notebook", status: "published",
  options: [{ code: "condition", name: "Condição", values: ["Novo", "Semi-novo"] }, { code: "memoria_ram", name: "Memória RAM", values: ["8 GB", "16 GB"] }],
  variants: [
    { options: { condition: "Novo", memoria_ram: "8 GB" }, price: 4000, stock: 3 },
    { options: { condition: "Novo", memoria_ram: "16 GB" }, price: 4500, stock: 3 },
    { options: { condition: "Semi-novo", memoria_ram: "8 GB" }, price: 2900, stock: 3 },
    { options: { condition: "Semi-novo", memoria_ram: "16 GB" }, price: 3300, stock: 3 },
  ],
})])).r;
const slug = made.slug;
const pick = async (item) => (await one("select checkout_quote($1::jsonb) as r", [JSON.stringify([{ slug, qty: 1, ...item }])])).r.lines[0];
check("opção Condição (campo legado) escolhe a variação certa", Number((await pick({ condition: "Semi-novo", options: { memoria_ram: "16 GB" } })).unitPrice) === 3300);
check("opção genérica (Memória RAM) escolhe a variação certa", Number((await pick({ options: { condition: "Novo", memoria_ram: "16 GB" } })).unitPrice) === 4500);
check("todas as opções no mapa de opções", Number((await pick({ options: { condition: "Semi-novo", memoria_ram: "8 GB" } })).unitPrice) === 2900);
check("combinação que não existe não vira outra variação", (await pick({ options: { condition: "Novo", memoria_ram: "32 GB" } })).ok === false);

console.log(`
${passed} verificações ok, ${failed} falhas`);
process.exit(failed ? 1 : 0);
