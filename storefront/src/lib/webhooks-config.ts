import { PAY_WINDOW_MINUTES } from "./email-templates";
import { STORE_EVENTS, isStoreEvent, type StoreEvent } from "./store-events";

/** O pedido vence aos 30 minutos sem pagamento; o aviso de "pendente" precisa vir antes disso. */
export { PAY_WINDOW_MINUTES };
export const PENDING_MIN = 1;
export const PENDING_MAX = PAY_WINDOW_MINUTES - 1;
export const PENDING_DEFAULT = 15;
export const MAX_ENDPOINTS = 10;

export type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: StoreEvent[];
  active: boolean;
  /** Inclui nome, e-mail e telefone do cliente no corpo do evento. */
  includeCustomer: boolean;
};
export type WebhooksConfig = { endpoints: WebhookEndpoint[]; pendingAfterMinutes: number };

export const WEBHOOKS_DEFAULTS: WebhooksConfig = { endpoints: [], pendingAfterMinutes: PENDING_DEFAULT };

/**
 * Valida o endereço de destino. Só https (http apenas em localhost durante o desenvolvimento) e nada de
 * endereços internos: o servidor da loja chama esta URL, então ela não pode apontar para a rede privada.
 */
export function checkWebhookUrl(raw: string, allowLocal: boolean): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Endereço inválido. Use algo como https://seu-servidor.com/webhook.";
  }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (local) return allowLocal ? null : "Endereços locais (localhost) só funcionam em desenvolvimento.";
  if (url.protocol !== "https:") return "O endereço precisa começar com https://.";
  if (url.username || url.password) return "Não coloque usuário e senha no endereço.";
  const privateV4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host);
  if (privateV4 || host.startsWith("[") || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) {
    return "Endereços da rede interna não são aceitos.";
  }
  return null;
}

/** Normaliza o que vem do formulário; os segredos existentes são mantidos pelo servidor. */
export type CleanEndpoint = Omit<WebhookEndpoint, "secret">;

export function cleanWebhooksInput(input: unknown, allowLocal: boolean): { ok: true; value: { endpoints: CleanEndpoint[]; pendingAfterMinutes: number } } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Configuração inválida." };
  const body = input as { endpoints?: unknown; pendingAfterMinutes?: unknown };
  const minutes = Number(body.pendingAfterMinutes);
  if (!Number.isInteger(minutes) || minutes < PENDING_MIN || minutes > PENDING_MAX) {
    return { ok: false, error: `O tempo do aviso de pendente deve ficar entre ${PENDING_MIN} e ${PENDING_MAX} minutos (o pedido vence aos ${PAY_WINDOW_MINUTES}).` };
  }
  const list = Array.isArray(body.endpoints) ? body.endpoints : [];
  if (list.length > MAX_ENDPOINTS) return { ok: false, error: `No máximo ${MAX_ENDPOINTS} destinos.` };
  const endpoints: CleanEndpoint[] = [];
  for (const raw of list) {
    const e = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name.trim().slice(0, 80) : "";
    const url = typeof e.url === "string" ? e.url.trim().slice(0, 500) : "";
    if (!name) return { ok: false, error: "Dê um nome a cada destino." };
    const urlError = checkWebhookUrl(url, allowLocal);
    if (urlError) return { ok: false, error: `${name}: ${urlError}` };
    const events = (Array.isArray(e.events) ? e.events : []).filter(isStoreEvent);
    if (events.length === 0) return { ok: false, error: `${name}: escolha pelo menos um evento.` };
    endpoints.push({
      id: typeof e.id === "string" && /^[a-z0-9_-]{6,40}$/i.test(e.id) ? e.id : "",
      name, url, events: [...new Set(events)],
      active: e.active !== false,
      includeCustomer: e.includeCustomer !== false,
    });
  }
  return { ok: true, value: { endpoints, pendingAfterMinutes: minutes } };
}

export const ALL_EVENTS = STORE_EVENTS;
