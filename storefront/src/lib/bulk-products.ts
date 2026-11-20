/**
 * Edição em lote de produtos: validação e SQL. Módulo puro (sem imports) para o servidor e os testes usarem o mesmo código.
 * Preços e promoções valem para todas as variações dos produtos escolhidos.
 */
export const BULK_MAX = 200;
export const BULK_ACTIONS = ["publish", "unpublish", "archive", "visibility", "category", "badge", "warranty", "installments", "price", "promo"] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];
export type Rounding = "none" | "ends90" | "whole";
export type PriceMode = "percent" | "amount" | "set";

export type BulkParams =
  | { action: "publish" | "unpublish" | "archive" }
  | { action: "visibility"; value: "visible" | "hidden" }
  | { action: "category"; categoryId: string }
  | { action: "badge"; text: string }
  | { action: "warranty"; months: number }
  | { action: "installments"; count: number }
  | { action: "price"; mode: PriceMode; value: number; rounding: Rounding }
  | { action: "promo"; mode: "apply"; percent: number; rounding: Rounding }
  | { action: "promo"; mode: "remove" };

export const BULK_LABEL: Record<BulkAction, string> = {
  publish: "Publicar na loja",
  unpublish: "Despublicar (rascunho)",
  archive: "Arquivar",
  visibility: "Visibilidade nas listas",
  category: "Mover de categoria",
  badge: "Selo do produto",
  warranty: "Garantia",
  installments: "Parcelamento máximo",
  price: "Ajustar preço",
  promo: "Promoção (de/por)",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN);
const rounding = (v: unknown): Rounding => (v === "ends90" || v === "whole" ? v : "none");

export function validateBulk(raw: unknown): { ok: true; ids: string[]; params: BulkParams } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Pedido inválido." };
  const body = raw as { ids?: unknown; action?: unknown; params?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length === 0) return { ok: false, error: "Selecione pelo menos um produto." };
  if (body.ids.length > BULK_MAX) return { ok: false, error: `Selecione no máximo ${BULK_MAX} produtos por vez.` };
  const ids = [...new Set(body.ids.map(String))];
  if (!ids.every((id) => UUID.test(id))) return { ok: false, error: "Há produtos inválidos na seleção." };
  const action = body.action as BulkAction;
  if (!(BULK_ACTIONS as readonly string[]).includes(action)) return { ok: false, error: "Ação inválida." };
  const p = (body.params && typeof body.params === "object" ? body.params : {}) as Record<string, unknown>;

  switch (action) {
    case "publish":
    case "unpublish":
    case "archive":
      return { ok: true, ids, params: { action } };
    case "visibility":
      return p.value === "visible" || p.value === "hidden" ? { ok: true, ids, params: { action, value: p.value } } : { ok: false, error: "Escolha visível ou oculto." };
    case "category":
      return typeof p.categoryId === "string" && UUID.test(p.categoryId) ? { ok: true, ids, params: { action, categoryId: p.categoryId } } : { ok: false, error: "Escolha a categoria." };
    case "badge": {
      const text = typeof p.text === "string" ? p.text.trim() : "";
      return text.length <= 24 ? { ok: true, ids, params: { action, text } } : { ok: false, error: "O selo aceita até 24 caracteres." };
    }
    case "warranty": {
      const months = num(p.months);
      return Number.isInteger(months) && months >= 0 && months <= 60 ? { ok: true, ids, params: { action, months } } : { ok: false, error: "A garantia vai de 0 a 60 meses." };
    }
    case "installments": {
      const count = num(p.count);
      return Number.isInteger(count) && count >= 1 && count <= 12 ? { ok: true, ids, params: { action, count } } : { ok: false, error: "O parcelamento vai de 1 a 12x." };
    }
    case "price": {
      const mode = p.mode as PriceMode;
      const value = num(p.value);
      if (mode !== "percent" && mode !== "amount" && mode !== "set") return { ok: false, error: "Escolha como ajustar o preço." };
      if (!Number.isFinite(value)) return { ok: false, error: "Informe o valor do ajuste." };
      if (mode === "percent" && (value < -90 || value > 500 || value === 0)) return { ok: false, error: "O percentual deve ficar entre −90% e +500% (e diferente de zero)." };
      if (mode === "amount" && (Math.abs(value) > 100000 || value === 0)) return { ok: false, error: "O ajuste em reais deve ser diferente de zero e de até R$ 100.000." };
      if (mode === "set" && (value < 0.01 || value > 1_000_000)) return { ok: false, error: "O novo preço deve ficar entre R$ 0,01 e R$ 1.000.000." };
      return { ok: true, ids, params: { action, mode, value, rounding: rounding(p.rounding) } };
    }
    case "promo": {
      if (p.mode === "remove") return { ok: true, ids, params: { action, mode: "remove" } };
      const percent = num(p.percent);
      if (p.mode !== "apply" || !Number.isFinite(percent) || percent < 1 || percent > 90) return { ok: false, error: "O desconto da promoção vai de 1% a 90%." };
      return { ok: true, ids, params: { action, mode: "apply", percent, rounding: rounding(p.rounding) } };
    }
  }
}

