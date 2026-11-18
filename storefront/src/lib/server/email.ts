import "server-only";
import { env } from "./env";
import { getSql } from "./sql";

export const EMAIL_TEMPLATE_KEYS = [
  "account_created",
  "order_created",
  "order_paid",
  "order_shipped",
  "order_delivered",
  "used_request_received",
  "back_in_stock",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];
export type EmailTemplate = { name: string; subject: string; enabled: boolean; body: string };
export type EmailTemplates = Record<EmailTemplateKey, EmailTemplate>;
export type EmailConfig = { from: string; replyTo: string };

const DEFAULT_TEMPLATES: EmailTemplates = {
  account_created: { name: "Nova conta", subject: "Bem-vindo à DinoBlack Games, {{name}}!", enabled: true, body: "<h1>Bem-vindo, {{name}}!</h1><p>Sua conta foi criada com sucesso.</p>" },
  order_created: { name: "Nova compra", subject: "Pedido {{order_number}} recebido", enabled: true, body: "<h1>Pedido recebido</h1><p>Olá, {{name}}. Recebemos o pedido <strong>{{order_number}}</strong>.</p>" },
  order_paid: { name: "Pagamento confirmado", subject: "Pagamento confirmado — pedido {{order_number}}", enabled: true, body: "<h1>Pagamento confirmado</h1><p>O pagamento do pedido <strong>{{order_number}}</strong> foi confirmado.</p>" },
  order_shipped: { name: "Pedido enviado", subject: "Seu pedido {{order_number}} foi enviado", enabled: true, body: "<h1>Pedido enviado</h1><p>O pedido <strong>{{order_number}}</strong> está a caminho.</p>" },
  order_delivered: { name: "Pedido entregue", subject: "Pedido {{order_number}} entregue", enabled: true, body: "<h1>Pedido entregue</h1><p>Seu pedido foi entregue.</p>" },
  used_request_received: { name: "Solicitação de avaliação recebida", subject: "Recebemos sua solicitação de troca", enabled: true, body: "<h1>Solicitação recebida</h1><p>Recebemos os dados do item para avaliação.</p>" },
  back_in_stock: { name: "Produto disponível novamente", subject: "{{product_name}} voltou ao estoque", enabled: true, body: "<h1>Boa notícia!</h1><p><strong>{{product_name}}</strong> está disponível novamente.</p>" },
};

export function defaultEmailTemplates(): EmailTemplates {
  return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)) as EmailTemplates;
}

export async function getEmailTemplates(): Promise<EmailTemplates> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>("select value from store_settings where key = $1 limit 1", ["email_templates"]);
    const saved = rows[0]?.value && typeof rows[0].value === "object" ? rows[0].value as Record<string, Partial<EmailTemplate>> : {};
    const result = defaultEmailTemplates();
    for (const key of EMAIL_TEMPLATE_KEYS) result[key] = { ...result[key], ...(saved[key] ?? {}) };
    return result;
  } catch {
    return defaultEmailTemplates();
  }
}

export async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>("select value from store_settings where key = $1 limit 1", ["email_config"]);
    const saved = rows[0]?.value && typeof rows[0].value === "object" ? rows[0].value as Record<string, unknown> : {};
    return { from: typeof saved.from === "string" ? saved.from : env.resendFromEmail, replyTo: typeof saved.replyTo === "string" ? saved.replyTo : env.resendReplyTo };
  } catch {
    return { from: env.resendFromEmail, replyTo: env.resendReplyTo };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function interpolate(value: string, variables: Record<string, unknown>) {
  return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => escapeHtml(String(variables[key] ?? "")));
}

export async function sendTransactionalEmail(input: {
  to: string;
  template: EmailTemplateKey;
  variables?: Record<string, unknown>;
}) {
  const config = await getEmailConfig();
  if (!env.resendApiKey || !config.from) return { sent: false, reason: "not_configured" as const };
  const templates = await getEmailTemplates();
  const selected = templates[input.template];
  if (!selected.enabled) return { sent: false, reason: "disabled" as const };
  const variables = { site_url: env.siteUrl, ...input.variables };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.from,
      to: [input.to],
      subject: interpolate(selected.subject, variables),
      html: interpolate(selected.body, variables),
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Resend retornou HTTP ${response.status}.`);
  return { sent: true as const };
}

export async function resendConfigured() {
  const config = await getEmailConfig();
  return Boolean(env.resendApiKey && config.from);
}
