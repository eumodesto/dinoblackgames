import "server-only";
import { CheckoutError } from "./checkout";
import { getSql } from "./sql";
import type { FlashDeal, HeroSlide } from "@/lib/types";

/**
 * Destaques da home ligados ao cadastro do produto:
 *  - hero  = slider grande à esquerda (até 10 produtos)
 *  - flash = cartão "Flash Drop" à direita (até 5 produtos)
 * Nome, imagem, preço, desconto, avaliação, vendidos e estoque vêm do produto; aqui ficam só os textos/opções do destaque.
 */
export type HighlightSlot = "hero" | "flash";
export const HIGHLIGHT_LIMITS: Record<HighlightSlot, number> = { hero: 10, flash: 5 };
const SLOT_LABEL: Record<HighlightSlot, string> = { hero: "slider principal", flash: "Flash Drop" };

export type HighlightForm = {
  enabled: boolean;
  position: string;
  eyebrow: string;
  headline: string;
  description: string;
  ctaLabel: string;
  imageUrl: string;
  badge: string;
  endsAt: string; // ISO (ou vazio)
};

export type AdminHighlights = {
  highlights: Record<HighlightSlot, HighlightForm>;
  /** Quantos produtos já ocupam cada vaga, sem contar o produto aberto. */
  usedByOthers: Record<HighlightSlot, number>;
  limits: Record<HighlightSlot, number>;
};

const emptyForm = (): HighlightForm => ({ enabled: false, position: "", eyebrow: "", headline: "", description: "", ctaLabel: "", imageUrl: "", badge: "", endsAt: "" });

function iso(value: unknown): string {
  if (!value) return "";
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

async function usedByOthers(productId: string | null): Promise<Record<HighlightSlot, number>> {
  const sql = await getSql();
  const rows = productId
    ? await sql.query<{ slot: HighlightSlot; n: number }>("select slot, count(*)::int as n from product_highlights where product_id <> $1::uuid group by slot", [productId])
    : await sql.query<{ slot: HighlightSlot; n: number }>("select slot, count(*)::int as n from product_highlights group by slot");
  const result: Record<HighlightSlot, number> = { hero: 0, flash: 0 };
  for (const row of rows) result[row.slot] = row.n;
  return result;
}

/** Destaques de um produto (ou o formulário vazio de um produto novo) e a ocupação das vagas pelos demais. */
export async function getAdminHighlights(productId: string | null): Promise<AdminHighlights> {
  const sql = await getSql();
  const highlights = { hero: emptyForm(), flash: emptyForm() };
  if (productId) {
    const rows = await sql.query<{
      slot: HighlightSlot; position: number; is_active: boolean; eyebrow: string | null; headline: string | null; description: string | null;
      cta_label: string | null; image_url: string | null; badge: string | null; ends_at: string | null;
    }>("select slot, position, is_active, eyebrow, headline, description, cta_label, image_url, badge, ends_at from product_highlights where product_id = $1::uuid", [productId]);
    for (const r of rows) {
      highlights[r.slot] = {
        enabled: r.is_active, position: String(r.position), eyebrow: r.eyebrow ?? "", headline: r.headline ?? "", description: r.description ?? "",
        ctaLabel: r.cta_label ?? "", imageUrl: r.image_url ?? "", badge: r.badge ?? "", endsAt: iso(r.ends_at),
      };
    }
  }
  return { highlights, usedByOthers: await usedByOthers(productId), limits: HIGHLIGHT_LIMITS };
}

function clean(value: unknown, max: number, label: string): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (text.length > max) throw new CheckoutError(`${label} deve ter no máximo ${max} caracteres.`);
  return text;
}

function cleanUrl(value: unknown): string | null {
  const text = clean(value, 600, "URL da imagem");
  if (!text) return null;
  if (!/^(https?:\/\/|\/)/i.test(text)) throw new CheckoutError("A imagem do destaque deve ser uma URL (https://…) ou um caminho que comece com /.");
  return text;
}

export type HighlightOps = Array<{ slot: HighlightSlot; remove: boolean; params: unknown[] }>;

/** Valida os destaques (campos e limite das vagas) SEM gravar nada. Chame antes de criar/alterar o produto. */
export async function prepareProductHighlights(productId: string | null, input: unknown): Promise<HighlightOps> {
  if (!input || typeof input !== "object") return [];
  const data = input as Partial<Record<HighlightSlot, Partial<HighlightForm>>>;
  const others = await usedByOthers(productId);
  const ops: HighlightOps = [];
  for (const slot of ["hero", "flash"] as const) {
    const item = data[slot];
    if (!item) continue;
    if (!item.enabled) {
      ops.push({ slot, remove: true, params: [] });
      continue;
    }
    if (others[slot] >= HIGHLIGHT_LIMITS[slot]) {
      throw new CheckoutError(`O ${SLOT_LABEL[slot]} já tem ${HIGHLIGHT_LIMITS[slot]} produtos. Remova outro produto dessa vaga antes de adicionar este.`);
    }
    let endsAt: string | null = null;
    if (typeof item.endsAt === "string" && item.endsAt.trim()) {
      const date = new Date(item.endsAt);
      if (Number.isNaN(date.getTime())) throw new CheckoutError("Data de fim da oferta inválida.");
      endsAt = date.toISOString();
    }
    const parsedPosition = Number(item.position);
    const position = Number.isFinite(parsedPosition) && item.position !== "" ? Math.max(0, Math.min(999, Math.trunc(parsedPosition))) : others[slot] + 1;
    ops.push({
      slot,
      remove: false,
      params: [
        slot, position,
        slot === "hero" ? clean(item.eyebrow, 80, "Texto acima do título") : null,
        slot === "hero" ? clean(item.headline, 120, "Título do slide") : null,
        slot === "hero" ? clean(item.description, 220, "Descrição do slide") : null,
        slot === "hero" ? clean(item.ctaLabel, 40, "Texto do botão") : null,
        slot === "hero" ? cleanUrl(item.imageUrl) : null,
        slot === "flash" ? clean(item.badge, 40, "Selo") : null,
        slot === "flash" ? endsAt : null,
      ],
    });
  }
  return ops;
}

