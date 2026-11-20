import { handle, json, requireAdminSession } from "@/lib/server/api";
import { getAdminOrderDetail, OrderStatusError, updateOrderStatus } from "@/lib/server/catalog";
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
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    try {
      await updateOrderStatus(id, status, undefined, { reason });
    } catch (error) {
      if (error instanceof OrderStatusError) {
        return json({ error: error.message }, error.message === "Pedido não encontrado." ? 404 : 409);
      }
      throw error;
    }
    return json({ ok: true });
  });
}
