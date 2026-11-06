import "server-only";
import { findShipping, isValidCep, onlyDigits, shippingOptions } from "@/lib/shipping";
import {
  ORDER_PAY_WINDOW_MINUTES,
  type AddressInput,
  type CartItemInput,
  type CustomerInput,
  type OrderCreated,
  type OrderDto,
  type OrderRequest,
  type PayResponse,
  type PaymentDto,
  type QuoteResponse,
} from "@/lib/checkout-types";
import { env, mpMode } from "./env";
import { MpError, mpCreatePayment, mpGetPayment, toSyncPayload, type MpPayment } from "./mp";
import { getSql } from "./sql";

/** Erro com mensagem segura para mostrar ao cliente. */
export class CheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "CheckoutError";
  }
}

// ---------------------------------------------------------------------------- validação de entrada
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseItems(raw: unknown): CartItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new CheckoutError("Seu carrinho está vazio.");
  if (raw.length > 20) throw new CheckoutError("Carrinho com itens demais.");
  return raw.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const slug = str(o.slug, 120);
    const qty = Number(o.qty);
    if (!slug || !Number.isInteger(qty) || qty < 1 || qty > 20) throw new CheckoutError("Item inválido no carrinho.");
    return { slug, qty, color: str(o.color, 60) || undefined, storage: str(o.storage, 60) || undefined };
  });
}

export function parseCustomer(raw: unknown): CustomerInput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const name = str(o.name, 120);
  const email = str(o.email, 160).toLowerCase();
  const phone = onlyDigits(str(o.phone, 30));
  if (name.split(/\s+/).length < 2 || name.length < 5) throw new CheckoutError("Informe nome e sobrenome.");
  if (!EMAIL.test(email)) throw new CheckoutError("Informe um e-mail válido.");
  if (phone.length < 10 || phone.length > 11) throw new CheckoutError("Informe um telefone com DDD.");
  return { name, email, phone };
}

export function parseAddress(raw: unknown, fallbackRecipient: string, fallbackPhone: string): AddressInput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const cep = onlyDigits(str(o.cep, 12));
  const a: AddressInput = {
    recipient: str(o.recipient, 120) || fallbackRecipient,
    phone: onlyDigits(str(o.phone, 30)) || fallbackPhone,
    cep,
    street: str(o.street, 160),
    number: str(o.number, 20),
    complement: str(o.complement, 80) || undefined,
    district: str(o.district, 100),
    city: str(o.city, 100),
    state: str(o.state, 2).toUpperCase(),
  };
  if (!isValidCep(cep)) throw new CheckoutError("CEP inválido.");
  if (!a.street || !a.number || !a.district || !a.city || a.state.length !== 2) throw new CheckoutError("Complete o endereço de entrega.");
  return a;
}

// ---------------------------------------------------------------------------- cotação
const itemsJson = (items: CartItemInput[]) => JSON.stringify(items.map(({ slug, color, storage, qty }) => ({ slug, color, storage, qty })));

export async function quote(items: CartItemInput[], cep: string | null, coupon: string | null, email: string | null): Promise<QuoteResponse> {
  const sql = await getSql();
  const [row] = await sql.query<{ r: Omit<QuoteResponse, "shipping"> }>(
    "select checkout_quote($1::jsonb, $2, null, $3) as r",
    [itemsJson(items), coupon, email],
  );
  const r = row.r;
  return { ...r, shipping: cep ? shippingOptions(cep, r.weightGrams) : [] };
}

// ---------------------------------------------------------------------------- pedido
export async function createOrder(req: OrderRequest): Promise<OrderCreated> {
  const items = parseItems(req.items);
  const customer = parseCustomer(req.customer);
  const address = parseAddress(req.address, customer.name, customer.phone);
  if (!req.acceptTerms) throw new CheckoutError("É preciso aceitar os termos de compra.");

  const sql = await getSql();
  // O frete que vale é o do servidor, recalculado pelo CEP e pelo peso real dos itens.
  const q = await quote(items, address.cep, null, customer.email);
  if (!q.allOk) {
    const bad = q.lines.find((l) => !l.ok);
    throw new CheckoutError(`${bad?.name ?? bad?.slug}: ${bad?.reason ?? "indisponível"}`, 409);
  }
  const ship = findShipping(address.cep, q.weightGrams, req.shippingId);
  if (!ship) throw new CheckoutError("Escolha uma forma de entrega.");

  try {
    const [row] = await sql.query<{ r: { number: string; token: string; total: string | number; subtotal: string | number; discount: string | number; shipping: string | number } }>(
      "select create_checkout_order($1::jsonb, $2::jsonb, $3::jsonb, $4, $5, $6, $7, $8, null) as r",
      [itemsJson(items), JSON.stringify(customer), JSON.stringify(address), ship.name, ship.price, ship.etaDays, str(req.coupon, 40) || null, true],
    );
    if (req.marketingOptIn) {
      await sql.query(
        "insert into consents (email, channel, purpose, granted, source) values ($1, 'email', 'marketing', true, 'checkout')",
        [customer.email],
      );
    }
    const r = row.r;
    return { number: r.number, token: r.token, total: Number(r.total), subtotal: Number(r.subtotal), discount: Number(r.discount), shipping: Number(r.shipping) };
  } catch (e) {
    throw translateDbError(e);
  }
}

