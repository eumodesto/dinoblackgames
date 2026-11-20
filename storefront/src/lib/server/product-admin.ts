import "server-only";
import { CheckoutError } from "./checkout";
import { getSql } from "./sql";
import { normalizeTags, parseSpecsText, parseVideoUrl, slugify } from "../catalog-normalize";
import { applyProductHighlights, prepareProductHighlights } from "./highlights";
import { variantExtrasSupported } from "./variant-support";

export const PRODUCT_TYPES = ["console", "jogo", "acessorio", "pc", "notebook", "periferico", "retro", "gift", "hardware"] as const;
export const TYPE_LABEL: Record<string, string> = { console: "Console", jogo: "Jogo", acessorio: "Acessório", pc: "PC Gamer", notebook: "Notebook", periferico: "Periférico", retro: "Retrô", gift: "Gift Card", hardware: "Hardware" };
const CONDITIONS = new Set(["novo", "seminovo", "raridade", "pre_venda"]);
const STATUSES = new Set(["draft", "scheduled", "published", "archived"]);
const MAX_IMAGES = 20;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}
function intOrNull(value: unknown, label: string, max = 1_000_000) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new CheckoutError(`${label} inválido.`);
  return n || null;
}
function money(value: unknown, label: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new CheckoutError(`${label} inválido.`);
  return Math.round(n * 100) / 100;
}

type Variant = {
  id?: string; sku?: string; options: Record<string, string>; price: number; compareAt: number | null; stock: number | null; minStock: number;
  maxInstallments: number; weightGrams: number | null; widthMm: number | null; heightMm: number | null; lengthMm: number | null; active: boolean;
  /** Só vão ao banco quando o formulário envia o campo (formulários antigos não apagam o que já está salvo). */
  cashPrice?: number | null; imageUrl?: string;
};

