import { NextResponse } from "next/server";
import { expireOrders } from "@/lib/server/checkout";
import { env } from "@/lib/server/env";
import { scanPendingOrders } from "@/lib/server/notify";
import { retryFailedDeliveries } from "@/lib/server/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cancela pedidos Pix/boleto não pagos no prazo e devolve o estoque. Protegido por CRON_SECRET. */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  // Um agendador só basta: além de vencer os pedidos, esta chamada também avisa os pendentes e reenvia webhooks que falharam.
  const pending = await scanPendingOrders().catch(() => null);
  const cancelled = await expireOrders();
  const retried = await retryFailedDeliveries().catch(() => null);
  return NextResponse.json({ cancelled, pending, retried });
}
