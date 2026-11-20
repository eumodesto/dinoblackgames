import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { createCoupon, listCoupons, parseCouponInput } from "@/lib/server/coupons";

export async function GET() {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    return json({ coupons: await listCoupons() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const input = parseCouponInput(await readJson(req));
    const id = await createCoupon(input);
    return json({ id }, 201);
  });
}