function parseVariants(body: Record<string, unknown>, shared: { weightGrams: number | null; widthMm: number | null; heightMm: number | null; lengthMm: number | null }): Variant[] {
  const raw = Array.isArray(body.variants) ? body.variants : [];
  if (raw.length === 0) throw new CheckoutError("Informe ao menos uma variação com preço.");
  if (raw.length > 60) throw new CheckoutError("Muitas variações (máximo 60).");
  return raw.map((entry, index) => {
    const v = (entry ?? {}) as Record<string, unknown>;
    const options = Object.fromEntries(Object.entries((v.options ?? {}) as Record<string, unknown>).map(([k, val]) => [text(k), text(val)]).filter(([k, val]) => k && val));
    const price = money(v.price, `Preço da variação ${index + 1}`);
    const compare = v.compareAt === "" || v.compareAt == null ? null : money(v.compareAt, "Preço original");
    const installments = Number(v.maxInstallments) || 10;
    if (installments < 1 || installments > 12) throw new CheckoutError("Parcelas devem ficar entre 1 e 12.");
    const extra: Pick<Variant, "cashPrice" | "imageUrl"> = {};
    if ("cashPrice" in v) {
      const cash = v.cashPrice === "" || v.cashPrice == null ? null : money(v.cashPrice, `Preço no Pix da variação ${index + 1}`);
      if (cash !== null && cash >= price) throw new CheckoutError(`O preço no Pix da variação ${index + 1} precisa ser menor que o preço normal.`);
      extra.cashPrice = cash;
    }
    if ("imageUrl" in v) {
      const url = text(v.imageUrl);
      if (url && !/^https?:\/\//i.test(url)) throw new CheckoutError(`Link da imagem da variação ${index + 1} inválido.`);
      extra.imageUrl = url;
    }
    return {
      ...extra,
      id: text(v.id) || undefined, sku: text(v.sku) || undefined, options, price,
      compareAt: compare != null && compare > price ? compare : null,
      stock: v.stock === "" || v.stock == null ? null : Math.max(0, Math.trunc(Number(v.stock)) || 0),
      minStock: Math.max(0, Math.trunc(Number(v.minStock)) || 0), maxInstallments: installments,
      ...shared, active: v.active !== false,
    };
  });
}

/** Valida o corpo do formulário e grava tudo numa transação (função save_product do banco). */
export async function saveAdminProduct(body: Record<string, unknown>, id?: string) {
  const name = text(body.name);
  const categoryId = text(body.categoryId);
  const productType = text(body.productType, "console");
  const condition = text(body.condition, "novo");
  const status = text(body.status, "draft");
  const visibility = text(body.visibility, "visible");
  if (!id && (!name || !categoryId)) throw new CheckoutError("Nome e categoria são obrigatórios.");
  if (!(PRODUCT_TYPES as readonly string[]).includes(productType)) throw new CheckoutError("Tipo de produto inválido.");
  if (!CONDITIONS.has(condition)) throw new CheckoutError("Condição inválida.");
  if (!STATUSES.has(status)) throw new CheckoutError("Status inválido.");
  if (visibility !== "visible" && visibility !== "hidden") throw new CheckoutError("Visibilidade inválida.");

  const videoUrl = text(body.videoUrl);
  const video = videoUrl ? parseVideoUrl(videoUrl) : null;
  if (videoUrl && !video) throw new CheckoutError("Link de vídeo inválido (use YouTube ou Vimeo).");

  const shared = {
    weightGrams: intOrNull(body.weightGrams, "Peso", 200_000), widthMm: intOrNull(body.widthMm, "Largura", 200_000),
    heightMm: intOrNull(body.heightMm, "Altura", 200_000), lengthMm: intOrNull(body.lengthMm, "Comprimento", 200_000),
  };
  const variants = parseVariants(body, shared);

  const options = (Array.isArray(body.options) ? body.options : []).map((o, i) => {
    const entry = (o ?? {}) as Record<string, unknown>;
    const optName = text(entry.name);
    const values = [...new Set((Array.isArray(entry.values) ? entry.values : []).map((v) => text(v)).filter(Boolean))];
    return { code: text(entry.code) || slugify(optName).replace(/-/g, "_"), name: optName, values, position: i };
  }).filter((o) => o.name && o.values.length);
  for (const v of variants) {
    for (const o of options) if (!v.options[o.code]) throw new CheckoutError(`Escolha o valor de "${o.name}" em todas as variações.`);
  }

  const media = (Array.isArray(body.media) ? body.media : []).slice(0, MAX_IMAGES).map((m) => {
    const entry = (m ?? {}) as Record<string, unknown>;
    const url = text(entry.url);
    if (!/^https?:\/\//i.test(url)) throw new CheckoutError("Link de imagem inválido.");
    return { url, alt: text(entry.alt) || name, width: Number(entry.width) || null, height: Number(entry.height) || null, bytes: Number(entry.bytes) || null };
  });

  const tags = normalizeTags(Array.isArray(body.tags) ? body.tags.map((t) => text(t)) : [], new Map(), { name }, 12);
  const highlightOps = await prepareProductHighlights(id ?? null, body.homeHighlights); // valida antes de gravar

  const payload: Record<string, unknown> = {
    ...(id ? { id } : {}), name, categoryId: categoryId || undefined, productType, typeLabel: TYPE_LABEL[productType], condition, status, visibility,
    sku: text(body.sku) || undefined, slug: id ? undefined : text(body.slug) || slugify(name),
    brand: text(body.brand), platform: text(body.platform), releaseYear: text(body.releaseYear),
    tagline: text(body.tagline), description: text(body.description).slice(0, 20000), badge: text(body.badge),
    warrantyMonths: Math.max(0, Math.trunc(Number(body.warrantyMonths) || 0)), warrantyText: text(body.warrantyText),
    seoTitle: text(body.seoTitle), seoDescription: text(body.seoDescription), videoUrl: video?.url ?? "",
    // O formulário manda texto/listas simples; só gravamos o que sobrevive à validação.
    specs: typeof body.specsText === "string" ? parseSpecsText(body.specsText) : undefined,
    inBox: Array.isArray(body.inBox) ? body.inBox.map((i) => text(i).slice(0, 160)).filter(Boolean).slice(0, 40) : undefined,
    faq: Array.isArray(body.faq)
      ? body.faq.map((f) => ({ q: text((f as Record<string, unknown>)?.q).slice(0, 200), a: text((f as Record<string, unknown>)?.a).slice(0, 1000) })).filter((f) => f.q && f.a).slice(0, 30)
      : undefined,
    tags, media, options, variants, locationId: text(body.locationId) || undefined,
  };
  const sql = await getSql();
  const [row] = await sql.query<{ saved: { id: string; sku: string; slug: string } }>("select save_product($1::jsonb) as saved", [JSON.stringify(payload)]);
  await applyProductHighlights(row.saved.id, highlightOps);
  return row.saved;
}

/**
 * Cria uma cópia do produto como RASCUNHO (não aparece na loja até ser publicada).
 * Copia dados, fotos, tags, opções e variações com os mesmos preços; SKU e endereço novos; estoque zerado
 * (o saldo físico é do produto original) e sem destaques da home.
 */
export async function duplicateAdminProduct(id: string): Promise<{ id: string; sku: string; slug: string; name: string } | null> {
  const data = await loadAdminProduct(id);
  if (!data) return null;
  const { product, media, options, variants, tags, facets } = data;
  const facet = (key: string) => facets.find((f) => f.key === key)?.value;
  const productType = facet("product_type");
  const name = `${String(product.name)} (cópia)`.slice(0, 200);
  const payload: Record<string, unknown> = {
    name, categoryId: product.category_id, condition: product.condition, status: "draft", visibility: product.visibility ?? "visible",
    ...(productType && (PRODUCT_TYPES as readonly string[]).includes(productType) ? { productType, typeLabel: TYPE_LABEL[productType] } : {}),
    brand: product.brand ?? "", platform: facet("platform") ?? "", releaseYear: facet("release_year") ?? "",
    tagline: product.tagline ?? "", description: product.description ?? "", badge: product.badge ?? "",
    warrantyMonths: product.warranty_months, warrantyText: product.warranty_text ?? "",
    highlights: product.highlights ?? [], specs: product.specs ?? [], inBox: product.in_box ?? [], faq: product.faq ?? [],
    seoTitle: product.seo_title ?? "", seoDescription: product.seo_description ?? "", videoUrl: product.video_url ?? "",
    tags,
    media: (media as { url: string; alt: string; width: number | null; height: number | null; bytes: number | null }[]).map((m) => ({ url: m.url, alt: m.alt, width: m.width, height: m.height, bytes: m.bytes })),
    options: (options as { code: string; name: string; values: string[] }[]).map((o, i) => ({ code: o.code, name: o.name, values: o.values, position: i })),
    variants: (variants as { options: Record<string, string>; price: string | number; compare_at: string | number | null; cash_price?: string | number | null; image_url?: string | null; max_installments: number; weight_grams: number | null; width_mm: number | null; height_mm: number | null; length_mm: number | null; min_stock: number }[]).map((v) => ({
      options: v.options ?? {}, price: Number(v.price), compareAt: v.compare_at == null ? null : Number(v.compare_at), maxInstallments: v.max_installments,
      weightGrams: v.weight_grams, widthMm: v.width_mm, heightMm: v.height_mm, lengthMm: v.length_mm, stock: 0, minStock: v.min_stock, active: true,
      ...("cash_price" in v ? { cashPrice: v.cash_price == null ? null : Number(v.cash_price), imageUrl: v.image_url ?? "" } : {}),
    })),
  };
  const sql = await getSql();
  const [row] = await sql.query<{ saved: { id: string; sku: string; slug: string } }>("select save_product($1::jsonb) as saved", [JSON.stringify(payload)]);
  return { ...row.saved, name };
}

/** Tudo que o formulário de edição precisa de um produto. */
export async function loadAdminProduct(id: string) {
  const sql = await getSql();
  const [product] = await sql.query<Record<string, unknown>>(
    "select p.*, c.name as category_name from products p join categories c on c.id = p.category_id where p.id = $1::uuid",
    [id],
  );
  if (!product) return null;
  const extras = await variantExtrasSupported();
  const [media, options, variants, tags, facets] = await Promise.all([
    sql.query("select url, alt, width, height, bytes, position from product_media where product_id = $1::uuid and kind = 'image' order by position", [id]),
    sql.query("select o.code, o.name, coalesce((select jsonb_agg(v.label order by v.position) from product_option_values v where v.option_id = o.id), '[]'::jsonb) as values from product_options o where o.product_id = $1::uuid order by o.position", [id]),
    sql.query(`select v.id, v.sku, v.option_values as options, v.price, v.compare_at, ${extras ? "v.cash_price, v.image_url, " : ""}v.max_installments, v.weight_grams, v.width_mm, v.height_mm, v.length_mm, v.is_active, coalesce((select sum(il.on_hand) from inventory_levels il where il.variant_id = v.id), 0)::int as stock, coalesce((select max(il.min_level) from inventory_levels il where il.variant_id = v.id), 0)::int as min_stock from product_variants v where v.product_id = $1::uuid and v.is_active order by v.price, v.created_at`, [id]),
    sql.query<{ name: string }>("select t.name from product_tags pt join tags t on t.id = pt.tag_id where pt.product_id = $1::uuid order by t.name", [id]),
    sql.query<{ key: string; value: string }>("select facet_key as key, facet_value as value from product_facets where product_id = $1::uuid", [id]),
  ]);
  return { product, media, options, variants, tags: tags.map((t) => t.name), facets, variantExtras: extras };
}
