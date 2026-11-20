import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";
import { getAdminHighlights } from "@/lib/server/highlights";
import { loadAdminProduct, saveAdminProduct } from "@/lib/server/product-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const data = await loadAdminProduct(id);
    if (!data) return json({ error: "Produto não encontrado." }, 404);
    const highlightData = await getAdminHighlights(id);
    return json({ ...data, homeHighlights: highlightData.highlights, highlightUsage: { used: highlightData.usedByOthers, limits: highlightData.limits } });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    return json(await saveAdminProduct(await readJson(req), id));
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const sql = await getSql();
    await sql.query("update products set status = 'archived'::publish_status where id = $1::uuid", [id]);
    return json({ ok: true });
  });
}
