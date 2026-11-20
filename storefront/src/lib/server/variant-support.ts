import "server-only";
import { getSql } from "./sql";

const g = globalThis as unknown as { __dinoVariantSupport?: { at: number; value: boolean } };

/**
 * O banco já tem preço do Pix e imagem por variação (migration 20261125000018)? Enquanto não tiver, o painel esconde
 * esses campos e as consultas não pedem as colunas novas, então a loja continua funcionando como antes.
 * O "sim" fica em cache; o "não" é revisto a cada minuto.
 */
export async function variantExtrasSupported(): Promise<boolean> {
  const cached = g.__dinoVariantSupport;
  if (cached && (cached.value || Date.now() - cached.at < 60_000)) return cached.value;
  let value = false;
  try {
    const sql = await getSql();
    const rows = await sql.query("select 1 as ok from information_schema.columns where table_schema = 'public' and table_name = 'product_variants' and column_name = 'cash_price' limit 1");
    value = rows.length > 0;
  } catch {
    value = false;
  }
  g.__dinoVariantSupport = { at: Date.now(), value };
  return value;
}