/** Lista de ids no formato de array do Postgres (os ids já foram validados como UUID). */
export const idsLiteral = (ids: string[]) => `{${ids.join(",")}}`;

/** Arredonda um valor em SQL: nenhum (centavos), inteiro ou o ",90" mais próximo. */
function rounded(expr: string, mode: Rounding) {
  if (mode === "ends90") return `greatest(0.90, round((${expr}) - 0.90) + 0.90)`;
  if (mode === "whole") return `round(${expr})`;
  return `round((${expr}), 2)`;
}

/** Colunas e expressões de preço novo/de-por por variação (usado no UPDATE e na pré-visualização). */
function priceParts(p: BulkParams): { newPrice: string; newCompare: string; values: unknown[] } | null {
  if (p.action === "price") {
    const raw = p.mode === "percent" ? "price * (1 + $2::numeric / 100)" : p.mode === "amount" ? "price + $2::numeric" : "$2::numeric";
    const np = `greatest(0, ${rounded(raw, p.rounding)})`;
    // Se o preço novo passa do "de", a promoção acaba (o banco exige "de" >= "por").
    return { newPrice: np, newCompare: `case when compare_at is not null and compare_at < ${np} then null else compare_at end`, values: [p.value] };
  }
  if (p.action === "promo" && p.mode === "apply") {
    // Sempre calcula sobre o preço "de" (ou o atual, se não há promoção): repetir a ação dá o mesmo resultado.
    const base = "coalesce(compare_at, price)";
    return { newPrice: `least(${base}, greatest(0.01, ${rounded(`${base} * (1 - $2::numeric / 100)`, p.rounding)}))`, newCompare: base, values: [p.percent] };
  }
  if (p.action === "promo" && p.mode === "remove") {
    return { newPrice: "coalesce(compare_at, price)", newCompare: "null::numeric", values: [] };
  }
  return null;
}

export type BulkStatement = { sql: string; values: unknown[] };

/** O comando que aplica a ação. $1 é sempre a lista de ids. */
export function bulkStatement(ids: string[], p: BulkParams): BulkStatement {
  const first = idsLiteral(ids);
  const touch = "updated_at = now()";
  switch (p.action) {
    case "publish":
    case "unpublish":
    case "archive": {
      const status = p.action === "publish" ? "published" : p.action === "archive" ? "archived" : "draft";
      return { sql: `update products set status = $2::publish_status, ${touch}, published_at = case when $2 = 'published' then coalesce(published_at, now()) else published_at end where id = any($1::uuid[])`, values: [first, status] };
    }
    case "visibility":
      return { sql: `update products set visibility = $2, ${touch} where id = any($1::uuid[])`, values: [first, p.value] };
    case "category":
      return { sql: `update products set category_id = $2::uuid, ${touch} where id = any($1::uuid[]) and exists (select 1 from categories where id = $2::uuid)`, values: [first, p.categoryId] };
    case "badge":
      return { sql: `update products set badge = nullif($2, ''), ${touch} where id = any($1::uuid[])`, values: [first, p.text] };
    case "warranty":
      return { sql: `update products set warranty_months = $2::int, ${touch} where id = any($1::uuid[])`, values: [first, p.months] };
    case "installments":
      return { sql: `update product_variants set max_installments = $2::int, ${touch} where product_id = any($1::uuid[])`, values: [first, p.count] };
    case "price":
    case "promo": {
      const parts = priceParts(p)!;
      const needsValue = parts.values.length > 0;
      return {
        sql: `update product_variants v set price = c.np, compare_at = c.nc, ${touch}
              from (select id, ${parts.newPrice} as np, ${parts.newCompare} as nc from product_variants where product_id = any($1::uuid[])) c
              where v.id = c.id`,
        values: needsValue ? [first, parts.values[0]] : [first],
      };
    }
  }
}

/** Pré-visualização de preço/promoção: antes e depois de algumas variações, e quantas serão alteradas. */
export function pricePreviewStatements(ids: string[], p: BulkParams): { sample: BulkStatement; totals: BulkStatement } | null {
  const parts = priceParts(p);
  if (!parts) return null;
  const first = idsLiteral(ids);
  const values = parts.values.length > 0 ? [first, parts.values[0]] : [first];
  return {
    sample: {
      sql: `select pr.name, v.sku, v.price as old_price, v.compare_at as old_compare, v.new_price, v.new_compare
            from (select product_id, sku, price, compare_at, ${parts.newPrice} as new_price, ${parts.newCompare} as new_compare from product_variants where product_id = any($1::uuid[])) v
            join products pr on pr.id = v.product_id order by pr.name, v.sku limit 8`,
      values,
    },
    totals: { sql: `select count(distinct product_id)::int as products, count(*)::int as variants from product_variants where product_id = any($1::uuid[])`, values: [first] },
  };
}
