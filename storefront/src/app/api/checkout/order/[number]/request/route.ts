import { handle, json, readJson } from "@/lib/server/api";
import { createOrderRequest } from "@/lib/server/order-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cliente pede troca ou estorno do próprio pedido (protegido pelo token do link do pedido). */
export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  return handle(async () => {
    const { number } = await params;
    const body = await readJson(req);
    await createOrderRequest(number, String(body.token ?? ""), String(body.kind ?? ""), String(body.reason ?? ""));
    return json({ ok: true });
  });
}
