import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

export const dynamic = "force-dynamic";

/** Liga ou desliga a exibição do produto na loja: publicado ⇄ rascunho. Só o status muda; o resto do cadastro não é tocado. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Produto inválido." }, 400);
    const body = await readJson(req);
    if (typeof body.published !== "boolean") return json({ error: "Informe se o produto deve ficar publicado." }, 400);
    const status = body.published ? "published" : "draft";
    const sql = await getSql();
    const rows = await sql.query<{ id: string; status: string }>(
      `update products set status = $2::publish_status, updated_at = now(),
              published_at = case when $2 = 'published' then coalesce(published_at, now()) else published_at end
       where id = $1::uuid returning id, status::text as status`,
      [id, status],
    );
    if (rows.length === 0) return json({ error: "Produto não encontrado." }, 404);
    try {
      await sql.query("insert into audit_log (actor_id, action, entity, entity_id, changes) values (null, 'product_visibility_changed', 'products', $1, $2::jsonb)", [id, JSON.stringify({ status })]);
    } catch {
      // o registro de auditoria nunca impede a alteração
    }
    return json({ ok: true, status: rows[0].status });
  });
}
