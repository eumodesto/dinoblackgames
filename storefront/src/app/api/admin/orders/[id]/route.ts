import { handle, json, requireAdminSession } from "@/lib/server/api";
import { getAdminOrderDetail } from "@/lib/server/catalog";
import { updateOrderStatus } from "@/lib/server/catalog";
import { readJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const detail = await getAdminOrderDetail(id);
    if (!detail) return json({ error: "Pedido não encontrado." }, 404);
    return json(detail);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = await readJson(req);
    const status = typeof body.status === "string" ? body.status : "";
    await updateOrderStatus(id, status);
    return json({ ok: true });
  });
}
