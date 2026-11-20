import "server-only";
import { getSql, type Sql } from "./sql";
import { sendTransactionalEmail, type EmailTemplateKey } from "./email";

// ---------------------------------------------------------------------------
// Types shared between storefront pages and the data layer
// ---------------------------------------------------------------------------

export type ProductListing = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  condition: string;
  badge: string | null;
  soldCount: number;
  rating: number | null;
  publishedAt: string | null;
  image: string;
  price: number;
  compareAt: number | null;
  discount: number | null;
  available: number;
  inStock: boolean;
  facets: Record<string, string[]>;
};

export type CategoryCard = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  href: string;
  parentId: string | null;
};

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  image: string;
};

export type GalleryImage = { src: string; alt: string; position?: string };

export type OptionValue = { label: string; available: boolean };
export type ProductOption = { id: string; name: string; values: OptionValue[] };
export type Highlight = { title: string; text: string };
export type SpecGroup = { group: string; rows: [string, string][] };
export type Faq = { q: string; a: string };

export type UnitReport = {
  id: string;
  grade: string;
  summary: string;
  included: string[];
  knownMarks: string[];
  tested: string[];
  warrantyDays: number;
};

export type VariantInfo = { options: Record<string, string>; price: number; compareAt: number | null; available: number };

export type ProductDetail = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  condition: string;
  categorySlug: string;
  categoryName: string;
  tagline: string;
  description: string | null;
  badge: string | null;
  price: number;
  compareAt: number | null;
  discount: number | null;
  available: number;
  inStock: boolean;
  soldCount: number;
  rating: number | null;
  warrantyMonths: number;
  warrantyText: string | null;
  maxInstallments: number;
  gallery: GalleryImage[];
  options: ProductOption[];
  highlights: Highlight[];
  specs: SpecGroup[];
  inBox: string[];
  faq: Faq[];
  unit: UnitReport | null;
  facets: Record<string, string[]>;
  videoUrl: string | null;
  variants: VariantInfo[];
};

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type ListingRow = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category_slug: string;
  category_name: string;
  condition: string;
  badge: string | null;
  sold_count: number;
  rating: string | number | null;
  published_at: string | null;
  image_url: string | null;
  current_price: string | number;
  list_price: string | number;
  discount_percent: number | null;
  available: number;
  in_stock: boolean;
  facets: Record<string, string[]>;
};

function toListing(r: ListingRow): ProductListing {
  const price = Number(r.current_price);
  const listPrice = Number(r.list_price);
  return {
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    categorySlug: r.category_slug,
    categoryName: r.category_name,
    condition: r.condition,
    badge: r.badge,
    soldCount: r.sold_count,
    rating: r.rating != null ? Number(r.rating) : null,
    publishedAt: r.published_at,
    image: r.image_url ?? "",
    price,
    compareAt: listPrice > price ? listPrice : null,
    discount: r.discount_percent,
    available: r.available,
    inStock: r.in_stock,
    facets: r.facets ?? {},
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<CategoryCard[]> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string; slug: string; name: string; image_url: string | null; parent_id: string | null }>(
    "select id, slug, name, image_url, parent_id from categories where is_active order by position, name",
  );
  // Categoria cuja mãe está oculta no admin também some (a árvore inteira abaixo dela).
  const active = new Set(rows.map((r) => r.id));
  return rows
    .filter((r) => !r.parent_id || active.has(r.parent_id))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      image: r.image_url,
      href: `/loja?categoria=${r.slug}`,
      parentId: r.parent_id,
    }));
}

// ---------------------------------------------------------------------------
// Banners (hero slides)
// ---------------------------------------------------------------------------

export async function getBanners(placement = "home_hero"): Promise<HeroSlide[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string; eyebrow: string | null; title: string; description: string | null;
    cta_label: string | null; href: string | null; image_url: string;
  }>(
    `select id, eyebrow, title, description, cta_label, href, image_url
     from banners
     where placement = $1 and status = 'published'
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at >= now())
     order by position`,
    [placement],
  );
  return rows.map((r) => ({
    id: r.id,
    eyebrow: r.eyebrow ?? "",
    title: r.title,
    description: r.description ?? "",
    cta: r.cta_label ?? "Explorar agora",
    href: r.href ?? "/loja",
    image: r.image_url,
  }));
}

