import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { scanPendingOrders } from "@/lib/server/notify";
import { retryFailedDeliveries } from "@/lib/server/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rotina de eventos por tempo: avisa pedidos parados em "Pagamento pendente" (e-mails + webhook) e reenvia webhooks
 * que falharam. Chame a cada 1 a 5 minutos por um agendador (Supabase pg_cron, cron-job.org etc.). Protegido por CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const pending = await scanPendingOrders();
  const retried = await retryFailedDeliveries();
  return NextResponse.json({ pending, retried });
}
