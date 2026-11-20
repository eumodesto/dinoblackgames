import "server-only";
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_KEYS, defaultTemplate, type EmailTemplate, type EmailTemplateKey } from "@/lib/email-templates";
import { env } from "./env";
import { renderBrandedEmail, type EmailItem, type EmailTotals } from "./email-layout";
import { getSql } from "./sql";

export { EMAIL_TEMPLATE_KEYS, type EmailTemplate, type EmailTemplateKey };
export type EmailTemplates = Record<string, EmailTemplate>;
export type EmailConfig = { from: string; replyTo: string; adminRecipients: string[] };

export function defaultEmailTemplates(): EmailTemplates {
  return Object.fromEntries(EMAIL_TEMPLATES.map((m) => [m.key, { ...m.defaults }]));
}

const asText = (value: unknown, fallback: string, max: number) => (typeof value === "string" ? value.slice(0, max) : fallback);

/** Padrões da marca + o que a equipe editou. Campos que faltam no registro salvo (templates antigos) usam o padrão. */
export async function getEmailTemplates(): Promise<EmailTemplates> {
  const result = defaultEmailTemplates();
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>("select value from store_settings where key = $1 limit 1", ["email_templates"]);
    const saved = rows[0]?.value && typeof rows[0].value === "object" ? (rows[0].value as Record<string, Partial<EmailTemplate>>) : {};
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const s = saved[key];
      if (!s) continue;
      const d = result[key];
      // Template salvo antes do modelo novo (sem título): o <h1> do texto antigo passa a ser o título da mensagem.
      let legacyBody = typeof s.body === "string" ? s.body : undefined;
      let legacyTitle: string | undefined;
      if (s.title === undefined && legacyBody) {
        const h1 = /^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/i.exec(legacyBody);
        if (h1) {
          legacyTitle = h1[1].replace(/<[^>]+>/g, "").trim() || undefined;
          legacyBody = legacyBody.slice(h1[0].length);
        }
      }
      result[key] = {
        name: asText(s.name, d.name, 120),
        subject: asText(s.subject, d.subject, 240),
        enabled: typeof s.enabled === "boolean" ? s.enabled : d.enabled,
        title: asText(s.title ?? legacyTitle, d.title, 200),
        body: asText(legacyBody, d.body, 30000),
        buttonLabel: asText(s.buttonLabel, d.buttonLabel, 80),
        buttonUrl: asText(s.buttonUrl, d.buttonUrl, 500),
        showItems: typeof s.showItems === "boolean" ? s.showItems : d.showItems,
      };
    }
  } catch {
    // banco ainda não pronto: usa os padrões
  }
  return result;
}

const parseList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,;]+/) : [])
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));

export async function getEmailConfig(): Promise<EmailConfig> {
  const envAdmins = parseList(process.env.ADMIN_NOTIFY_EMAILS ?? "");
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>("select value from store_settings where key = $1 limit 1", ["email_config"]);
    const saved = rows[0]?.value && typeof rows[0].value === "object" ? (rows[0].value as Record<string, unknown>) : {};
    const admins = parseList(saved.adminRecipients);
    return {
      from: typeof saved.from === "string" ? saved.from : env.resendFromEmail,
      replyTo: typeof saved.replyTo === "string" ? saved.replyTo : env.resendReplyTo,
      adminRecipients: admins.length ? admins : envAdmins,
    };
  } catch {
    return { from: env.resendFromEmail, replyTo: env.resendReplyTo, adminRecipients: envAdmins };
  }
}
export { parseList as parseEmailList };

function interpolate(value: string, variables: Record<string, unknown>, escape: boolean) {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const raw = String(variables[key] ?? "");
    return escape ? esc(raw) : raw;
  });
}

export type RenderInput = { variables?: Record<string, unknown>; items?: EmailItem[]; totals?: EmailTotals; template?: EmailTemplate };

