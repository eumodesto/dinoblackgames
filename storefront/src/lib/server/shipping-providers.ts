import "server-only";
import { env } from "./env";
import type { ShippingChoice } from "@/lib/checkout-types";

export type ParcelProduct = {
  id?: string;
  quantity: number;
  /** kg */
  weight: number;
  /** cm */
  height: number;
  width: number;
  length: number;
  /** BRL — valor unitário assegurado */
  insuranceValue?: number;
};

export class ShippingProviderError extends Error {
  constructor(message: string, public provider: "superfrete" | "melhor_envio", public status = 502) {
    super(message);
    this.name = "ShippingProviderError";
  }
}

function etaLabel(days: number) {
  if (days <= 0) return "Hoje ou amanhã";
  if (days === 1) return "1 dia útil";
  return `${days} dias úteis`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type RawQuote = {
  provider: "superfrete" | "melhor_envio";
  serviceId: number;
  name: string;
  company?: string;
  price: number;
  etaDays: number;
};

function toChoice(raw: RawQuote): ShippingChoice {
  const prefix = raw.provider === "superfrete" ? "sf" : "me";
  const label = raw.company ? `${raw.company} · ${raw.name}` : raw.name;
  return {
    id: `${prefix}-${raw.serviceId}`,
    name: label,
    price: round2(raw.price),
    etaDays: raw.etaDays,
    time: etaLabel(raw.etaDays),
    provider: raw.provider,
    serviceId: raw.serviceId,
  };
}

async function postJson(url: string, token: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": env.shippingUserAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

/** Cotação SuperFrete — POST /api/v0/calculator */
export async function quoteSuperFrete(fromCep: string, toCep: string, products: ParcelProduct[], insuranceTotal: number): Promise<ShippingChoice[]> {
  if (!env.superfreteToken) throw new ShippingProviderError("SUPERFRETE_TOKEN não configurado", "superfrete", 500);

  const { ok, status, data } = await postJson(`${env.superfreteApiBase}/api/v0/calculator`, env.superfreteToken, {
    from: { postal_code: fromCep },
    to: { postal_code: toCep },
    services: "1,2,17,3,33",
    options: {
      own_hand: false,
      receipt: false,
      insurance_value: insuranceTotal > 0 ? insuranceTotal : 0,
      use_insurance_value: insuranceTotal > 0,
    },
    products: products.map((p) => ({
      quantity: p.quantity,
      weight: p.weight,
      height: p.height,
      width: p.width,
      length: p.length,
    })),
  });

  if (!ok) {
    const msg =
      data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `SuperFrete respondeu ${status}`;
    throw new ShippingProviderError(msg, "superfrete", status >= 400 && status < 500 ? 400 : 502);
  }

  const list = Array.isArray(data) ? data : [];
  const out: RawQuote[] = [];
  for (const row of list) {
    const r = row as Record<string, unknown>;
    if (r.has_error) continue;
    const id = Number(r.id);
    const price = Number(r.price);
    const eta = Number(r.delivery_time ?? (r.delivery_range as { max?: number } | undefined)?.max ?? 0);
    if (!Number.isFinite(id) || !Number.isFinite(price) || price < 0) continue;
    const company = (r.company as { name?: string } | undefined)?.name;
    out.push({
      provider: "superfrete",
      serviceId: id,
      name: String(r.name ?? `Serviço ${id}`),
      company: company ? String(company) : undefined,
      price,
      etaDays: Number.isFinite(eta) ? Math.max(0, Math.round(eta)) : 0,
    });
  }
  return out.map(toChoice).sort((a, b) => a.price - b.price || a.etaDays - b.etaDays);
}

/** Cotação Melhor Envio — POST /api/v2/me/shipment/calculate */
export async function quoteMelhorEnvio(fromCep: string, toCep: string, products: ParcelProduct[]): Promise<ShippingChoice[]> {
  if (!env.melhorEnvioToken) throw new ShippingProviderError("MELHOR_ENVIO_TOKEN não configurado", "melhor_envio", 500);

  const { ok, status, data } = await postJson(`${env.melhorEnvioApiBase}/api/v2/me/shipment/calculate`, env.melhorEnvioToken, {
    from: { postal_code: fromCep },
    to: { postal_code: toCep },
    products: products.map((p, i) => ({
      id: p.id ?? String(i + 1),
      width: Math.max(1, Math.round(p.width)),
      height: Math.max(1, Math.round(p.height)),
      length: Math.max(1, Math.round(p.length)),
      weight: p.weight,
      insurance_value: round2(p.insuranceValue ?? 0),
      quantity: p.quantity,
    })),
    options: { receipt: false, own_hand: false },
    services: "1,2,18",
  });

  if (!ok) {
    const msg =
      data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Melhor Envio respondeu ${status}`;
    throw new ShippingProviderError(msg, "melhor_envio", status >= 400 && status < 500 ? 400 : 502);
  }

  const list = Array.isArray(data) ? data : [];
  const out: RawQuote[] = [];
  for (const row of list) {
    const r = row as Record<string, unknown>;
    if (r.error) continue;
    const id = Number(r.id);
    const price = Number(r.custom_price ?? r.price);
    const eta = Number(r.custom_delivery_time ?? r.delivery_time ?? 0);
    if (!Number.isFinite(id) || !Number.isFinite(price) || price < 0) continue;
    const company = (r.company as { name?: string } | undefined)?.name;
    out.push({
      provider: "melhor_envio",
      serviceId: id,
      name: String(r.name ?? `Serviço ${id}`),
      company: company ? String(company) : undefined,
      price,
      etaDays: Number.isFinite(eta) ? Math.max(0, Math.round(eta)) : 0,
    });
  }
  return out.map(toChoice).sort((a, b) => a.price - b.price || a.etaDays - b.etaDays);
}
