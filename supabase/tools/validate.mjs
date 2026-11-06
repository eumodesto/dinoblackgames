// Valida migrations + seed + RLS + regras de estoque/pedido num Postgres local (PGlite).
// Não toca em nenhum banco remoto. Uso: npm install && npm run validate
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite({ extensions: { pgcrypto } });

let passed = 0;
let failed = 0;
const failures = [];

export function check(name, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL ${name} ${detail}`);
  }
}

// Simula o ambiente do Supabase: papéis, schema auth e auth.uid().
await db.exec(`
  create extension if not exists pgcrypto;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    encrypted_password text,
    email_confirmed_at timestamptz,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

console.log("\n== Migrations ==");
const migDir = join(root, "migrations");
for (const file of readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) {
  try {
    await db.exec(readFileSync(join(migDir, file), "utf8"));
    check(file, true);
  } catch (e) {
    check(file, false, `\n       ${e.message}`);
    process.exit(1);
  }
}

// Executa como um papel/usuário (RLS) e volta ao superusuário.
export async function asUser(role, userId, fn) {
  await db.exec(`set role ${role}`);
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ""}', false)`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];

const seedFile = join(root, "seed.sql");
if (existsSync(seedFile)) {
  console.log("\n== Seed ==");
  try {
    await db.exec(readFileSync(seedFile, "utf8"));
    check("seed.sql executa sem erro", true);
  } catch (e) {
    check("seed.sql executa sem erro", false, `\n       ${e.message}`);
    process.exit(1);
  }
  const suite = join(root, "tools", "tests.mjs");
  if (existsSync(suite)) {
    console.log("\n== Testes ==");
    const mod = await import(pathToFileURL(suite).href);
    try {
      await mod.run({ db, q, one, check, asUser });
      const checkout = join(root, "tools", "tests-checkout.mjs");
      if (existsSync(checkout)) await (await import(pathToFileURL(checkout).href)).run({ db, q, one, check, asUser });
    } catch (e) {
      const where = String(e.where ?? "").split("\n").slice(-2).join(" | ");
      check("a suíte terminou sem erro inesperado", false, `\n       ${e.message}\n       ${where}`);
    }
  }
}

console.log(`\n${passed} verificações ok, ${failed} falhas`);
if (failed) {
  console.log("Falhas:", failures.join("; "));
  process.exit(1);
}
