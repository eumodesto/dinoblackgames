import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { cleanMpSettings } from "@/lib/mp-config";
import { checkConnection, loadDashboard, readCredentials, recordConnection, testWebhook } from "@/lib/server/mp-admin";
import { getMpSettings, saveMpSettings } from "@/lib/server/mp-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_PATH = "/api/webhooks/mercadopago";

function webhookUrl(req: Request) {
  const credentials = readCredentials();
  const base = credentials.siteUrl.value || new URL(req.url).origin;
  return `${base}${WEBHOOK_PATH}`;
}

/** Tudo que a tela precisa, sem chamar o Mercado Pago (a conexão é verificada por POST). */
export const GET = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const credentials = readCredentials();
  return json({
    settings: await getMpSettings(),
    credentials,
    webhook: { url: webhookUrl(req), topic: "payment", secretSet: credentials.webhookSecret.set, public: webhookUrl(req).startsWith("https://") },
    dashboard: await loadDashboard(),
  });
});

export const PATCH = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const parsed = cleanMpSettings(await readJson(req));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  await saveMpSettings(parsed.value);
  return json({ ok: true, settings: parsed.value });
});

export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  if (body.action === "check") {
    const connection = await checkConnection();
    await recordConnection(connection);
    return json({ connection });
  }
  if (body.action === "test-webhook") {
    return json({ result: await testWebhook(new URL(req.url).origin) });
  }
  return json({ error: "Ação inválida." }, 400);
});
