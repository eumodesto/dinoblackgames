import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { parseCouponInput, updateCoupon } from "@/lib/server/coupons";
import { getSql } from "@/lib/server/sql";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    await updateCoupon(id, parseCouponInput(await readJson(req)));
    return json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const sql = await getSql();
    await sql.query("update coupons set is_active = false where id = $1::uuid", [id]);
    return json({ ok: true });
  });
}
