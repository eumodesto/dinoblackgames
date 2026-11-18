import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const sql = await getSql();
    const [product] = await sql.query("select p.*, c.name as category_name, (select row_to_json(v) from product_variants v where v.product_id = p.id and v.is_active order by v.created_at limit 1) as variant, (select row_to_json(m) from product_media m where m.product_id = p.id order by m.position limit 1) as media, (select coalesce(jsonb_agg(jsonb_build_object('key', facet_key, 'value', facet_value)), '[]'::jsonb) from product_facets f where f.product_id = p.id) as facets from products p join categories c on c.id = p.category_id where p.id = $1::uuid", [id]);
    if (!product) return json({ error: "Produto não encontrado." }, 404);
    return json({ product });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = await readJson(req);
    const fields: Array<[string, unknown]> = [
      ["name", body.name], ["sku", body.sku], ["category_id", body.categoryId], ["brand", body.brand], ["tagline", body.tagline], ["description", body.description], ["badge", body.badge], ["condition", body.condition], ["status", body.status], ["warranty_months", body.warrantyMonths], ["warranty_text", body.warrantyText], ["seo_title", body.seoTitle], ["seo_description", body.seoDescription],
    ];
    const sql = await getSql();
    for (const [column, value] of fields) {
      if (value === undefined) continue;
      const cast = ["category_id"].includes(column) ? "::uuid" : ["condition"].includes(column) ? "::product_condition" : ["status"].includes(column) ? "::publish_status" : "";
      await sql.query(`update products set ${column} = $1${cast} where id = $2::uuid`, [value === "" ? null : value, id]);
    }
    if (body.price !== undefined || body.compareAt !== undefined) await sql.query("update product_variants set price = coalesce($1, price), compare_at = $2 where product_id = $3::uuid and is_active", [body.price === undefined ? null : Number(body.price), body.compareAt ? Number(body.compareAt) : null, id]);
    if (body.imageUrl !== undefined) await sql.query("delete from product_media where product_id = $1::uuid", [id]);
    if (body.imageUrl) await sql.query("insert into product_media (product_id, url, alt, position) select $1::uuid, $2, name, 0 from products where id = $1::uuid", [id, body.imageUrl]);
    return json({ ok: true });
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
