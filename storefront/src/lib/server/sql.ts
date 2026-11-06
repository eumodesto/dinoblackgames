import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "./env";

/** Interface mínima de SQL. O checkout só usa isto, então serve para Postgres real e para o banco local. */
export type Sql = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export class DbNotConfiguredError extends Error {
  constructor() {
    super("Banco de dados não configurado (defina DATABASE_URL, ou CHECKOUT_DB=local para desenvolvimento).");
    this.name = "DbNotConfiguredError";
  }
}

const g = globalThis as unknown as { __dinoSql?: Promise<Sql> };

/** Postgres do Supabase (produção ou teste na nuvem). Conexão do servidor, com permissão de service role. */
async function connectPostgres(url: string): Promise<Sql> {
  const { default: postgres } = await import("postgres");
  // prepare: false é necessário no pooler em modo transação do Supabase.
  const client = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await client.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
  };
}

/**
 * Banco local: Postgres em memória (PGlite) com as migrations e o seed de supabase/.
 * Só para desenvolvimento e testes. Dados somem ao reiniciar o servidor.
 */
async function connectLocal(): Promise<Sql> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
  const db = new PGlite({ extensions: { pgcrypto } });

  const root = join(process.cwd(), "..", "supabase");
  await db.exec(`
    create extension if not exists pgcrypto;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(), email text,
      raw_user_meta_data jsonb default '{}'::jsonb, encrypted_password text,
      email_confirmed_at timestamptz, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  const migrations = join(root, "migrations");
  for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(migrations, file), "utf8"));
  }
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));

  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await db.query(text, params);
      return res.rows as T[];
    },
  };
}

export function getSql(): Promise<Sql> {
  if (!g.__dinoSql) {
    if (env.databaseUrl) g.__dinoSql = connectPostgres(env.databaseUrl);
    else if (env.localDb) g.__dinoSql = connectLocal();
    else return Promise.reject(new DbNotConfiguredError());
    // Se a conexão falhar, não guardar a falha para sempre.
    g.__dinoSql.catch(() => {
      g.__dinoSql = undefined;
    });
  }
  return g.__dinoSql;
}
