import { BULK_LABEL, bulkStatement, idsLiteral, pricePreviewStatements, validateBulk } from "@/lib/bulk-products";
import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Edição em lote. Com `dryRun: true` só calcula (quantos produtos e, em preço/promoção, antes e depois de algumas variações);
 * sem ele, aplica de uma vez a todos os produtos escolhidos e registra na auditoria.
 */
export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  const parsed = validateBulk(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { ids, params } = parsed;

  const sql = await getSql();
  const [{ n }] = await sql.query<{ n: number }>("select count(*)::int as n from products where id = any($1::uuid[])", [idsLiteral(ids)]);
  if (n === 0) return json({ error: "Nenhum dos produtos escolhidos existe mais." }, 404);

  if (params.action === "category") {
    const found = await sql.query("select 1 as ok from categories where id = $1::uuid", [params.categoryId]);
    if (found.length === 0) return json({ error: "A categoria escolhida não existe." }, 400);
  }

  if (body.dryRun === true) {
    const preview = pricePreviewStatements(ids, params);
    if (!preview) return json({ matched: n });
    const sample = await sql.query<{ name: string; sku: string; old_price: string | number; old_compare: string | number | null; new_price: string | number; new_compare: string | number | null }>(preview.sample.sql, preview.sample.values);
    const [totals] = await sql.query<{ products: number; variants: number }>(preview.totals.sql, preview.totals.values);
    return json({
      matched: n,
      totals,
      sample: sample.map((r) => ({
        name: r.name, sku: r.sku,
        oldPrice: Number(r.old_price), oldCompare: r.old_compare === null ? null : Number(r.old_compare),
        newPrice: Number(r.new_price), newCompare: r.new_compare === null ? null : Number(r.new_compare),
      })),
    });
  }

  const statement = bulkStatement(ids, params);
  await sql.query(statement.sql, statement.values);
  try {
    await sql.query(
      "insert into audit_log (actor_id, action, entity, entity_id, changes) values (null, $1, 'products', 'bulk', $2::jsonb)",
      [`products_bulk_${params.action}`, JSON.stringify({ label: BULK_LABEL[params.action], count: n, params: { ...params, action: undefined }, ids })],
    );
  } catch {
    // a auditoria nunca impede a alteração
  }
  return json({ ok: true, matched: n });
});
