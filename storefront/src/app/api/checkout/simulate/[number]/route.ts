import { CheckoutError, getOrderStatus } from "@/lib/server/checkout";
import { handle, json } from "@/lib/server/api";
import { mpMode } from "@/lib/server/env";
import { simApprove } from "@/lib/server/mp";
import { getSql } from "@/lib/server/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SÓ no modo simulado: marca o Pix/boleto pendente do pedido como pago, para testar o fluxo sem dinheiro. */
export function POST(req: Request, ctx: { params: Promise<{ number: string }> }) {
  return handle(async () => {
    if (mpMode() !== "simulated") throw new CheckoutError("Disponível apenas no modo simulado.", 404);
    const { number } = await ctx.params;
    const token = new URL(req.url).searchParams.get("t") ?? "";
    await getOrderStatus(number, token, false); // valida número + token
    const sql = await getSql();
    const rows = await sql.query<{ provider_ref: string }>(
      `select p.provider_ref from payments p join orders o on o.id = p.order_id
       where o.number = $1 and p.provider = 'mercadopago' and p.status = 'pending' and p.provider_ref is not null`,
      [number],
    );
    if (rows.length === 0) throw new CheckoutError("Não há pagamento pendente para simular.", 409);
    for (const r of rows) simApprove(r.provider_ref);
    return json({ order: await getOrderStatus(number, token) });
  });
}
