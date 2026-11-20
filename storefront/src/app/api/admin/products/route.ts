import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";
import { getAdminHighlights } from "@/lib/server/highlights";
import { saveAdminProduct } from "@/lib/server/product-admin";

// Dados de apoio do formulário: categorias (com o caminho "Principal › Sub › Item"), locais de estoque e tags existentes.
export async function GET() {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const sql = await getSql();
    const [categories, locations, tags] = await Promise.all([
      sql.query(`with recursive t as (
          select id, name::text as label, lpad(position::text, 4, '0') || name as ord from categories where parent_id is null
          union all
          select c.id, t.label || ' › ' || c.name, t.ord || '.' || lpad(c.position::text, 4, '0') || c.name from categories c join t on c.parent_id = t.id
        ) select id, label as name from t order by ord`.trim()),
      sql.query("select id, name from stock_locations order by name"),
      sql.query("select name from tags where is_active order by name"),
    ]);
    const { usedByOthers, limits } = await getAdminHighlights(null);
    return json({ categories, locations, tags: (tags as { name: string }[]).map((t) => t.name), highlightUsage: { used: usedByOthers, limits } });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const saved = await saveAdminProduct(await readJson(req));
    return json(saved);
  });
}
