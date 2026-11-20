import { handle, json, requireAdminSession } from "@/lib/server/api";
import { duplicateAdminProduct } from "@/lib/server/product-admin";
import { getSql } from "@/lib/server/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Duplica o produto como rascunho. Devolve o produto novo para o painel abrir direto na edição. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const copy = await duplicateAdminProduct(id);
    if (!copy) return json({ error: "Produto não encontrado." }, 404);
    try {
      const sql = await getSql();
      await sql.query("insert into audit_log (actor_id, action, entity, entity_id, changes) values (null, 'product_duplicate', 'products', $1, $2::jsonb)", [copy.id, JSON.stringify({ from: id, sku: copy.sku })]);
    } catch {
      // a auditoria nunca impede a duplicação
    }
    return json({ ok: true, ...copy }, 201);
  });
}
