import { handle, json, readJson } from "@/lib/server/api";
import { parseItems, quote } from "@/lib/server/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const items = parseItems(body.items);
    const cep = typeof body.cep === "string" ? body.cep : null;
    const coupon = typeof body.coupon === "string" && body.coupon.trim() ? body.coupon.trim().slice(0, 40) : null;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 160) : null;
    return json(await quote(items, cep, coupon, email));
  });
}
