// Gera docs/Dicionario_de_Dados.md a partir do banco real (migrations aplicadas num Postgres local).
// Uso: npm run docs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite({ extensions: { pgcrypto } });

await db.exec(`
  create extension if not exists pgcrypto;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`);
for (const f of readdirSync(join(root, "migrations")).filter((x) => x.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(join(root, "migrations", f), "utf8"));
}

const MODULES = [
  ["Usuários e acesso", ["profiles", "user_roles", "addresses"]],
  ["Catálogo", ["categories", "collections", "collection_products", "products", "product_media", "product_facets", "product_options", "product_option_values", "product_variants", "kits", "kit_components"]],
  ["Estoque", ["stock_locations", "inventory_levels", "inventory_units", "inventory_movements"]],
  ["Carrinho, pedido, pagamento e envio", ["carts", "cart_items", "orders", "order_items", "order_events", "payments", "shipments", "return_requests"]],
  ["Promoções e cupons", ["promotions", "promotion_products", "coupons", "coupon_redemptions"]],
  ["Venda de usados", ["used_requests", "used_request_photos", "used_offers", "used_request_events"]],
  ["Conteúdo da loja", ["banners", "pages", "nav_items", "redirects", "store_settings"]],
  ["Relacionamento, privacidade e suporte", ["consents", "privacy_requests", "contact_messages", "back_in_stock_alerts", "product_reviews"]],
  ["Operação, integrações e auditoria", ["integrations", "integration_events", "admin_notifications", "audit_log", "analytics_events"]],
];

const cols = (await db.query(`
  select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default, c.character_maximum_length, c.numeric_precision, c.numeric_scale
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name in (select tablename from pg_tables where schemaname = 'public')
  order by c.table_name, c.ordinal_position`)).rows;
const pks = (await db.query(`
  select tc.table_name, kcu.column_name from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
  where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'`)).rows;
const fks = (await db.query(`
  select cl.relname as table_name, a.attname as column_name, cf.relname as ref_table
  from pg_constraint con
  join pg_class cl on cl.oid = con.conrelid
  join pg_class cf on cf.oid = con.confrelid
  join pg_namespace n on n.oid = cl.relnamespace
  join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
  where con.contype = 'f' and n.nspname = 'public'`)).rows;
const views = (await db.query(`select viewname from pg_views where schemaname = 'public' order by viewname`)).rows;
const funcs = (await db.query(`select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') order by proname`)).rows;
const rls = (await db.query(`select tablename, count(*)::int as n from pg_policies where schemaname = 'public' group by tablename`)).rows;
const rlsBy = Object.fromEntries(rls.map((r) => [r.tablename, r.n]));

const typeOf = (c) => {
  if (c.data_type === "USER-DEFINED") return c.udt_name;
  if (c.data_type === "character varying") return `varchar(${c.character_maximum_length})`;
  if (c.data_type === "numeric") return `numeric(${c.numeric_precision},${c.numeric_scale})`;
  if (c.data_type === "timestamp with time zone") return "timestamptz";
  if (c.data_type === "ARRAY") return `${c.udt_name.replace(/^_/, "")}[]`;
  return c.data_type;
};

const tableCount = new Set(cols.map((c) => c.table_name)).size;
let md = `# Dicionário de dados

> **Gerado automaticamente** por \`supabase/tools/build-dictionary.mjs\` a partir das migrations em \`supabase/migrations/\`. Não edite à mão: altere a migration e rode \`npm run docs\` em \`supabase/tools\`.

- **${tableCount} tabelas**, ${views.length} views, ${funcs.length} funções, ${rls.reduce((s, r) => s + r.n, 0)} políticas de RLS (todas as tabelas com RLS ligado).
- Colunas marcadas com **PK** são chave primária; **→ tabela** indica chave estrangeira.
- Para o mapa de telas, perfis e jornadas que usam estas tabelas, veja [Mapeamento_Telas_e_Dados.md](./Mapeamento_Telas_e_Dados.md).

**Views:** ${views.map((v) => `\`${v.viewname}\``).join(", ")}
**Funções:** ${funcs.map((f) => `\`${f.proname}\``).join(", ")}
`;

for (const [title, tables] of MODULES) {
  md += `\n## ${title}\n`;
  for (const t of tables) {
    const tcols = cols.filter((c) => c.table_name === t);
    if (!tcols.length) throw new Error(`tabela ${t} não existe`);
    md += `\n### \`${t}\`  _(${rlsBy[t] ?? 0} políticas RLS)_\n\n| Coluna | Tipo | Nulo | Padrão | Chave |\n| --- | --- | :-: | --- | --- |\n`;
    for (const c of tcols) {
      const isPk = pks.some((p) => p.table_name === t && p.column_name === c.column_name);
      const fk = fks.find((f) => f.table_name === t && f.column_name === c.column_name);
      const def = c.column_default ? `\`${String(c.column_default).replace(/\|/g, "\\|").slice(0, 48)}\`` : "";
      md += `| ${c.column_name} | ${typeOf(c)} | ${c.is_nullable === "YES" ? "sim" : "não"} | ${def} | ${[isPk ? "PK" : "", fk ? `→ ${fk.ref_table}` : ""].filter(Boolean).join(" ")} |\n`;
    }
  }
}

const listed = new Set(MODULES.flatMap(([, t]) => t));
const missing = [...new Set(cols.map((c) => c.table_name))].filter((t) => !listed.has(t));
if (missing.length) throw new Error(`tabelas fora do dicionário: ${missing.join(", ")}`);

writeFileSync(join(root, "..", "docs", "Dicionario_de_Dados.md"), md, "utf8");
console.log(`Dicionario_de_Dados.md gerado: ${tableCount} tabelas.`);