// ---------------------------------------------------------------------------
// Product listings (storefront listing + shop page)
// ---------------------------------------------------------------------------

export type ShopFilters = {
  q?: string;
  categoria?: string;
  condicao?: string[];
  plataforma?: string[];
  tipo?: string[];
  precoMin?: number;
  precoMax?: number;
  promocao?: boolean;
  ordem?: string;
  limit?: number;
  collectionSlug?: string;
};

/** Categorias ocultas no admin (is_active = false): o nome não aparece em cartões nem na página do produto. */
async function hiddenCategorySlugs(): Promise<Set<string>> {
  const sql = await getSql();
  const rows = await sql.query<{ slug: string }>("select slug from categories where not is_active");
  return new Set(rows.map((r) => r.slug));
}

function maskHiddenCategory(items: ProductListing[], hidden: Set<string>): ProductListing[] {
  return hidden.size === 0 ? items : items.map((item) => (hidden.has(item.categorySlug) ? { ...item, categoryName: "" } : item));
}

export async function getProductListings(filters: ShopFilters = {}): Promise<ProductListing[]> {
  const sql = await getSql();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let n = 0;

  if (filters.q) {
    n++;
    conditions.push(`(lower(name) like '%' || lower($${n}) || '%' or lower(category_name) like '%' || lower($${n}) || '%' or id in (select pt.product_id from product_tags pt join tags t on t.id = pt.tag_id where t.is_active and lower(t.name) like '%' || lower($${n}) || '%'))`);
    params.push(filters.q);
  }
  if (filters.categoria) {
    n++;
    conditions.push(`category_slug in (with recursive branch as (select id, slug from categories where slug = $${n} union all select c.id, c.slug from categories c join branch b on c.parent_id = b.id) select slug from branch)`);
    params.push(filters.categoria);
  }
  if (filters.condicao?.length) {
    n++;
    conditions.push(`condition = any($${n}::text[])`);
    params.push(filters.condicao);
  }
  if (filters.plataforma?.length) {
    n++;
    conditions.push(`facets->>'platform' is not null and exists (
      select 1 from jsonb_array_elements_text(facets->'platform') v where lower(v) = any(select lower(unnest($${n}::text[])))
    )`);
    params.push(filters.plataforma);
  }
  if (filters.tipo?.length) {
    n++;
    conditions.push(`facets->>'type' is not null and exists (
      select 1 from jsonb_array_elements_text(facets->'type') v where lower(v) = any(select lower(unnest($${n}::text[])))
    )`);
    params.push(filters.tipo);
  }
  if (filters.precoMin != null) {
    n++;
    conditions.push(`current_price >= $${n}`);
    params.push(filters.precoMin);
  }
  if (filters.precoMax != null && filters.precoMax < Infinity) {
    n++;
    conditions.push(`current_price < $${n}`);
    params.push(filters.precoMax);
  }
  if (filters.promocao) {
    conditions.push("discount_percent is not null and discount_percent > 0");
  }
  if (filters.collectionSlug) {
    n++;
    conditions.push(`id in (select cp.product_id from collection_products cp join collections c on c.id = cp.collection_id where c.slug = $${n})`);
    params.push(filters.collectionSlug);
  }

  conditions.push("visibility <> 'hidden'"); // produto oculto só abre pelo link direto
  const where = `where ${conditions.join(" and ")}`;

  let orderBy: string;
  switch (filters.ordem) {
    case "menor-preco": orderBy = "current_price asc"; break;
    case "maior-preco": orderBy = "current_price desc"; break;
    case "maior-desconto": orderBy = "coalesce(discount_percent, 0) desc"; break;
    case "mais-vendidos": orderBy = "sold_count desc"; break;
    default: orderBy = "published_at desc nulls last, name asc";
  }

  const limit = filters.limit ? `limit ${Math.min(filters.limit, 200)}` : "";

  const rows = await sql.query<ListingRow>(
    `select * from v_product_listing ${where} order by ${orderBy} ${limit}`,
    params,
  );
  return maskHiddenCategory(rows.map(toListing), await hiddenCategorySlugs());
}

