import "server-only";
import { TRACKING_DEFAULTS, mergeTrackingSettings, toPublicTracking, type PublicTracking, type TrackingSettings } from "@/lib/tracking-config";
import { getSql } from "./sql";

const KEY = "tracking_config";
const TTL_MS = 60_000;

const g = globalThis as unknown as { __dinoTracking?: { at: number; value: TrackingSettings } };

/** Lê as integrações salvas, com cache curto: o layout de toda página passa por aqui. Sem banco, tudo desligado. */
export async function getTrackingSettings(force = false): Promise<TrackingSettings> {
  const cached = g.__dinoTracking;
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.value;
  let value = TRACKING_DEFAULTS;
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>("select value from store_settings where key = $1 limit 1", [KEY]);
    if (rows[0]) value = mergeTrackingSettings(rows[0].value);
  } catch {
    // banco ainda não pronto: nada de rastreamento de terceiros
  }
  g.__dinoTracking = { at: Date.now(), value };
  return value;
}

export async function getPublicTracking(): Promise<PublicTracking> {
  return toPublicTracking(await getTrackingSettings());
}

export async function saveTrackingSettings(settings: TrackingSettings) {
  const sql = await getSql();
  await sql.query(
    "insert into store_settings (key, value, is_public) values ($1, $2::jsonb, false) on conflict (key) do update set value = excluded.value, updated_at = now()",
    [KEY, JSON.stringify(settings)],
  );
  g.__dinoTracking = { at: Date.now(), value: settings };
}
