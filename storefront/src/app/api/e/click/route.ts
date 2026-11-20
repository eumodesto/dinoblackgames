import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { recordEmailClick } from "@/lib/server/email-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clique no botão de um e-mail da loja: conta o clique e leva o cliente ao pedido.
 * O destino é sempre o pedido da própria loja (montado aqui a partir do número e do token), nunca um endereço vindo da URL.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const n = (url.searchParams.get("n") ?? "").slice(0, 40);
  const t = (url.searchParams.get("t") ?? "").slice(0, 200);
  const k = (url.searchParams.get("k") ?? "").slice(0, 80);
  const base = env.siteUrl || url.origin;
  let target: string | null = null;
  try {
    target = await recordEmailClick(n, t, k);
  } catch (e) {
    console.error("[email-click]", e instanceof Error ? e.message : e);
    // Falha ao contar não pode custar a venda: a página do pedido confere o token por conta própria.
    if (n && t) target = `${base}/checkout/confirmacao/${encodeURIComponent(n)}?t=${encodeURIComponent(t)}`;
  }
  const res = NextResponse.redirect(target ?? `${base}/loja`, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