/** Erros que o banco levanta de propósito viram mensagens para o cliente; o resto não vaza. */
function translateDbError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  const known = [/estoque insuficiente/i, /Sem estoque/, /não está mais disponível/, /Unidade única/, /Cupom/i, /cupom/i, /Pré-venda/, /indisponível/i, /termos/i, /e-mail/i];
  if (known.some((k) => k.test(msg))) return new CheckoutError(msg.replace(/^error: /i, ""), 409);
  console.error("[checkout] erro inesperado no banco:", msg);
  return new CheckoutError("Não foi possível concluir o pedido agora. Tente novamente em instantes.", 500);
}

// ---------------------------------------------------------------------------- leitura do pedido
type OrderRow = {
  id: string;
  number: string;
  status: OrderDto["status"];
  total: string | number;
  subtotal: string | number;
  discount_total: string | number;
  shipping_total: string | number;
  shipping_method: string;
  shipping_eta_days: number | null;
  placed_at: string | Date;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: Partial<AddressInput> | null;
};
type PaymentRow = {
  provider_ref: string | null;
  method: PaymentDto["method"];
  status: PaymentDto["status"];
  status_detail: string | null;
  installments: number;
  provider_data: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; barcode?: string; expiresAt?: string };
};

async function loadOrder(number: string, token: string) {
  if (!/^DB-\d{3,10}$/.test(number) || !/^[0-9a-f-]{36}$/i.test(token)) throw new CheckoutError("Pedido não encontrado.", 404);
  const sql = await getSql();
  const [order] = await sql.query<OrderRow>("select * from orders where number = $1 and public_token = $2::uuid", [number, token]);
  if (!order) throw new CheckoutError("Pedido não encontrado.", 404);
  return { sql, order };
}

async function toDto(sql: Awaited<ReturnType<typeof getSql>>, order: OrderRow): Promise<OrderDto> {
  const items = await sql.query<{ quantity: number; unit_price: string | number; snapshot: { name: string; image?: string | null; options?: Record<string, string>; condition?: string } }>(
    "select quantity, unit_price, snapshot from order_items where order_id = $1::uuid order by id",
    [order.id],
  );
  // Pagamento que vale: o pago, senão o mais recente.
  const [pay] = await sql.query<PaymentRow>(
    `select provider_ref, method, status, status_detail, installments, provider_data from payments
     where order_id = $1::uuid order by (status = 'paid') desc, created_at desc limit 1`,
    [order.id],
  );
  const placed = new Date(order.placed_at);
  let payment: PaymentDto | null = null;
  if (pay) {
    const d = pay.provider_data ?? {};
    payment = {
      status: pay.status,
      method: pay.method,
      statusDetail: pay.status_detail,
      installments: pay.installments,
      ...(pay.method === "pix" && d.qrCode ? { pix: { qrCode: d.qrCode, qrCodeBase64: d.qrCodeBase64, expiresAt: d.expiresAt } } : {}),
      ...(pay.method === "boleto" ? { boleto: { url: d.ticketUrl, barcode: d.barcode } } : {}),
    };
  }
  return {
    number: order.number,
    status: order.status,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount_total),
    shipping: Number(order.shipping_total),
    shippingMethod: order.shipping_method,
    etaDays: order.shipping_eta_days,
    placedAt: placed.toISOString(),
    expiresAt: order.status === "pending_payment" ? new Date(placed.getTime() + ORDER_PAY_WINDOW_MINUTES * 60_000).toISOString() : null,
    customer: { name: order.customer_name, email: order.customer_email },
    address: order.shipping_address,
    items: items.map((i) => ({
      name: i.snapshot.name,
      image: i.snapshot.image ?? null,
      options: i.snapshot.options ?? {},
      qty: i.quantity,
      unitPrice: Number(i.unit_price),
      condition: i.snapshot.condition ?? "novo",
    })),
    payment,
    simulated: mpMode() === "simulated",
  };
}

