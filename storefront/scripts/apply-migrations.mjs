// Aplica as migrations de supabase/migrations/ num Postgres (Supabase), sem precisar do psql.
//
// Uso (PowerShell), com a string de conexão só nesta sessão do terminal:
//   $env:DATABASE_URL = "postgresql://postgres.xxxx:SENHA@aws-0-regiao.pooler.supabase.com:5432/postgres"
//   node scripts/apply-migrations.mjs --dry     (só lista o que faria)
//   node scripts/apply-migrations.mjs           (aplica)
//
// - Cada arquivo roda em uma transação: se der erro, nada daquele arquivo fica aplicado e o script para.
// - Registra a versão em supabase_migrations.schema_migrations (a mesma tabela da CLI do Supabase),
//   então rodar de novo pula o que já foi aplicado.
// - NÃO roda o seed. Nunca rode o seed padrão em banco acessível pela internet (ver supabase/README.md).
// - Prefira a conexão direta ou o pooler em modo SESSÃO (porta 5432) para migrations.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const dry = process.argv.includes("--dry");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Defina DATABASE_URL antes (ex.: $env:DATABASE_URL = "postgresql://...").');
  process.exit(1);
}

let host;
try {
  host = new URL(url).host;
} catch {
  console.error("DATABASE_URL não é uma URL válida. Troque o <URL>/placeholder pela string real do Supabase.");
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Banco: ${host}`);
console.log(`Migrations encontradas: ${files.length}`);

const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
const sql = postgres(url, { max: 1, prepare: false, ssl: isLocal ? false : "require", onnotice: () => {} });

try {
  await sql`select 1`;
  await sql.unsafe(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key, statements text[], name text
    );
  `);
  const done = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version));

  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    const name = rest.join("_");
    if (done.has(version)) {
      console.log(`  já aplicada  ${file}`);
      continue;
    }
    if (dry) {
      console.log(`  aplicaria    ${file}`);
      continue;
    }
    const text = readFileSync(join(dir, file), "utf8");
    process.stdout.write(`  aplicando    ${file} ... `);
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into supabase_migrations.schema_migrations (version, name) values (${version}, ${name})`;
    });
    console.log("ok");
  }
  console.log(dry ? "Simulação concluída (nada foi alterado)." : "Concluído.");
} catch (err) {
  console.log("ERRO");
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
