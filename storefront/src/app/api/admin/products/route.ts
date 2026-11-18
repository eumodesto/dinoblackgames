import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

const PRODUCT_TYPES = new Set(["console", "jogo", "acessorio", "pc", "notebook", "periferico", "retro"]);
const CONDITIONS = new Set(["novo", "seminovo", "raridade", "pre_venda"]);
const STATUSES = new Set(["draft", "scheduled", "published", "archived"]);

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function jsonValue(value: unknown, fallback: unknown) {
  return value && typeof value === "object" ? value : fallback;
}

function optionalDimension(value: unknown, label: string) {
  if (value === undefined || value === "" || value === null) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 200000) throw new Error(`${label} inválido.`);
  return parsed || null;
}

function validate(body: Record<string, unknown>) {
  const name = text(body.name);
  const sku = text(body.sku);
  const categoryId = text(body.categoryId);
  const productType = text(body.productType, "console");
  const condition = text(body.condition, "novo");
  const status = text(body.status, "draft");
  const price = Number(body.price);
  if (!name || !sku || !categoryId) throw new Error("Nome, SKU e categoria são obrigatórios.");
  if (!PRODUCT_TYPES.has(productType)) throw new Error("Tipo de produto inválido.");
  if (!CONDITIONS.has(condition)) throw new Error("Condição inválida.");
  if (!STATUSES.has(status)) throw new Error("Status inválido.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Preço inválido.");
  return { name, sku, categoryId, productType, condition, status, price };
}

export async function GET() {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const sql = await getSql();
    const [categories, locations] = await Promise.all([
      sql.query("select id, name from categories where is_active order by position, name"),
      sql.query("select id, name from stock_locations order by name"),
    ]);
    return json({ categories, locations });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const body = await readJson(req);
    const input = validate(body);
    const sql = await getSql();
    const slug = text(body.slug) || slugify(input.name);
    const facets = [
      ["product_type", input.productType],
      ["platform", text(body.platform)],
      ["release_year", text(body.releaseYear)],
      ["brand", text(body.brand)],
    ].filter(([, value]) => value);
    const [product] = await sql.query<{ id: string }>(
      `insert into products (slug, sku, name, category_id, condition, status, brand, tagline, description, badge, warranty_months, warranty_text, highlights, specs, in_box, faq, seo_title, seo_description, published_at)
       values ($1, $2, $3, $4::uuid, $5::product_condition, $6::publish_status, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, case when $6 = 'published'::publish_status then now() else null end)
       returning id`,
      [slug, input.sku, input.name, input.categoryId, input.condition, input.status, text(body.brand) || null, text(body.tagline) || null, text(body.description) || null, text(body.badge) || null, Number(body.warrantyMonths) || 0, text(body.warrantyText) || null, JSON.stringify(jsonValue(body.highlights, [])), JSON.stringify(jsonValue(body.specs, [])), JSON.stringify(jsonValue(body.inBox, [])), JSON.stringify(jsonValue(body.faq, [])), text(body.seoTitle) || null, text(body.seoDescription) || null],
    );
    const [variant] = await sql.query<{ id: string }>(
      `insert into product_variants (product_id, sku, option_values, price, compare_at, max_installments, weight_grams, width_mm, height_mm, length_mm)
       values ($1::uuid, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [product.id, input.sku, JSON.stringify(jsonValue(body.optionValues, {})), input.price, body.compareAt ? Number(body.compareAt) : null, Number(body.maxInstallments) || 10, optionalDimension(body.weightGrams, "Peso"), optionalDimension(body.widthMm, "Largura"), optionalDimension(body.heightMm, "Altura"), optionalDimension(body.lengthMm, "Comprimento")],
    );
    for (const [key, value] of facets) await sql.query("insert into product_facets (product_id, facet_key, facet_value) values ($1::uuid, $2, $3) on conflict do nothing", [product.id, key, value]);
    const image = text(body.imageUrl);
    if (image) await sql.query("insert into product_media (product_id, url, alt, position) values ($1::uuid, $2, $3, 0)", [product.id, image, input.name]);
    const locationId = text(body.locationId);
    if (locationId && input.condition === "novo") await sql.query("insert into inventory_levels (variant_id, location_id, on_hand, min_level) values ($1::uuid, $2::uuid, $3, $4)", [variant.id, locationId, Math.max(0, Number(body.stock) || 0), Math.max(0, Number(body.minStock) || 0)]);
    return json({ id: product.id, slug });
  });
}
