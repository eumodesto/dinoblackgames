import { CheckoutError, payOrder } from "@/lib/server/checkout";
import { handle, json, readJson } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const number = typeof body.number === "string" ? body.number : "";
    const token = typeof body.token === "string" ? body.token : "";
    const form = body.formData && typeof body.formData === "object" ? (body.formData as Record<string, unknown>) : null;
    if (!form) throw new CheckoutError("Dados de pagamento ausentes.");
    return json(await payOrder(number, token, form));
  });
}