export async function getProductCount(): Promise<number> {
  const sql = await getSql();
  const [row] = await sql.query<{ n: number }>("select count(*)::int as n from v_product_listing");
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Facet values for the filter panel
// ---------------------------------------------------------------------------

export type FacetValues = {
  platforms: string[];
  types: string[];
  conditions: string[];
};

export async function getFacetValues(): Promise<FacetValues> {
  const sql = await getSql();
  const rows = await sql.query<{ facet_key: string; facet_value: string }>(
    `select distinct pf.facet_key, pf.facet_value
     from product_facets pf
     join products p on p.id = pf.product_id
     where p.status = 'published' and pf.facet_key in ('platform', 'type')
     order by pf.facet_value`,
  );
  const platforms: string[] = [];
  const types: string[] = [];
  for (const r of rows) {
    if (r.facet_key === "platform" && !platforms.includes(r.facet_value)) platforms.push(r.facet_value);
    if (r.facet_key === "type" && !types.includes(r.facet_value)) types.push(r.facet_value);
  }
  const condRows = await sql.query<{ condition: string }>(
    "select distinct condition::text from products where status = 'published' order by condition",
  );
  return { platforms, types, conditions: condRows.map((r) => r.condition) };
}

// ---------------------------------------------------------------------------
// Single product detail
// ---------------------------------------------------------------------------

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const sql = await getSql();

  const [product] = await sql.query<{
    id: string; slug: string; sku: string; name: string; brand: string | null;
    condition: string; tagline: string | null; description: string | null;
    badge: string | null; sold_count: number; rating: string | number | null;
    warranty_months: number; warranty_text: string | null;
    highlights: Highlight[]; specs: SpecGroup[]; in_box: string[]; faq: Faq[];
    category_id: string; video_url: string | null;
  }>(
    "select * from products where slug = $1 and status = 'published'",
    [slug],
  );
  if (!product) return null;

  const [category] = await sql.query<{ slug: string; name: string }>(
    "select slug, case when is_active then name else '' end as name from categories where id = $1",
    [product.category_id],
  );

  const media = await sql.query<{ url: string; alt: string; crop: string | null }>(
    "select url, alt, crop from product_media where product_id = $1 order by position",
    [product.id],
  );

  const listing = await sql.query<ListingRow>(
    "select * from v_product_listing where id = $1",
    [product.id],
  );
  const price = listing[0] ? Number(listing[0].current_price) : 0;
  const listPrice = listing[0] ? Number(listing[0].list_price) : 0;
  const available = listing[0]?.available ?? 0;
  const discount = listing[0]?.discount_percent ?? null;
  const facets = listing[0]?.facets ?? {};

  const options = await loadOptions(sql, product.id);
  const variantRows = await sql.query<{ option_values: Record<string, string>; price: string | number; compare_at: string | number | null; avail: string | number }>(
    `select v.option_values, effective_price(v.id) as price, greatest(coalesce(v.compare_at, v.price), v.price) as compare_at,
       coalesce((select sum(il.on_hand - il.reserved) from inventory_levels il where il.variant_id = v.id), 0)
       + (select count(*) from inventory_units u where u.variant_id = v.id and u.status = 'disponivel')::int as avail
     from product_variants v where v.product_id = $1 and v.is_active order by v.price`,
    [product.id],
  );
  const variants: VariantInfo[] = variantRows.map((v) => ({
    options: v.option_values ?? {},
    price: Number(v.price),
    compareAt: Number(v.compare_at) > Number(v.price) ? Number(v.compare_at) : null,
    available: Number(v.avail),
  }));

  const maxInstallments = await sql.query<{ m: number }>(
    "select coalesce(max(max_installments), 10) as m from product_variants where product_id = $1 and is_active",
    [product.id],
  );

  let unit: UnitReport | null = null;
  if (product.condition === "seminovo" || product.condition === "raridade") {
    const [u] = await sql.query<{
      id: string; grade: string; report: { summary?: string; tested?: string[]; included?: string[]; knownMarks?: string[] };
      warranty_days: number;
    }>(
      "select id, grade, report, warranty_days from v_public_units where product_id = $1 limit 1",
      [product.id],
    );
    if (u) {
      unit = {
        id: u.id,
        grade: u.grade,
        summary: u.report.summary ?? "",
        tested: u.report.tested ?? [],
        included: u.report.included ?? [],
        knownMarks: u.report.knownMarks ?? [],
        warrantyDays: u.warranty_days,
      };
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand ?? "DinoBlack",
    condition: product.condition,
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "",
    tagline: product.tagline ?? "",
    description: product.description,
    badge: product.badge,
    price,
    compareAt: listPrice > price ? listPrice : null,
    discount,
    available,
    inStock: available > 0,
    soldCount: product.sold_count,
    rating: product.rating != null ? Number(product.rating) : null,
    warrantyMonths: product.warranty_months,
    warrantyText: product.warranty_text,
    maxInstallments: maxInstallments[0]?.m ?? 10,
    gallery: media.map((m) => ({ src: m.url, alt: m.alt, position: m.crop ?? undefined })),
    options,
    highlights: product.highlights ?? [],
    specs: product.specs ?? [],
    inBox: product.in_box ?? [],
    faq: product.faq ?? [],
    unit,
    facets,
    videoUrl: product.video_url ?? null,
    variants,
  };
}

async function loadOptions(sql: Sql, productId: string): Promise<ProductOption[]> {
  const opts = await sql.query<{ id: string; code: string; name: string }>(
    "select id, code, name from product_options where product_id = $1 order by position",
    [productId],
  );
  const result: ProductOption[] = [];
  for (const o of opts) {
    const vals = await sql.query<{ label: string }>(
      "select label from product_option_values where option_id = $1 order by position",
      [o.id],
    );
    const variantAvail = await sql.query<{ option_values: Record<string, string>; avail: number }>(
      `select v.option_values, coalesce(
         (select sum(il.on_hand - il.reserved) from inventory_levels il where il.variant_id = v.id), 0
       ) + (select count(*) from inventory_units u where u.variant_id = v.id and u.status = 'disponivel')::int as avail
       from product_variants v where v.product_id = $1 and v.is_active`,
      [productId],
    );
    result.push({
      id: o.code,
      name: o.name,
      values: vals.map((v) => ({
        label: v.label,
        available: variantAvail.some(
          (va) => va.option_values[o.code] === v.label && Number(va.avail) > 0,
        ),
      })),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Related products
// ---------------------------------------------------------------------------

export async function getRelatedProducts(productId: string, categorySlug: string, limit = 6): Promise<ProductListing[]> {
  const sql = await getSql();
  const rows = await sql.query<ListingRow>(
    `(select * from v_product_listing where category_slug = $1 and id != $2 and visibility <> 'hidden' order by sold_count desc limit $3)
     union all
     (select * from v_product_listing where category_slug != $1 and id != $2 and visibility <> 'hidden' order by sold_count desc limit $3)`,
    [categorySlug, productId, limit],
  );
  return maskHiddenCategory(rows.slice(0, limit).map(toListing), await hiddenCategorySlugs());
}

// ---------------------------------------------------------------------------
// All published slugs (for generateStaticParams)
// ---------------------------------------------------------------------------

export async function getAllProductSlugs(): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql.query<{ slug: string }>(
    "select slug from products where status = 'published' and visibility <> 'hidden' order by slug",
  );
  return rows.map((r) => r.slug);
}

// ---------------------------------------------------------------------------
// Admin: orders overview
// ---------------------------------------------------------------------------

export type OrderSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  customerName: string | null;
  customerEmail: string | null;
  placedAt: string;
  itemCount: number;
};

export type OrderFilters = {
  query?: string;
  status?: string;
  paymentStatus?: string;
  carrier?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function getOrders(filters: OrderFilters = {}): Promise<OrderSummary[]> {
  const sql = await getSql();
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sqlFragment: string, value: unknown) => {
    params.push(value);
    where.push(sqlFragment.replace("?", `$${params.length}`));
  };

  if (filters.status) add("o.status = ?::order_status", filters.status);
  if (filters.paymentStatus) {
    add("exists (select 1 from payments pf where pf.order_id = o.id and pf.status = ?::payment_status)", filters.paymentStatus);
  }
  if (filters.carrier) {
    add("exists (select 1 from shipments sf where sf.order_id = o.id and sf.carrier ilike ?)", `%${filters.carrier}%`);
  }
  if (filters.from) add("o.placed_at >= ?::date", filters.from);
  if (filters.to) add("o.placed_at < (?::date + interval '1 day')", filters.to);
  if (filters.query) {
    const query = `%${filters.query}%`;
    params.push(query, query, query, query);
    const p1 = params.length - 3;
    const p2 = params.length - 2;
    const p3 = params.length - 1;
    const p4 = params.length;
    where.push(`(o.number ilike $${p1} or o.customer_name ilike $${p2} or coalesce(o.customer_email, o.guest_email) ilike $${p3} or exists (select 1 from order_items oq join product_variants vq on vq.id = oq.variant_id where oq.order_id = o.id and vq.sku ilike $${p4}))`);
  }
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const cond = where.length ? `where ${where.join(" and ")}` : "";
  const rows = await sql.query<{
    id: string; number: string; status: string; total: string | number;
    customer_name: string | null; customer_email: string | null; placed_at: string;
    item_count: number;
  }>(
    `select o.id, o.number, o.status::text, o.total, o.customer_name, coalesce(o.customer_email, o.guest_email) as customer_email,
            o.placed_at::text, (select count(*)::int from order_items oi where oi.order_id = o.id) as item_count
     from orders o ${cond}
     order by o.placed_at desc limit ${limit} offset ${offset}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    total: Number(r.total),
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    placedAt: r.placed_at,
    itemCount: r.item_count,
  }));
}

export type AdminOrderDetail = {
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  shipments: Record<string, unknown>[];
  events: Record<string, unknown>[];
  returns: Record<string, unknown>[];
};

/** Detalhe operacional do pedido para a equipe autorizada. */
export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const sql = await getSql();
  const [order] = await sql.query<Record<string, unknown>>(
    `select o.*, c.code as coupon_code
     from orders o left join coupons c on c.id = o.coupon_id
     where o.id = $1::uuid limit 1`,
    [orderId],
  );
  if (!order) return null;
  const [items, payments, shipments, events, returns] = await Promise.all([
    sql.query<Record<string, unknown>>(
      `select oi.*, p.name as product_name, p.slug as product_slug, v.sku as variant_sku,
              u.serial_number, u.status as unit_status
       from order_items oi
       left join products p on p.id = oi.product_id
       left join product_variants v on v.id = oi.variant_id
       left join inventory_units u on u.id = oi.unit_id
       where oi.order_id = $1::uuid order by oi.id`,
      [orderId],
    ),
    sql.query<Record<string, unknown>>(
      "select id, method, status, amount, installments, provider, provider_ref, status_detail, pix_expires_at, paid_at, created_at, updated_at from payments where order_id = $1::uuid order by created_at desc",
      [orderId],
    ),
    sql.query<Record<string, unknown>>(
      "select id, status, carrier, service, tracking_code, label_url, shipped_at, delivered_at, events, created_at from shipments where order_id = $1::uuid order by created_at desc",
      [orderId],
    ),
    sql.query<Record<string, unknown>>(
      `select oe.id, oe.type, oe.from_status, oe.to_status, oe.message, oe.created_at,
              p.full_name as actor_name
       from order_events oe left join profiles p on p.id = oe.actor_id
       where oe.order_id = $1::uuid order by oe.created_at asc, oe.id asc`,
      [orderId],
    ),
    sql.query<Record<string, unknown>>(
      "select id, order_item_id, kind, status, reason, resolution, created_at, updated_at from return_requests where order_id = $1::uuid order by created_at desc",
      [orderId],
    ),
  ]);
  return { order, items, payments, shipments, events, returns };
}

// ---------------------------------------------------------------------------
// Admin: dashboard KPIs
// ---------------------------------------------------------------------------

export type DashboardKpis = {
  totalProducts: number;
  publishedProducts: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  revenue: number;
  inventoryAlerts: number;
};

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const sql = await getSql();
  const [products] = await sql.query<{ total: number; published: number }>(
    "select count(*)::int as total, count(*) filter (where status = 'published')::int as published from products",
  );
  const [orders] = await sql.query<{ total: number; pending: number; paid: number; revenue: string | number }>(
    `select count(*)::int as total,
            count(*) filter (where status = 'pending_payment')::int as pending,
            count(*) filter (where status = 'paid')::int as paid,
            coalesce(sum(total) filter (where paid_at is not null and status != 'cancelled'), 0) as revenue
     from orders`,
  );
  const [alerts] = await sql.query<{ n: number }>(
    "select count(*)::int as n from v_inventory_alerts",
  );
  return {
    totalProducts: products?.total ?? 0,
    publishedProducts: products?.published ?? 0,
    totalOrders: orders?.total ?? 0,
    pendingOrders: orders?.pending ?? 0,
    paidOrders: orders?.paid ?? 0,
    revenue: Number(orders?.revenue ?? 0),
    inventoryAlerts: alerts?.n ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Admin: update order status
// ---------------------------------------------------------------------------

export class OrderStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStatusError";
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string, actorId?: string): Promise<void> {
  const transitions: Record<string, Set<string>> = {
    pending_payment: new Set(["paid", "cancelled"]),
    paid: new Set(["preparing", "cancelled"]),
    preparing: new Set(["shipped", "cancelled"]),
    shipped: new Set(["delivered"]),
    delivered: new Set(["returned"]),
    cancelled: new Set(),
    returned: new Set(),
  };
  if (!transitions[newStatus]) throw new OrderStatusError("Status de pedido inválido.");
  const sql = await getSql();
  const [order] = await sql.query<{
    id: string; status: string; number: string; customer_name: string | null;
    customer_email: string | null; guest_email: string | null; total: string | number;
  }>(
    "select id, status::text, number, customer_name, customer_email, guest_email, total from orders where id = $1::uuid",
    [orderId],
  );
  if (!order) throw new OrderStatusError("Pedido não encontrado.");
  if (!transitions[order.status]?.has(newStatus)) {
    throw new OrderStatusError(`Transição não permitida: ${order.status} → ${newStatus}.`);
  }

  if (newStatus === "cancelled") {
    await sql.query("select cancel_order($1::uuid, 'Cancelado pelo admin')", [orderId]);
  } else {
    await sql.query("update orders set status = $1::order_status where id = $2::uuid", [newStatus, orderId]);
    await sql.query(
      "insert into order_events (order_id, type, from_status, to_status, message, actor_id) values ($1::uuid, 'status_changed', $2, $3, $4, $5::uuid)",
      [orderId, order.status, newStatus, `Status alterado para ${newStatus}`, actorId ?? null],
    );
  }
  await sql.query(
    "insert into audit_log (actor_id, action, entity, entity_id, changes) values ($1::uuid, 'order_status_changed', 'orders', $2, $3::jsonb)",
    [actorId ?? null, orderId, JSON.stringify({ from: order.status, to: newStatus })],
  );

  const recipient = order.customer_email ?? order.guest_email;
  const templates: Partial<Record<string, EmailTemplateKey>> = {
    paid: "order_paid", shipped: "order_shipped", delivered: "order_delivered", cancelled: "order_cancelled",
  };
  const template = templates[newStatus];
  if (recipient && template) {
    void sendTransactionalEmail({
      to: recipient,
      template,
      variables: {
        name: order.customer_name ?? "Cliente",
        order_number: order.number,
        total: `R$ ${Number(order.total).toFixed(2).replace(".", ",")}`,
      },
    }).catch((error) => console.error("[email] falha ao notificar mudança de pedido:", error));
  }
}

export type AdminShipmentInput = {
  status: "pending" | "ready" | "shipped" | "delivered" | "failed";
  carrier?: string;
  service?: string;
  trackingCode?: string;
};

export async function upsertAdminShipment(orderId: string, input: AdminShipmentInput, actorId?: string) {
  const sql = await getSql();
  const [order] = await sql.query<{ id: string; status: string }>("select id, status::text from orders where id = $1::uuid", [orderId]);
  if (!order) throw new OrderStatusError("Pedido não encontrado.");
  if (["pending_payment", "cancelled", "returned"].includes(order.status)) {
    throw new OrderStatusError("Este pedido não pode receber uma remessa neste status.");
  }
  const status = input.status;
  const [shipment] = await sql.query<{ id: string }>("select id from shipments where order_id = $1::uuid order by created_at desc limit 1", [orderId]);
  const values = [status, input.carrier?.trim() || null, input.service?.trim() || null, input.trackingCode?.trim() || null, orderId, actorId ?? null];
  if (shipment) {
    await sql.query(
      `update shipments set status = $1::shipment_status, carrier = $2, service = $3, tracking_code = $4,
       shipped_at = case when $1::shipment_status in ('shipped', 'delivered') then coalesce(shipped_at, now()) else shipped_at end,
       delivered_at = case when $1::shipment_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end
       where id = $5::uuid`,
      values.slice(0, 5),
    );
  } else {
    await sql.query(
      `insert into shipments (order_id, status, carrier, service, tracking_code, shipped_at, delivered_at)
       values ($5::uuid, $1::shipment_status, $2, $3, $4,
         case when $1::shipment_status in ('shipped', 'delivered') then now() end,
         case when $1::shipment_status = 'delivered' then now() end)`,
      values,
    );
  }
  await sql.query(
    "insert into order_events (order_id, type, message, actor_id) values ($1::uuid, 'shipment', $2, $3::uuid)",
    [orderId, `Remessa atualizada: ${status}${input.trackingCode ? ` · ${input.trackingCode.trim()}` : ""}`, actorId ?? null],
  );
  await sql.query(
    "insert into audit_log (actor_id, action, entity, entity_id, changes) values ($1::uuid, 'shipment_updated', 'orders', $2, $3::jsonb)",
    [actorId ?? null, orderId, JSON.stringify({ status, carrier: input.carrier?.trim() || null, service: input.service?.trim() || null, tracking_code: input.trackingCode?.trim() || null })],
  );
}

// ---------------------------------------------------------------------------
// Admin: products list (includes drafts and archived)
// ---------------------------------------------------------------------------

export type AdminProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  condition: string;
  status: string;
  categoryName: string;
  price: number;
  image: string | null;
  available: number;
};

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string; slug: string; sku: string; name: string; condition: string; status: string;
    cat_name: string; price: string | number; image: string | null; avail: number;
  }>(
    `select p.id, p.slug, p.sku, p.name, p.condition::text, p.status::text,
            c.name as cat_name,
            coalesce((select v.price from product_variants v where v.product_id = p.id and v.is_active order by v.price limit 1), 0) as price,
            (select m.url from product_media m where m.product_id = p.id order by m.position limit 1) as image,
            coalesce((select sum(il.on_hand - il.reserved) from inventory_levels il join product_variants v on v.id = il.variant_id where v.product_id = p.id), 0)::int
              + (select count(*) from inventory_units u where u.product_id = p.id and u.status = 'disponivel')::int as avail
     from products p
     join categories c on c.id = p.category_id
     order by p.status = 'published' desc, p.updated_at desc`,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    condition: r.condition,
    status: r.status,
    categoryName: r.cat_name,
    price: Number(r.price),
    image: r.image,
    available: r.avail,
  }));
}
