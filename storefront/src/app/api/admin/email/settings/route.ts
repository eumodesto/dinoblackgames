import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_KEYS, EMAIL_VARIABLES, type EmailTemplate } from "@/lib/email-templates";
import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getEmailConfig, getEmailTemplates, parseEmailList, renderEmail, resendConfigured, sampleEmailData, sendTransactionalEmail } from "@/lib/server/email";
import { getSql } from "@/lib/server/sql";

export const dynamic = "force-dynamic";

const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : null);

function cleanTemplates(input: unknown): Record<string, EmailTemplate> | null {
  if (!input || typeof input !== "object") return null;
  const result: Record<string, EmailTemplate> = {};
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const candidate = (input as Record<string, unknown>)[key];
    if (candidate === undefined) continue;
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Record<string, unknown>;
    const name = str(item.name, 120);
    const subject = str(item.subject, 240);
    const title = str(item.title, 200);
    const body = str(item.body, 30000);
    const buttonLabel = str(item.buttonLabel, 80);
    const buttonUrl = str(item.buttonUrl, 500);
    if (name === null || subject === null || title === null || body === null || buttonLabel === null || buttonUrl === null || typeof item.enabled !== "boolean" || typeof item.showItems !== "boolean") return null;
    if (!subject.trim()) return null;
    // O botão só leva a http(s), e-mail ou telefone (ou a uma variável): nada de javascript:.
    if (buttonUrl && !/^(\{\{|https?:|mailto:|tel:)/i.test(buttonUrl.trim())) return null;
    result[key] = { name: name.trim(), subject: subject.trim(), title: title.trim(), body, buttonLabel: buttonLabel.trim(), buttonUrl: buttonUrl.trim(), enabled: item.enabled, showItems: item.showItems };
  }
  return result;
}

const upsert = (sql: Awaited<ReturnType<typeof getSql>>, key: string, value: unknown) =>
  sql.query("insert into store_settings (key, value, is_public) values ($1, $2::jsonb, false) on conflict (key) do update set value = excluded.value, updated_at = now()", [key, JSON.stringify(value)]);

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
    adminRecipients: config.adminRecipients,
    templates: await getEmailTemplates(),
    meta: EMAIL_TEMPLATES.map(({ key, audience, label, when, defaults }) => ({ key, audience, label, when, defaults })),
    variables: EMAIL_VARIABLES,
  });
});

export const PATCH = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  // Templates e remetente são salvos em telas diferentes: cada um só muda quando vem na requisição.
  const hasTemplates = body.templates !== undefined;
  const hasSender = body.from !== undefined || body.replyTo !== undefined || body.adminRecipients !== undefined;
  if (!hasTemplates && !hasSender) return json({ error: "Nada para salvar." }, 400);
  const templates = hasTemplates ? cleanTemplates(body.templates) : null;
  if (hasTemplates && !templates) return json({ error: "Template inválido: confira assunto, título, texto e o link do botão." }, 400);
  const current = await getEmailConfig();
  const from = typeof body.from === "string" ? body.from.trim() : current.from;
  const replyTo = typeof body.replyTo === "string" ? body.replyTo.trim() : current.replyTo;
  if (from.length > 240 || replyTo.length > 240) return json({ error: "E-mails de remetente inválidos." }, 400);
  let adminRecipients = current.adminRecipients;
  if (body.adminRecipients !== undefined) {
    adminRecipients = parseEmailList(body.adminRecipients);
    const typed = typeof body.adminRecipients === "string" ? body.adminRecipients.split(/[\s,;]+/).filter(Boolean).length : Array.isArray(body.adminRecipients) ? body.adminRecipients.length : 0;
    if (adminRecipients.length !== typed) return json({ error: "Há e-mails da equipe em formato inválido." }, 400);
    if (adminRecipients.length > 20) return json({ error: "No máximo 20 e-mails da equipe." }, 400);
  }
  const sql = await getSql();
  if (templates) {
    // Mantém o que não veio na requisição (templates novos ainda não editados ficam com o padrão).
    const saved = await sql.query<{ value: Record<string, unknown> | null }>("select value from store_settings where key = $1 limit 1", ["email_templates"]);
    await upsert(sql, "email_templates", { ...(saved[0]?.value ?? {}), ...templates });
  }
  if (hasSender) await upsert(sql, "email_config", { from, replyTo, adminRecipients });
  const configured = await resendConfigured();
  await sql.query(
    "update integrations set provider = $1, status = $2::integration_status, last_checked_at = now(), notes = $3 where domain = $4",
    ["resend", configured ? "active" : "not_configured", `Remetente configurado: ${from ? "sim" : "não"}. A chave permanece fora do banco.`, "email"],
  );
  return json({ ok: true, ...(templates ? { templates: await getEmailTemplates() } : {}), from, replyTo, adminRecipients, configured });
});

export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  const key = typeof body.template === "string" && EMAIL_TEMPLATE_KEYS.includes(body.template) ? body.template : null;
  if (!key) return json({ error: "Escolha um template válido." }, 400);
  const sample = sampleEmailData();

  if (body.action === "preview") {
    const draft = body.draft ? cleanTemplates({ [key]: body.draft })?.[key] : undefined;
    if (body.draft && !draft) return json({ error: "Rascunho inválido." }, 400);
    const { subject, html } = await renderEmail(key, { ...sample, template: draft });
    return json({ subject, html });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !to.includes("@")) return json({ error: "Informe um e-mail de destino válido." }, 400);
  const result = await sendTransactionalEmail({ to, template: key, ...sample });
  if (!result.sent && result.reason === "disabled") return json({ error: "Este template está desativado. Ative-o para enviar o teste." }, 409);
  if (!result.sent) return json({ error: "O Resend ainda não está configurado no ambiente da aplicação.", reason: result.reason }, 503);
  return json({ ok: true, message: "E-mail de teste enviado." });
});
