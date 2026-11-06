import { NextResponse } from "next/server";
import { handleMpNotification } from "@/lib/server/checkout";
import { verifyWebhookSignature } from "@/lib/server/mp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notificações do Mercado Pago. O corpo nunca é confiável: só o id do pagamento é usado,
 * e o status vem de uma consulta à API. Responde 200 quando a notificação é legítima,
 * para o Mercado Pago não reenviar à toa.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // algumas notificações antigas vêm só na query string
  }
  const type = String(body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const dataId = String((body.data as Record<string, unknown> | undefined)?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  if (!verifyWebhookSignature({ signature: req.headers.get("x-signature"), requestId: req.headers.get("x-request-id"), dataId })) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignored: true });

  try {
    const result = await handleMpNotification(dataId);
    if (!result.handled) console.warn("[webhook mercadopago] ignorado:", dataId, result.reason);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[webhook mercadopago] falha ao processar", dataId, e instanceof Error ? e.message : e);
    // 500: o Mercado Pago tenta de novo mais tarde
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
}
