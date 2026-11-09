import "server-only";
import type { ShippingChoice } from "@/lib/checkout-types";
import { isValidCep, onlyDigits, PICKUP_ID, pickupOption } from "@/lib/shipping";
import { env } from "./env";
import { getSql } from "./sql";
import {
  quoteMelhorEnvio,
  quoteSuperFrete,
  type ParcelProduct,
  ShippingProviderError,
} from "./shipping-providers";

const DEFAULT_ORIGIN = "72501200";
const DEFAULT_MM = { weightGrams: 800, widthMm: 300, heightMm: 120, lengthMm: 400 };

export type QuotePackageInput = {
  variantId?: string | null;
  qty: number;
  unitPrice?: number;
  weightGrams?: number;
};

async function originCep(): Promise<string> {
  if (env.shippingOriginCep.length === 8) return env.shippingOriginCep;
  try {
    const sql = await getSql();
    const [row] = await sql.query<{ value: { cep?: string } }>(
      "select value from store_settings where key = 'shipping_origin' limit 1",
    );
    const cep = onlyDigits(String(row?.value?.cep ?? ""));
    if (cep.length === 8) return cep;
  } catch {
    /* banco ainda não pronto — usa padrão */
  }
  return DEFAULT_ORIGIN;
}

function mmToProduct(p: {
  id?: string;
  qty: number;
  weightGrams: number;
  widthMm: number;
  heightMm: number;
  lengthMm: number;
  unitPrice: number;
}): ParcelProduct {
  return {
    id: p.id,
    quantity: Math.max(1, p.qty),
    weight: Math.max(0.01, p.weightGrams / 1000),
    height: Math.max(1, Math.round(p.heightMm / 10)),
    width: Math.max(1, Math.round(p.widthMm / 10)),
    length: Math.max(1, Math.round(p.lengthMm / 10)),
    insuranceValue: Math.max(0, round2(p.unitPrice)),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Monta pacotes a partir das linhas da cotação (com dimensões do banco quando houver variantId). */
export async function buildParcels(lines: QuotePackageInput[]): Promise<{ products: ParcelProduct[]; insuranceTotal: number }> {
  const ok = lines.filter((l) => l.qty > 0);
  if (!ok.length) {
    return {
      products: [mmToProduct({ qty: 1, unitPrice: 0, ...DEFAULT_MM })],
      insuranceTotal: 0,
    };
  }

  const ids = [...new Set(ok.map((l) => l.variantId).filter((id): id is string => Boolean(id)))];
  const dims = new Map<string, { weight_grams: number | null; width_mm: number | null; height_mm: number | null; length_mm: number | null }>();

  if (ids.length) {
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      weight_grams: number | null;
      width_mm: number | null;
      height_mm: number | null;
      length_mm: number | null;
    }>(
      `select id, weight_grams, width_mm, height_mm, length_mm
       from product_variants where id = any($1::uuid[])`,
      [ids],
    );
    for (const r of rows) dims.set(r.id, r);
  }

  const products = ok.map((l, i) => {
    const d = l.variantId ? dims.get(l.variantId) : undefined;
    return mmToProduct({
      id: l.variantId ?? String(i + 1),
      qty: l.qty,
      unitPrice: l.unitPrice ?? 0,
      weightGrams: d?.weight_grams ?? l.weightGrams ?? DEFAULT_MM.weightGrams,
      widthMm: d?.width_mm ?? DEFAULT_MM.widthMm,
      heightMm: d?.height_mm ?? DEFAULT_MM.heightMm,
      lengthMm: d?.length_mm ?? DEFAULT_MM.lengthMm,
    });
  });

  const insuranceTotal = round2(products.reduce((s, p) => s + (p.insuranceValue ?? 0) * p.quantity, 0));
  return { products, insuranceTotal };
}

async function carrierQuotes(toCep: string, products: ParcelProduct[], insuranceTotal: number): Promise<ShippingChoice[]> {
  const from = await originCep();
  const prefer = env.shippingProvider;
  const errors: string[] = [];

  const trySf = async () => {
    if (!env.superfreteToken) throw new ShippingProviderError("SUPERFRETE_TOKEN ausente", "superfrete", 500);
    return quoteSuperFrete(from, toCep, products, insuranceTotal);
  };
  const tryMe = async () => {
    if (!env.melhorEnvioToken) throw new ShippingProviderError("MELHOR_ENVIO_TOKEN ausente", "melhor_envio", 500);
    return quoteMelhorEnvio(from, toCep, products);
  };

  if (prefer === "superfrete") return trySf();
  if (prefer === "melhor_envio") return tryMe();

  // auto: SuperFrete primeiro; Melhor Envio se falhar ou vier vazio
  if (env.superfreteToken) {
    try {
      const sf = await trySf();
      if (sf.length) return sf;
      errors.push("SuperFrete sem opções");
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "SuperFrete falhou");
    }
  }
  if (env.melhorEnvioToken) {
    try {
      const me = await tryMe();
      if (me.length) return me;
      errors.push("Melhor Envio sem opções");
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Melhor Envio falhou");
    }
  }

  if (!env.superfreteToken && !env.melhorEnvioToken) {
    throw new ShippingProviderError("Nenhum token de frete configurado", "superfrete", 500);
  }
  throw new ShippingProviderError(errors.join(" · ") || "Cotação de frete indisponível", "superfrete", 502);
}

/**
 * Opções de entrega para o CEP: retirada (DF) + cotação real SuperFrete / Melhor Envio.
 */
export async function quoteShippingOptions(toCepInput: string, lines: QuotePackageInput[]): Promise<ShippingChoice[]> {
  const toCep = onlyDigits(toCepInput);
  if (!isValidCep(toCep)) return [];

  const options: ShippingChoice[] = [];
  const pickup = pickupOption(toCep);
  if (pickup) options.push(pickup);

  const { products, insuranceTotal } = await buildParcels(lines);
  try {
    const carriers = await carrierQuotes(toCep, products, insuranceTotal);
    options.push(...carriers);
  } catch (e) {
    console.error("[shipping] cotação falhou:", e instanceof Error ? e.message : e);
    // Sem transportadora: ainda devolve retirada quando existir.
  }
  return options;
}

export function findQuotedShipping(options: ShippingChoice[], id: string) {
  return options.find((o) => o.id === id) ?? null;
}
