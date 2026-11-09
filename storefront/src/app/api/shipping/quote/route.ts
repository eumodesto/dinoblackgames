import { handle, json, readJson } from "@/lib/server/api";
import { CheckoutError } from "@/lib/server/checkout";
import { quoteShippingOptions } from "@/lib/server/shipping-quote";
import { isValidCep, onlyDigits } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cotação avulsa (página do produto / carrinho).
 * Body: { cep, weightGrams?, items?: [{ qty, weightGrams?, unitPrice? }] }
 */
export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const cep = onlyDigits(typeof body.cep === "string" ? body.cep : "");
    if (!isValidCep(cep)) throw new CheckoutError("Digite um CEP com 8 números.");

    const itemsRaw = Array.isArray(body.items) ? body.items : null;
    const lines =
      itemsRaw?.map((raw) => {
        const o = (raw ?? {}) as Record<string, unknown>;
        return {
          qty: Math.max(1, Math.min(20, Number(o.qty) || 1)),
          weightGrams: Number(o.weightGrams) || undefined,
          unitPrice: Number(o.unitPrice) || undefined,
          variantId: typeof o.variantId === "string" ? o.variantId : undefined,
        };
      }) ?? [
        {
          qty: 1,
          weightGrams: Number(body.weightGrams) || 800,
          unitPrice: Number(body.unitPrice) || 0,
        },
      ];

    const shipping = await quoteShippingOptions(cep, lines);
    if (!shipping.length) {
      throw new CheckoutError("Não encontramos frete para este CEP no momento. Tente outro CEP ou fale conosco no WhatsApp.");
    }
    return json({ shipping, provider: shipping.find((s) => s.provider && s.provider !== "pickup")?.provider ?? null });
  });
}
