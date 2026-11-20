import "server-only";
import { getSql } from "./sql";

const g = globalThis as unknown as { __dinoStatusSupport?: { at: number; value: boolean } };

/**
 * O banco já tem os status novos (migration 20261123000016)? Enquanto não tiver, o painel só oferece os status antigos
 * e o código evita consultar valores de enum que o banco ainda não conhece. O "sim" fica em cache; o "não" é revisto a cada minuto.
 */
export async function extendedStatusesSupported(): Promise<boolean> {
  const cached = g.__dinoStatusSupport;
  if (cached && (cached.value || Date.now() - cached.at < 60_000)) return cached.value;
  let value = false;
  try {
    const sql = await getSql();
    const rows = await sql.query("select 1 as ok from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'order_status' and e.enumlabel = 'payment_failed' limit 1");
    value = rows.length > 0;
  } catch {
    value = false;
  }
  g.__dinoStatusSupport = { at: Date.now(), value };
  return value;
}
