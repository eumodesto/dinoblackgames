import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, mpMode } from "./env";

/** Campos do pagamento do Mercado Pago que o checkout usa. */
export type MpPayment = {
  id: number | string;
  status: string;
  status_detail?: string | null;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount?: number;
  installments?: number;
  date_of_expiration?: string | null;
  external_reference?: string | null;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  transaction_details?: { external_resource_url?: string };
  barcode?: { content?: string };
};

export class MpError extends Error {
  constructor(message: string, public status: number, public detail?: unknown) {
    super(message);
    this.name = "MpError";
  }
}

/** Formato que a função SQL sync_mp_payment espera. */
export function toSyncPayload(p: MpPayment) {
  const tx = p.point_of_interaction?.transaction_data;
  return {
    id: String(p.id),
    status: p.status,
    status_detail: p.status_detail ?? null,
    payment_method_id: p.payment_method_id ?? null,
    payment_type_id: p.payment_type_id ?? null,
    transaction_amount: p.transaction_amount ?? null,
    installments: p.installments ?? 1,
    date_of_expiration: p.date_of_expiration ?? null,
    qr_code: tx?.qr_code ?? null,
    qr_code_base64: tx?.qr_code_base64 ?? null,
    ticket_url: tx?.ticket_url ?? p.transaction_details?.external_resource_url ?? null,
    barcode: p.barcode?.content ?? null,
  };
}

// ---------------------------------------------------------------------------- modo simulado
// Sem rede e sem cobrança. Cartão aprova; Pix e boleto ficam pendentes até "pagar" pela tela de teste.
const g = globalThis as unknown as { __dinoMpSim?: Map<string, MpPayment>; __dinoMpSeq?: number };
const simStore = () => (g.__dinoMpSim ??= new Map<string, MpPayment>());

function simCreate(body: Record<string, unknown>): MpPayment {
  g.__dinoMpSeq = (g.__dinoMpSeq ?? 0) + 1;
  const id = String(9_000_000_000 + g.__dinoMpSeq);
  const method = String(body.payment_method_id ?? "visa");
  const isPix = method === "pix";
  const isTicket = method === "bolbradesco" || method === "boleto";
  const payment: MpPayment = {
    id,
    status: isPix || isTicket ? "pending" : "approved",
    status_detail: isPix ? "pending_waiting_transfer" : isTicket ? "pending_waiting_payment" : "accredited",
    payment_method_id: method,
    payment_type_id: isPix ? "bank_transfer" : isTicket ? "ticket" : "credit_card",
    transaction_amount: Number(body.transaction_amount),
    installments: Number(body.installments ?? 1),
    external_reference: String(body.external_reference ?? ""),
    date_of_expiration: (body.date_of_expiration as string | undefined) ?? new Date(Date.now() + 30 * 60_000).toISOString(),
  };
  if (isPix) {
    payment.point_of_interaction = { transaction_data: { qr_code: `00020126SIMULADO${id}5204000053039865802BR5909DINOBLACK6008BRASILIA62070503***6304ABCD` } };
  }
  if (isTicket) {
    payment.point_of_interaction = { transaction_data: { ticket_url: `${env.siteUrl || "http://localhost:3110"}/checkout/simulado/boleto/${id}` } };
    payment.barcode = { content: "34191790010104351004791020150008291070026000" };
  }
  simStore().set(id, payment);
  return payment;
}

/** Só no modo simulado: aprova um pagamento pendente (botão "simular pagamento" da tela de teste). */
export function simApprove(id: string): MpPayment | null {
  const p = simStore().get(id);
  if (!p) return null;
  p.status = "approved";
  p.status_detail = "accredited";
  return p;
}

// ---------------------------------------------------------------------------- modo real
async function mpFetch<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  if (!env.mpAccessToken) throw new MpError("MP_ACCESS_TOKEN não configurado", 500);
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${env.mpApiBase}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new MpError(String(data.message ?? `Mercado Pago respondeu ${res.status}`), res.status, data);
  }
  return data as T;
}

export async function mpCreatePayment(body: Record<string, unknown>, idempotencyKey: string): Promise<MpPayment> {
  if (mpMode() === "simulated") return simCreate(body);
  return mpFetch<MpPayment>("/v1/payments", { method: "POST", body: JSON.stringify(body), idempotencyKey });
}

export async function mpGetPayment(id: string): Promise<MpPayment | null> {
  if (mpMode() === "simulated") return simStore().get(id) ?? null;
  try {
    return await mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof MpError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Valida a assinatura do webhook (cabeçalho x-signature).
 *
 * O modo simulado não recebe eventos externos e precisa continuar livre para
 * os testes locais. No modo live, a ausência do segredo deve bloquear o
 * webhook: consultar a API depois não substitui a autenticação da origem.
 */
export function verifyWebhookSignature(opts: { signature: string | null; requestId: string | null; dataId: string }): boolean {
  if (mpMode() === "simulated") return true;
  if (!env.mpWebhookSecret) return false;
  if (!opts.signature) return false;
  const parts = Object.fromEntries(opts.signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${opts.dataId.toLowerCase()};request-id:${opts.requestId ?? ""};ts:${parts.ts};`;
  const expected = createHmac("sha256", env.mpWebhookSecret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