// ---------------------------------------------------------------------------- pagamento
const ALLOWED_METHOD = /^[a-z0-9_]{2,30}$/;

function buildMpBody(order: OrderRow, items: { name: string; qty: number; unitPrice: number }[], form: Record<string, unknown>) {
  const methodId = str(form.payment_method_id, 30);
  if (!ALLOWED_METHOD.test(methodId)) throw new CheckoutError("Forma de pagamento inválida.");
  const isPix = methodId === "pix";
  const isTicket = methodId === "bolbradesco" || methodId === "boleto";
  const isCard = !isPix && !isTicket;
  // Boleto fica fora até existir uma reserva de estoque mais longa que os 30 minutos do Pix e do cartão.
  if (isTicket) throw new CheckoutError("Boleto ainda não está disponível. Use cartão ou Pix.");

  const fullName = (order.customer_name ?? "").trim();
  const [first, ...rest] = fullName.split(/\s+/);
  const addr = order.shipping_address ?? {};
  const idf = ((form.payer as Record<string, unknown> | undefined)?.identification ?? {}) as Record<string, unknown>;
  const idType = str(idf.type, 6).toUpperCase();
  const idNumber = onlyDigits(str(idf.number, 20));
  const payer: Record<string, unknown> = {
    email: order.customer_email,
    first_name: first,
    last_name: rest.join(" ") || first,
  };
  if ((idType === "CPF" && idNumber.length === 11) || (idType === "CNPJ" && idNumber.length === 14)) {
    payer.identification = { type: idType, number: idNumber };
  } else if (isPix || isTicket) {
    throw new CheckoutError("Informe um CPF ou CNPJ válido para este meio de pagamento.");
  }
  if (isTicket) {
    payer.address = {
      zip_code: addr.cep,
      street_name: addr.street,
      street_number: addr.number,
      neighborhood: addr.district,
      city: addr.city,
      federal_unit: addr.state,
    };
  }

  const body: Record<string, unknown> = {
    // O valor vem do pedido gravado no servidor, nunca do navegador.
    transaction_amount: Number(order.total),
    description: `Pedido ${order.number} - DinoBlack Games`,
    payment_method_id: methodId,
    payer,
    external_reference: order.number,
    statement_descriptor: "DINOBLACK",
    additional_info: { items: items.map((i, n) => ({ id: String(n + 1), title: i.name, quantity: i.qty, unit_price: i.unitPrice })) },
  };
  if (isCard) {
    const token = str(form.token, 120);
    if (!token) throw new CheckoutError("Não foi possível ler os dados do cartão. Confira e tente de novo.");
    body.token = token;
    body.installments = Math.min(10, Math.max(1, Number(form.installments) || 1));
    if (form.issuer_id) body.issuer_id = Number(form.issuer_id);
  }
  if (isPix) {
    body.date_of_expiration = new Date(new Date(order.placed_at).getTime() + ORDER_PAY_WINDOW_MINUTES * 60_000).toISOString().replace("Z", "+00:00");
  }
  if (env.siteUrl.startsWith("https://")) body.notification_url = `${env.siteUrl}/api/webhooks/mercadopago`;
  return body;
}

async function syncPayment(sql: Awaited<ReturnType<typeof getSql>>, number: string, payment: MpPayment) {
  await sql.query("select sync_mp_payment($1, $2::jsonb) as r", [number, JSON.stringify(toSyncPayload(payment))]);
}

export async function payOrder(number: string, token: string, form: Record<string, unknown>): Promise<PayResponse> {
  const { sql, order } = await loadOrder(number, token);
  if (order.status !== "pending_payment") throw new CheckoutError("Este pedido não está aguardando pagamento.", 409);
  if (Date.now() > new Date(order.placed_at).getTime() + ORDER_PAY_WINDOW_MINUTES * 60_000) {
    throw new CheckoutError("O prazo para pagar este pedido terminou. Faça o pedido novamente.", 410);
  }

  const items = await sql.query<{ quantity: number; unit_price: string | number; snapshot: { name: string } }>(
    "select quantity, unit_price, snapshot from order_items where order_id = $1::uuid",
    [order.id],
  );
  const body = buildMpBody(order, items.map((i) => ({ name: i.snapshot.name, qty: i.quantity, unitPrice: Number(i.unit_price) })), form);

  // Mesma chave + mesmo pedido = o Mercado Pago não cobra duas vezes se o cliente clicar de novo.
  const attempt = (await sql.query<{ n: number }>("select count(*)::int as n from payments where order_id = $1::uuid", [order.id]))[0].n;
  let mp: MpPayment;
  try {
    mp = await mpCreatePayment(body, `${order.number}-${body.payment_method_id}-${attempt}`);
  } catch (e) {
    if (e instanceof MpError) {
      console.error("[checkout] Mercado Pago recusou a criação do pagamento:", e.status, e.message);
      throw new CheckoutError(
        e.status >= 500 ? "O Mercado Pago está indisponível agora. Tente novamente em instantes." : "Não foi possível processar o pagamento. Confira os dados e tente de novo.",
        e.status >= 500 ? 502 : 422,
      );
    }
    throw e;
  }

  await syncPayment(sql, order.number, mp);
  const [fresh] = await sql.query<OrderRow>("select * from orders where id = $1::uuid", [order.id]);
  const dto = await toDto(sql, fresh);
  const message =
    mp.status === "rejected" ? rejectionMessage(mp.status_detail ?? "") : mp.status === "approved" ? "Pagamento aprovado!" : undefined;
  return { order: dto, message };
}

