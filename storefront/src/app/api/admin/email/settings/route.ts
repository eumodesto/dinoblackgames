import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getEmailConfig, getEmailTemplates, resendConfigured, sendTransactionalEmail, EMAIL_TEMPLATE_KEYS, type EmailTemplate, type EmailTemplateKey } from "@/lib/server/email";
import { getSql } from "@/lib/server/sql";

function isTemplateKey(value: unknown): value is EmailTemplateKey {
  return typeof value === "string" && (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

function cleanTemplates(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const result: Partial<Record<EmailTemplateKey, EmailTemplate>> = {};
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const candidate = (input as Record<string, unknown>)[key];
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (typeof item.name !== "string" || typeof item.subject !== "string" || typeof item.body !== "string" || typeof item.enabled !== "boolean") return null;
    result[key] = {
      name: item.name.trim().slice(0, 120),
      subject: item.subject.trim().slice(0, 240),
      body: item.body.slice(0, 30000),
      enabled: item.enabled,
    };
  }
  return result;
}

export const GET = () => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const sql = await getSql();
  const config = await getEmailConfig();
  const rows = await sql.query<{ provider: string | null; status: string; last_checked_at: string | null; notes: string | null }>(
    "select provider, status, last_checked_at, notes from integrations where domain = $1 limit 1",
    ["email"],
  );
  return json({
    integration: rows[0] ?? { provider: "resend", status: "not_configured", last_checked_at: null, notes: null },
    configured: await resendConfigured(),
    from: config.from,
    replyTo: config.replyTo,
    templates: await getEmailTemplates(),
  });
});

export const PATCH = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  const templates = cleanTemplates(body.templates);
  if (!templates) return json({ error: "Templates inválidos." }, 400);
  const from = typeof body.from === "string" ? body.from.trim() : "";
  const replyTo = typeof body.replyTo === "string" ? body.replyTo.trim() : "";
  if (from.length > 240 || replyTo.length > 240) return json({ error: "E-mails de remetente inválidos." }, 400);
  const sql = await getSql();
  await sql.query(
    "insert into store_settings (key, value, is_public) values ($1, $2::jsonb, false) on conflict (key) do update set value = excluded.value, updated_at = now()",
    ["email_templates", JSON.stringify(templates)],
  );
  await sql.query(
    "insert into store_settings (key, value, is_public) values ($1, $2::jsonb, false) on conflict (key) do update set value = excluded.value, updated_at = now()",
    ["email_config", JSON.stringify({ from, replyTo })],
  );
  const configured = await resendConfigured();
  await sql.query(
    "update integrations set provider = $1, status = $2::integration_status, last_checked_at = now(), notes = $3 where domain = $4",
    ["resend", configured ? "active" : "not_configured", `Remetente configurado: ${from ? "sim" : "não"}. A chave permanece fora do banco.`, "email"],
  );
  return json({ ok: true, templates, from, replyTo, configured });
});

export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const template = body.template;
  if (!to || !to.includes("@") || !isTemplateKey(template)) return json({ error: "Informe um destinatário e um template válidos." }, 400);
  const result = await sendTransactionalEmail({ to, template, variables: { name: "Cliente de teste", order_number: "DB-TESTE", total: "R$ 0,00", tracking_code: "A CONFIGURAR", product_name: "Produto de teste" } });
  if (!result.sent) return json({ error: "O Resend ainda não está configurado no ambiente da aplicação.", reason: result.reason }, 503);
  return json({ ok: true, message: "E-mail de teste enviado." });
});
