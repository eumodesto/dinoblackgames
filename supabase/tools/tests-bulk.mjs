// Testa a edição em lote de produtos (storefront/src/lib/bulk-products.ts) contra um Postgres local (PGlite).
// Usa o MESMO módulo que o painel, então o SQL testado é o que vai para produção. Não toca em banco remoto.
// Uso: node tests-bulk.mjs   (precisa do Node 22.6+ para ler o .ts)
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { validateBulk, bulkStatement, pricePreviewStatements } = await import(pathToFileURL(join(root, "..", "storefront", "src", "lib", "bulk-products.ts")).href);

const db = new PGlite({ extensions: { pgcrypto } });
let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => { if (ok) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name} ${detail}`); } };
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const one = async (sql, params = []) => (await rows(sql, params))[0];

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
await db.exec(readFileSync(join(root, "seed.sql"), "utf8").replace(/insert into analytics_events[\s\S]*?;\r?\n/, ""));

// Cria um produto de teste com 2 variações (uma em promoção) e devolve os ids.
const cat = (await one("select id from categories limit 1")).id;
const cat2 = (await one("select id from categories where id <> $1 limit 1", [cat])).id;
let n = 0;
async function makeProduct(prices) {
  n += 1;
  const p = await one(`insert into products (slug, sku, name, category_id, status) values ($1, $2, $3, $4, 'published') returning id`, [`teste-lote-${n}`, `TL-${n}`, `Produto Lote ${n}`, cat]);
  for (const [i, [price, compare]] of prices.entries()) {
    await db.query(`insert into product_variants (product_id, sku, price, compare_at) values ($1, $2, $3, $4)`, [p.id, `TL-${n}-${i}`, price, compare]);
  }
  return p.id;
}
const run = async (ids, action, params) => {
  const v = validateBulk({ ids, action, params });
  if (!v.ok) throw new Error(v.error);
  const s = bulkStatement(v.ids, v.params);
  await db.query(s.sql, s.values);
};
const variants = async (id) => rows("select price::float8 as price, compare_at::float8 as compare_at from product_variants where product_id = $1 order by sku", [id]);

console.log("-- lote: validação");
const bad = (input) => !validateBulk(input).ok;
check("recusa lista vazia, ids inválidos e ação desconhecida", bad({ ids: [], action: "publish" }) && bad({ ids: ["x"], action: "publish" }) && bad({ ids: [cat], action: "apagar" }));
check("recusa mais de 200 produtos", bad({ ids: Array.from({ length: 201 }, () => cat), action: "publish" }));
check("recusa percentuais fora do limite e promoção de 0% ou 95%", bad({ ids: [cat], action: "price", params: { mode: "percent", value: -95 } }) && bad({ ids: [cat], action: "promo", params: { mode: "apply", percent: 95 } }) && bad({ ids: [cat], action: "promo", params: { mode: "apply", percent: 0 } }));
check("aceita vírgula decimal e selo vazio", validateBulk({ ids: [cat], action: "price", params: { mode: "amount", value: "-10,5" } }).ok && validateBulk({ ids: [cat], action: "badge", params: { text: "" } }).ok);

console.log("-- lote: exibição e campos simples");
const a = await makeProduct([[100, null]]);
const b = await makeProduct([[200, null]]);
await run([a, b], "unpublish");
check("despublicar vira rascunho nos dois", (await rows("select status::text as s from products where id in ($1,$2)", [a, b])).every((r) => r.s === "draft"));
await run([a], "publish");
check("publicar mexe só no escolhido", (await one("select status::text as s from products where id = $1", [a])).s === "published" && (await one("select status::text as s from products where id = $1", [b])).s === "draft");
await run([a, b], "visibility", { value: "hidden" });
check("visibilidade oculta", (await rows("select visibility from products where id in ($1,$2)", [a, b])).every((r) => r.visibility === "hidden"));
await run([a, b], "badge", { text: "Oferta" });
check("selo aplicado e depois limpo com texto vazio", (await one("select badge from products where id = $1", [a])).badge === "Oferta" && (await run([a], "badge", { text: "" }), (await one("select badge from products where id = $1", [a])).badge === null));
await run([a, b], "warranty", { months: 6 });
await run([a, b], "installments", { count: 3 });
check("garantia e parcelamento", (await one("select warranty_months from products where id = $1", [a])).warranty_months === 6 && (await variants(a)).length === 1 && (await one("select max_installments from product_variants where product_id = $1", [b])).max_installments === 3);
await run([a], "category", { categoryId: cat2 });
check("mover de categoria", (await one("select category_id from products where id = $1", [a])).category_id === cat2 && (await one("select category_id from products where id = $1", [b])).category_id === cat);
await run([a], "category", { categoryId: "00000000-0000-4000-8000-000000000000" });
check("categoria inexistente não muda nada", (await one("select category_id from products where id = $1", [a])).category_id === cat2);
await run([a, b], "archive");
check("arquivar", (await rows("select status::text as s from products where id in ($1,$2)", [a, b])).every((r) => r.s === "archived"));

console.log("-- lote: preço");
const p1 = await makeProduct([[100, null], [250.5, 300]]);
await run([p1], "price", { mode: "percent", value: 10, rounding: "none" });
let v = await variants(p1);
check("+10% em todas as variações", v[0].price === 110 && v[1].price === 275.55, JSON.stringify(v));
check("preço ainda abaixo do 'de' mantém o 'de'", v[1].compare_at === 300);
await run([p1], "price", { mode: "percent", value: 20, rounding: "none" });
v = await variants(p1);
check("preço acima do 'de' encerra a promoção (de >= por)", v[1].compare_at === null && v[1].price === 330.66, JSON.stringify(v));
await run([p1], "price", { mode: "amount", value: -50, rounding: "none" });
v = await variants(p1);
check("−R$ 50 em reais", v[0].price === 82 && v[1].price === 280.66, JSON.stringify(v));
await run([p1], "price", { mode: "amount", value: -1000, rounding: "none" });
v = await variants(p1);
check("preço nunca fica negativo", v.every((x) => x.price === 0), JSON.stringify(v));
await run([p1], "price", { mode: "set", value: 199.99, rounding: "none" });
check("definir preço fixo", (await variants(p1)).every((x) => x.price === 199.99));
await run([p1], "price", { mode: "percent", value: 3, rounding: "ends90" });
check("arredonda para o ,90 mais próximo (205,99 → 205,90)", (await variants(p1)).every((x) => x.price === 205.9), JSON.stringify(await variants(p1)));
await run([p1], "price", { mode: "set", value: 99.4, rounding: "whole" });
check("arredonda para inteiro", (await variants(p1)).every((x) => x.price === 99));

console.log("-- lote: promoção de/por");
const p2 = await makeProduct([[1000, null], [500, 800]]);
await run([p2], "promo", { mode: "apply", percent: 20, rounding: "none" });
v = await variants(p2);
check("20% off: o preço atual vira o 'de' e o 'por' cai 20%", v[0].compare_at === 1000 && v[0].price === 800, JSON.stringify(v));
check("quem já tinha 'de' recalcula sobre o 'de' (800 → 640)", v[1].compare_at === 800 && v[1].price === 640, JSON.stringify(v));
await run([p2], "promo", { mode: "apply", percent: 20, rounding: "none" });
check("repetir a promoção dá o mesmo resultado", (await variants(p2))[0].price === 800 && (await variants(p2))[0].compare_at === 1000);
await run([p2], "promo", { mode: "apply", percent: 15, rounding: "ends90" });
check("promoção com ,90 respeita de >= por", (await variants(p2)).every((x) => x.compare_at >= x.price), JSON.stringify(await variants(p2)));
const tiny = await makeProduct([[0.5, null]]);
await run([tiny], "promo", { mode: "apply", percent: 10, rounding: "ends90" });
check("preço mínimo não passa do 'de' mesmo com ,90", (await variants(tiny)).every((x) => x.price <= x.compare_at), JSON.stringify(await variants(tiny)));
await run([p2], "promo", { mode: "remove" });
v = await variants(p2);
check("remover promoção volta ao 'de' e limpa o 'de'", v.every((x) => x.compare_at === null) && v[0].price === 1000 && v[1].price === 800, JSON.stringify(v));

console.log("-- lote: pré-visualização");
const prev = pricePreviewStatements([p2], { action: "price", mode: "percent", value: 10, rounding: "none" });
const sample = (await db.query(prev.sample.sql, prev.sample.values)).rows;
const totals = (await db.query(prev.totals.sql, prev.totals.values)).rows[0];
check("a pré-visualização mostra antes e depois sem alterar nada", sample.length === 2 && Number(sample[0].new_price) === 1100 && (await variants(p2))[0].price === 1000, JSON.stringify(sample));
check("totais de produtos e variações", totals.products === 1 && totals.variants === 2);
check("ações sem preço não têm pré-visualização de preço", pricePreviewStatements([p2], { action: "publish" }) === null);

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
