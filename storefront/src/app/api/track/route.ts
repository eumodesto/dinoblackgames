import { NextResponse } from "next/server";
import { getSql } from "@/lib/server/sql";

export const runtime = "nodejs";

const EVENTS = new Set(["page_view", "product_view", "add_to_cart", "checkout_start", "shipping_quoted", "payment_created", "search", "stock_out_view", "coupon_applied"]);
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|whatsapp|preview|curl|wget|python-requests/i;

function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Recebe os eventos do navegador (sendBeacon). Sempre responde 204: rastreamento nunca pode
 * atrapalhar a compra, e quem manda lixo não ganha informação sobre o que foi aceito.
 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  try {
    if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
    const raw = await req.text();
    if (raw.length > 2000) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const event = clean(body.event, 30);
    const session = clean(body.sid, 64);
    const path = clean(body.path, 200);
    if (!EVENTS.has(event) || !/^[A-Za-z0-9_-]{8,64}$/.test(session) || path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });

    const meta: Record<string, string | number> = {};
    const query = clean(body.q, 80);
    if (event === "search" && query) meta.q = query;
    if (typeof body.value === "number" && Number.isFinite(body.value)) meta.value = Math.round(body.value * 100) / 100;

    const sql = await getSql();
    await sql.query(
      "insert into analytics_events (session_id, event, path, product_slug, device, source, meta) values ($1, $2, $3, nullif($4, ''), $5, nullif($6, ''), $7::jsonb)",
      [session, event, path || null, clean(body.slug, 120), deviceOf(ua), clean(body.src, 60), JSON.stringify(meta)],
    );
  } catch (error) {
    console.error("[track]", error instanceof Error ? error.message : error);
  }
  return new NextResponse(null, { status: 204 });
}
