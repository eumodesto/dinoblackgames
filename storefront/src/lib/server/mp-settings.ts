import "server-only";
import { MP_DEFAULTS, mergeMpSettings, type MpSettings } from "@/lib/mp-config";
import { getSql } from "./sql";

const KEY = "mercadopago_config";

/** Preferências do Mercado Pago. Sem banco ou sem registro, valem os padrões (Pix, crédito e débito, 10x). */
export async function getMpSettings(): Promise<MpSettings> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>("select value from store_settings where key = $1 limit 1", [KEY]);
    return rows[0] ? mergeMpSettings(rows[0].value) : MP_DEFAULTS;
  } catch {
    return MP_DEFAULTS;
  }
}

export async function saveMpSettings(settings: MpSettings) {
  const sql = await getSql();
  await sql.query(
    "insert into store_settings (key, value, is_public) values ($1, $2::jsonb, false) on conflict (key) do update set value = excluded.value, updated_at = now()",
    [KEY, JSON.stringify(settings)],
  );
}