/** Gera assunto e HTML de um template (o rascunho do editor pode ser passado em `template` para pré-visualizar). */
export async function renderEmail(key: EmailTemplateKey, input: RenderInput = {}): Promise<{ subject: string; html: string; template: EmailTemplate }> {
  const template = input.template ?? (await getEmailTemplates())[key] ?? defaultTemplate(key);
  if (!template) throw new Error(`Template desconhecido: ${key}`);
  const variables = { site_url: env.siteUrl, admin_login_url: `${env.siteUrl}/admin-login`, ...input.variables };
  const subject = interpolate(template.subject, variables, false).replace(/[\r\n]+/g, " ").trim();
  const title = interpolate(template.title, variables, true);
  const html = renderBrandedEmail({
    title,
    bodyHtml: interpolate(template.body, variables, true),
    button: template.buttonLabel ? { label: interpolate(template.buttonLabel, variables, false), url: interpolate(template.buttonUrl, variables, false) } : undefined,
    items: template.showItems ? input.items : undefined,
    totals: template.showItems ? input.totals : undefined,
    preheader: subject,
    siteUrl: env.siteUrl,
  });
  return { subject, html, template };
}

async function deliver(to: string[], subject: string, html: string, config: EmailConfig) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to, subject, html, ...(config.replyTo ? { reply_to: config.replyTo } : {}) }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Resend retornou HTTP ${response.status}.`);
}

/** Envia um template para um destinatário (cliente ou usuário do painel). */
export async function sendTransactionalEmail(input: { to: string; template: EmailTemplateKey; variables?: Record<string, unknown>; items?: EmailItem[]; totals?: EmailTotals }) {
  const config = await getEmailConfig();
  if (!env.resendApiKey || !config.from) return { sent: false, reason: "not_configured" as const };
  const { subject, html, template } = await renderEmail(input.template, { variables: input.variables, items: input.items, totals: input.totals });
  if (!template.enabled) return { sent: false, reason: "disabled" as const };
  await deliver([input.to], subject, html, config);
  return { sent: true as const };
}

/** Envia um template para toda a equipe cadastrada em Integrações → Resend. */
export async function sendAdminEmail(input: { template: EmailTemplateKey; variables?: Record<string, unknown>; items?: EmailItem[]; totals?: EmailTotals }) {
  const config = await getEmailConfig();
  if (!env.resendApiKey || !config.from) return { sent: false, reason: "not_configured" as const };
  if (config.adminRecipients.length === 0) return { sent: false, reason: "no_recipients" as const };
  const { subject, html, template } = await renderEmail(input.template, { variables: input.variables, items: input.items, totals: input.totals });
  if (!template.enabled) return { sent: false, reason: "disabled" as const };
  await deliver(config.adminRecipients, subject, html, config);
  return { sent: true as const };
}

export async function resendConfigured() {
  const config = await getEmailConfig();
  return Boolean(env.resendApiKey && config.from);
}

/** Dados de exemplo para pré-visualização e e-mails de teste. */
export function sampleEmailData(): { variables: Record<string, string>; items: EmailItem[]; totals: EmailTotals } {
  return {
    variables: {
      name: "Cliente de Teste", order_number: "DB-1234", total: "R$ 7.549,90", status: "Pagamento aprovado", tracking_code: "BR123456789XX",
      payment_method: "Pix", customer_email: "cliente@exemplo.com", reason: "Produto chegou com defeito", pending_minutes: "15", product_name: "Console PlayStation 5 Pro",
      order_url: `${env.siteUrl}/checkout/confirmacao/DB-1234`, admin_url: `${env.siteUrl}/admin/pedidos`, role: "Gerente de Loja", staff_email: "novo.usuario@exemplo.com",
      temp_password: "Dino-7Hq2-Xk9m", permissions: "Pedidos, Produtos, Cupons",
    },
    items: [
      { name: "Console PlayStation 5 Pro Sem Leitor de Disco", image: null, qty: 1, unitPrice: 7399.9, options: "Branco · 2 TB" },
      { name: "Controle sem Fio Xbox Pulse Red", image: null, qty: 1, unitPrice: 149.99 },
    ],
    totals: { subtotal: 7549.89, discount: 0, shipping: 0, total: 7549.89 },
  };
}
