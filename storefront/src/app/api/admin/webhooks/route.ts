import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { scanPendingWebhooks } from "@/lib/server/notify";
import { getWebhooksConfig, listDeliveries, maskSecret, regenerateSecret, retryFailedDeliveries, saveWebhooksConfig, sendTestWebhook } from "@/lib/server/webhooks";
import { EVENT_INFO, STORE_EVENTS } from "@/lib/store-events";
import { cleanWebhooksInput, PAY_WINDOW_MINUTES, PENDING_MAX, PENDING_MIN } from "@/lib/webhooks-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowLocal = () => process.env.NODE_ENV !== "production";

async function view(req: Request) {
  const config = await getWebhooksConfig();
  const base = env.siteUrl || new URL(req.url).origin;
  return {
    pendingAfterMinutes: config.pendingAfterMinutes,
    // O segredo inteiro só aparece quando é criado ou renovado.
    endpoints: config.endpoints.map(({ secret, ...e }) => ({ ...e, secretHint: maskSecret(secret) })),
    deliveries: await listDeliveries(25),
    events: STORE_EVENTS.map((key) => ({ key, ...EVENT_INFO[key] })),
    limits: { pendingMin: PENDING_MIN, pendingMax: PENDING_MAX, payWindow: PAY_WINDOW_MINUTES },
    cron: { urls: [`${base}/api/cron/webhooks`], secretSet: Boolean(env.cronSecret) },
    allowLocal: allowLocal(),
  };
}

export const GET = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  return json(await view(req));
});

export const PATCH = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const parsed = cleanWebhooksInput(await readJson(req), allowLocal());
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { config, created } = await saveWebhooksConfig(parsed.value);
  const newSecrets = Object.fromEntries(created.map((id) => [id, config.endpoints.find((e) => e.id === id)?.secret ?? ""]));
  return json({ ...(await view(req)), newSecrets });
});

export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  const id = typeof body.id === "string" ? body.id : "";
  if (body.action === "test") {
    const result = await sendTestWebhook(
      { id: id || undefined, url: typeof body.url === "string" ? body.url : undefined, includeCustomer: typeof body.includeCustomer === "boolean" ? body.includeCustomer : undefined },
      allowLocal(),
    );
    if ("error" in result) return json({ error: result.error }, 400);
    return json({ result, deliveries: await listDeliveries(25) });
  }
  if (body.action === "regenerate") {
    const secret = await regenerateSecret(id);
    return secret ? json({ secret }) : json({ error: "Destino não encontrado." }, 404);
  }
  if (body.action === "scan") {
    const pending = await scanPendingWebhooks();
    const retried = await retryFailedDeliveries();
    return json({ pending, retried, deliveries: await listDeliveries(25) });
  }
  return json({ error: "Ação inválida." }, 400);
});
