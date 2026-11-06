import { NextResponse } from "next/server";
import { expireOrders } from "@/lib/server/checkout";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cancela pedidos Pix/boleto não pagos no prazo e devolve o estoque. Protegido por CRON_SECRET. */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const cancelled = await expireOrders();
  return NextResponse.json({ cancelled });
}
