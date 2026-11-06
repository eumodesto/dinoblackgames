import { cancelPendingOrder, getOrderStatus } from "@/lib/server/checkout";
import { handle, json } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status do pedido. Exige o token do pedido (o visitante só vê o próprio). Confere o pagamento pendente no Mercado Pago. */
export function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  return handle(async () => {
    const { number } = await ctx.params;
    const token = new URL(req.url).searchParams.get("t") ?? "";
    return json({ order: await getOrderStatus(number, token) });
  });
}

/** Cancela o pedido enquanto aguarda pagamento (cliente voltou para editar ou desistiu). */
export function DELETE(req: Request, ctx: { params: Promise<{ number: string }> }) {
  return handle(async () => {
    const { number } = await ctx.params;
    const token = new URL(req.url).searchParams.get("t") ?? "";
    await cancelPendingOrder(number, token);
    return json({ ok: true });
  });
}
