import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { OrderStatusError, upsertAdminShipment, type AdminShipmentInput } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

const statuses = new Set<AdminShipmentInput["status"]>(["pending", "ready", "shipped", "delivered", "failed"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = await readJson(req);
    const status = typeof body.status === "string" ? body.status as AdminShipmentInput["status"] : "pending";
    if (!statuses.has(status)) return json({ error: "Status de remessa inválido." }, 422);
    try {
      await upsertAdminShipment(id, {
        status,
        carrier: typeof body.carrier === "string" ? body.carrier : undefined,
        service: typeof body.service === "string" ? body.service : undefined,
        trackingCode: typeof body.trackingCode === "string" ? body.trackingCode : undefined,
      });
    } catch (error) {
      if (error instanceof OrderStatusError) return json({ error: error.message }, error.message === "Pedido não encontrado." ? 404 : 409);
      throw error;
    }
    return json({ ok: true });
  });
}
