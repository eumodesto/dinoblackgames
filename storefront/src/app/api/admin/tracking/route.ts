import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { cleanTrackingSettings } from "@/lib/tracking-config";
import { capiTokenConfigured, sendMetaTestEvent } from "@/lib/server/meta-capi";
import { getTrackingSettings, saveTrackingSettings } from "@/lib/server/tracking-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = () => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  return json({ settings: await getTrackingSettings(true), capiTokenSet: capiTokenConfigured() });
});

export const PATCH = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const parsed = cleanTrackingSettings(await readJson(req));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  await saveTrackingSettings(parsed.value);
  return json({ ok: true, settings: parsed.value });
});

export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  if (body.action !== "test-meta") return json({ error: "Ação inválida." }, 400);
  const result = await sendMetaTestEvent();
  return json({ result });
});
