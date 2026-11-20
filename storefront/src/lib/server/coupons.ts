import "server-only";
import { CheckoutError } from "./checkout";
import { getSql } from "./sql";

/** Formas de pagamento que um cupom pode exigir (o checkout só oferece Pix e cartão). */
export const COUPON_PAYMENT_METHODS = ["pix", "credit_card"] as const;
const SCOPES = ["all", "categories", "products"] as const;
const EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CouponInput = {
  code: string;
  title: string | null;
  kind: "percent" | "amount";
  value: number;
  minSubtotal: number;
  minQuantity: number;
  maxUses: number | null;
  maxUsesPerUser: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  autoApply: boolean;
  scope: (typeof SCOPES)[number];
  categoryIds: string[];
  productIds: string[];
  paymentMethods: string[];
  firstPurchaseOnly: boolean;
  allowedEmails: string[];
};

const bad = (message: string) => new CheckoutError(message, 400);
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function integer(value: unknown, label: string, { min, max, allowEmpty }: { min: number; max: number; allowEmpty?: boolean }): number | null {
  if (value === "" || value === null || value === undefined) {
    if (allowEmpty) return null;
    throw bad(`${label} é obrigatório.`);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${label} deve ser um número inteiro entre ${min} e ${max}.`);
  return n;
}

function dateOrNull(value: unknown, label: string): string | null {
  const v = text(value);
  if (!v) return null;
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) throw bad(`${label} inválido.`);
  return date.toISOString();
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => text(v)).filter(Boolean);
  if (typeof value === "string") return value.split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean);
  return [];
}

/** Valida e normaliza o corpo recebido do admin. Lança CheckoutError (400) com mensagem clara. */
export function parseCouponInput(body: Record<string, unknown>): CouponInput {
  const code = text(body.code).toUpperCase().replace(/\s+/g, "");
  if (code.length < 3 || code.length > 40 || !/^[A-Z0-9_-]+$/.test(code)) throw bad("O código deve ter de 3 a 40 caracteres, só letras, números, hífen ou sublinhado.");

  const kind = text(body.kind);
  if (kind !== "percent" && kind !== "amount") throw bad("Escolha o tipo de desconto.");
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) throw bad("Informe o valor do desconto.");
  if (kind === "percent" && value > 100) throw bad("O desconto percentual não pode passar de 100%.");

  const minSubtotal = body.minSubtotal === "" || body.minSubtotal == null ? 0 : Number(body.minSubtotal);
  if (!Number.isFinite(minSubtotal) || minSubtotal < 0) throw bad("Valor mínimo inválido.");

  const scope = text(body.scope) || "all";
  if (!(SCOPES as readonly string[]).includes(scope)) throw bad("Escopo do cupom inválido.");
  const categoryIds = scope === "categories" ? [...new Set(list(body.categoryIds))] : [];
  const productIds = scope === "products" ? [...new Set(list(body.productIds))] : [];
  if (categoryIds.concat(productIds).some((id) => !UUID.test(id))) throw bad("Categoria ou produto inválido.");
  if (scope === "categories" && categoryIds.length === 0) throw bad("Escolha ao menos uma categoria para este cupom.");
  if (scope === "products" && productIds.length === 0) throw bad("Escolha ao menos um produto para este cupom.");

  const paymentMethods = [...new Set(list(body.paymentMethods))];
  if (paymentMethods.some((m) => !(COUPON_PAYMENT_METHODS as readonly string[]).includes(m))) throw bad("Forma de pagamento inválida.");

  const allowedEmails = [...new Set(list(body.allowedEmails).map((e) => e.toLowerCase()))];
  if (allowedEmails.length > 500) throw bad("Informe no máximo 500 e-mails.");
  const invalidEmail = allowedEmails.find((e) => !EMAIL.test(e) || e.length > 160);
  if (invalidEmail) throw bad(`E-mail inválido: ${invalidEmail}`);

  const startsAt = dateOrNull(body.startsAt, "Início");
  const endsAt = dateOrNull(body.endsAt, "Fim");
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw bad("O fim do prazo deve ser depois do início.");

  return {
    code,
    title: text(body.title).slice(0, 80) || null,
    kind,
    value,
    minSubtotal,
    minQuantity: integer(body.minQuantity ?? 0, "Quantidade mínima", { min: 0, max: 999 }) ?? 0,
    maxUses: integer(body.maxUses, "Limite total", { min: 1, max: 10_000_000, allowEmpty: true }),
    maxUsesPerUser: integer(body.maxUsesPerUser ?? 1, "Limite por cliente", { min: 1, max: 1000 }) ?? 1,
    startsAt,
    endsAt,
    isActive: body.isActive !== false,
    autoApply: body.autoApply === true,
    scope: scope as CouponInput["scope"],
    categoryIds,
    productIds,
    paymentMethods,
    firstPurchaseOnly: body.firstPurchaseOnly === true,
    allowedEmails,
  };
}

/** Literal de array do Postgres (`{"a","b"}`) para parâmetros `::text[]`. */
const pgTextArray = (items: string[]) => `{${items.map((i) => `"${i.replace(/(["\\])/g, "\\$1")}"`).join(",")}}`;

const FIELDS_SQL = `code, title, kind, value, min_subtotal, min_quantity, max_uses, max_uses_per_user, starts_at, ends_at, is_active,
  auto_apply, scope, payment_methods, first_purchase_only, allowed_emails`;

function fieldParams(c: CouponInput): unknown[] {
  return [c.code, c.title, c.kind, c.value, c.minSubtotal, c.minQuantity, c.maxUses, c.maxUsesPerUser, c.startsAt, c.endsAt, c.isActive,
    c.autoApply, c.scope, pgTextArray(c.paymentMethods), c.firstPurchaseOnly, pgTextArray(c.allowedEmails)];
}

function translateWrite(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/coupons_code_key|duplicate key/i.test(message)) return bad("Já existe um cupom com esse código.");
  throw error;
}

async function replaceScope(couponId: string, c: CouponInput) {
  const sql = await getSql();
  await sql.query("delete from coupon_categories where coupon_id = $1::uuid", [couponId]);
  await sql.query("delete from coupon_products where coupon_id = $1::uuid", [couponId]);
  for (const id of c.categoryIds) await sql.query("insert into coupon_categories (coupon_id, category_id) values ($1::uuid, $2::uuid)", [couponId, id]);
  for (const id of c.productIds) await sql.query("insert into coupon_products (coupon_id, product_id) values ($1::uuid, $2::uuid)", [couponId, id]);
}

export async function createCoupon(c: CouponInput): Promise<string> {
  const sql = await getSql();
  try {
    const [row] = await sql.query<{ id: string }>(
      `insert into coupons (${FIELDS_SQL}) values ($1, $2, $3::discount_kind, $4, $5, $6::int, $7::int, $8::int, $9::timestamptz, $10::timestamptz, $11::boolean,
         $12::boolean, $13, $14::text[], $15::boolean, $16::text[]) returning id`,
      fieldParams(c),
    );
    await replaceScope(row.id, c);
    return row.id;
  } catch (error) {
    throw translateWrite(error);
  }
}

export async function updateCoupon(id: string, c: CouponInput): Promise<void> {
  const sql = await getSql();
  try {
    await sql.query(
      `update coupons set code = $1, title = $2, kind = $3::discount_kind, value = $4, min_subtotal = $5, min_quantity = $6::int, max_uses = $7::int,
         max_uses_per_user = $8::int, starts_at = $9::timestamptz, ends_at = $10::timestamptz, is_active = $11::boolean, auto_apply = $12::boolean,
         scope = $13, payment_methods = $14::text[], first_purchase_only = $15::boolean, allowed_emails = $16::text[] where id = $17::uuid`,
      [...fieldParams(c), id],
    );
    await replaceScope(id, c);
  } catch (error) {
    throw translateWrite(error);
  }
}

export async function listCoupons() {
  const sql = await getSql();
  return sql.query(
    `select c.*,
       (select count(*)::int from coupon_redemptions cr where cr.coupon_id = c.id) as redemption_count,
       coalesce((select jsonb_agg(cc.category_id) from coupon_categories cc where cc.coupon_id = c.id), '[]'::jsonb) as category_ids,
       coalesce((select jsonb_agg(cp.product_id) from coupon_products cp where cp.coupon_id = c.id), '[]'::jsonb) as product_ids
     from coupons c order by c.created_at desc`,
  );
}

/** Categorias e produtos para os seletores do formulário de cupom. */
export async function couponScopeOptions() {
  const sql = await getSql();
  const [categories, products] = await Promise.all([
    sql.query("select id, name from categories order by position, name"),
    sql.query("select id, name, sku from products where status <> 'archived' order by name limit 500"),
  ]);
  return { categories, products };
}
