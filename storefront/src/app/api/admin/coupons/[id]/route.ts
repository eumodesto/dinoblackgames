import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function nullableDate(value: unknown) { const v = text(value); return v ? v : null; }
function codeOk(value: unknown) { return text(value).length >= 3; }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = await readJson(req);
    const kind = text(body.kind);
    const value = Number(body.value);
    if (!codeOk(body.code) || !["percent", "amount"].includes(kind) || !Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 100)) return json({ error: "Dados do cupom inválidos." }, 400);
    const sql = await getSql();
    await sql.query("update coupons set code = $1, kind = $2::discount_kind, value = $3, min_subtotal = $4, max_uses = $5, max_uses_per_user = $6, starts_at = $7::timestamptz, ends_at = $8::timestamptz, is_active = $9::boolean where id = $10::uuid", [text(body.code).toUpperCase(), kind, value, Number(body.minSubtotal) || 0, body.maxUses ? Number(body.maxUses) : null, Number(body.maxUsesPerUser) || 1, nullableDate(body.startsAt), nullableDate(body.endsAt), Boolean(body.isActive), id]);
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