/** Aplica as operações validadas por prepareProductHighlights. */
export async function applyProductHighlights(productId: string, ops: HighlightOps): Promise<void> {
  const sql = await getSql();
  for (const op of ops) {
    if (op.remove) {
      await sql.query("delete from product_highlights where product_id = $1::uuid and slot = $2", [productId, op.slot]);
      continue;
    }
    await sql.query(
      `insert into product_highlights (product_id, slot, position, is_active, eyebrow, headline, description, cta_label, image_url, badge, ends_at)
       values ($1::uuid, $2, $3::int, true, $4, $5, $6, $7, $8, $9, $10::timestamptz)
       on conflict (product_id, slot) do update set position = excluded.position, is_active = true, eyebrow = excluded.eyebrow, headline = excluded.headline,
         description = excluded.description, cta_label = excluded.cta_label, image_url = excluded.image_url, badge = excluded.badge, ends_at = excluded.ends_at`,
      [productId, ...op.params],
    );
  }
}

type HighlightRow = {
  hl_id: string; hl_eyebrow: string | null; hl_headline: string | null; hl_description: string | null; hl_cta: string | null;
  hl_image: string | null; hl_badge: string | null; hl_ends_at: string | null; hl_tagline: string | null;
  id: string; slug: string; name: string; image_url: string | null;
  current_price: string | number; list_price: string | number; discount_percent: number | null;
  rating: string | number | null; sold_count: number; available: number;
};

const HIGHLIGHT_SELECT = `
  select h.id as hl_id, h.eyebrow as hl_eyebrow, h.headline as hl_headline, h.description as hl_description, h.cta_label as hl_cta,
         h.image_url as hl_image, h.badge as hl_badge, h.ends_at as hl_ends_at, pr.tagline as hl_tagline,
         l.id, l.slug, l.name, l.image_url, l.current_price, l.list_price, l.discount_percent, l.rating, l.sold_count, l.available
  from product_highlights h
  join v_product_listing l on l.id = h.product_id
  join products pr on pr.id = h.product_id
  where h.slot = $1 and h.is_active
  order by h.position, h.created_at
  limit $2::int`.trim(); // o exec_sql (caminho REST) só reconhece consulta que começa exatamente por "select"

/** Slider e Flash Drop da home: só produtos publicados (a view já filtra), na ordem definida no admin. */
export async function getHomeHighlights(): Promise<{ slides: HeroSlide[]; deals: FlashDeal[] }> {
  const sql = await getSql();
  const [heroRows, flashRows] = await Promise.all([
    sql.query<HighlightRow>(HIGHLIGHT_SELECT, ["hero", HIGHLIGHT_LIMITS.hero]),
    sql.query<HighlightRow>(HIGHLIGHT_SELECT, ["flash", HIGHLIGHT_LIMITS.flash]),
  ]);

  const slides: HeroSlide[] = heroRows.map((r) => ({
    id: r.hl_id,
    eyebrow: r.hl_eyebrow ?? "",
    title: r.hl_headline || r.name,
    description: r.hl_description || r.hl_tagline || "",
    cta: "Explorar agora",
    href: `/produto/${r.slug}`,
    image: r.hl_image || r.image_url || "",
  }));
  heroRows.forEach((r, index) => { if (r.hl_cta) slides[index].cta = r.hl_cta; });

  const now = Date.now();
  const deals: FlashDeal[] = flashRows
    .filter((r) => !r.hl_ends_at || new Date(r.hl_ends_at).getTime() > now) // oferta encerrada some sozinha
    .map((r) => {
      const price = Number(r.current_price);
      const listPrice = Number(r.list_price);
      const sold = r.sold_count ?? 0;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        price,
        compareAt: listPrice > price ? listPrice : null,
        discount: r.discount_percent,
        image: r.image_url ?? "",
        rating: r.rating != null ? Number(r.rating) : null,
        sold,
        available: r.available,
        flashBadge: r.hl_badge || "Oferta exclusiva",
        endsAt: r.hl_ends_at ? new Date(r.hl_ends_at).toISOString() : null,
        soldPercent: sold + r.available > 0 ? Math.max(6, Math.min(98, Math.round((sold / (sold + r.available)) * 100))) : 0,
      };
    });

  return { slides, deals };
}