function rejectionMessage(detail: string) {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "Cartão sem limite disponível. Tente outro cartão ou outra forma de pagamento.",
    cc_rejected_bad_filled_security_code: "Código de segurança incorreto.",
    cc_rejected_bad_filled_date: "Data de validade incorreta.",
    cc_rejected_bad_filled_other: "Confira os dados do cartão.",
    cc_rejected_call_for_authorize: "O banco pede autorização. Ligue para a operadora do cartão ou use outro meio.",
    cc_rejected_card_disabled: "Cartão desabilitado. Ative-o com o banco ou use outro.",
    cc_rejected_duplicated_payment: "Você já fez um pagamento igual a este.",
    cc_rejected_high_risk: "Não foi possível aprovar este pagamento. Tente outro meio de pagamento.",
  };
  return map[detail] ?? "O pagamento não foi aprovado. Tente outro cartão ou outra forma de pagamento.";
}

/** Consulta o pedido e, se houver pagamento pendente no Mercado Pago, confere o status agora (não depende só do webhook). */
export async function getOrderStatus(number: string, token: string, refresh = true): Promise<OrderDto> {
  const { sql, order } = await loadOrder(number, token);
  if (refresh && order.status === "pending_payment") {
    const pending = await sql.query<{ provider_ref: string }>(
      "select provider_ref from payments where order_id = $1::uuid and provider = 'mercadopago' and status in ('pending','authorized') and provider_ref is not null",
      [order.id],
    );
    for (const p of pending) {
      try {
        const mp = await mpGetPayment(p.provider_ref);
        if (mp) await syncPayment(sql, order.number, mp);
      } catch (e) {
        console.error("[checkout] falha ao conferir pagamento", p.provider_ref, e instanceof Error ? e.message : e);
      }
    }
    const [fresh] = await sql.query<OrderRow>("select * from orders where id = $1::uuid", [order.id]);
    return toDto(sql, fresh);
  }
  return toDto(sql, order);
}

/** O cliente desiste ou volta para editar os dados: cancela o pedido pendente e devolve o estoque. */
export async function cancelPendingOrder(number: string, token: string): Promise<void> {
  const { sql, order } = await loadOrder(number, token);
  if (order.status !== "pending_payment") throw new CheckoutError("Este pedido não pode mais ser cancelado.", 409);
  await sql.query("select cancel_order($1::uuid, 'Cancelado pelo cliente no checkout')", [order.id]);
}

// ---------------------------------------------------------------------------- webhook e rotinas
export async function handleMpNotification(paymentId: string): Promise<{ handled: boolean; reason?: string }> {
  if (!/^\d{3,20}$/.test(paymentId)) return { handled: false, reason: "id inválido" };
  const payment = await mpGetPayment(paymentId); // sempre da API: o corpo da notificação não é confiável
  if (!payment) return { handled: false, reason: "pagamento não encontrado" };
  const number = payment.external_reference;
  if (!number || !/^DB-\d{3,10}$/.test(number)) return { handled: false, reason: "sem referência de pedido" };
  const sql = await getSql();
  const found = await sql.query("select 1 as ok from orders where number = $1", [number]);
  if (found.length === 0) return { handled: false, reason: "pedido desconhecido" };
  await syncPayment(sql, number, payment);
  return { handled: true };
}

export async function expireOrders(minutes = ORDER_PAY_WINDOW_MINUTES): Promise<number> {
  const sql = await getSql();
  const [row] = await sql.query<{ n: number }>("select expire_pending_orders($1) as n", [minutes]);
  return row.n;
}
