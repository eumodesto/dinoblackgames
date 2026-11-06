/** Tipos trocados entre o navegador e as rotas /api/checkout (sem nada de servidor aqui). */

export type CartItemInput = {
  slug: string;
  color?: string;
  storage?: string;
  qty: number;
};

export type QuoteLine = {
  slug: string;
  name?: string;
  sku?: string;
  image?: string | null;
  options?: Record<string, string>;
  condition?: string;
  qty: number;
  unitPrice?: number;
  listPrice?: number;
  available?: number;
  unique?: boolean;
  ok: boolean;
  reason?: string | null;
};

export type CouponResult = { ok: boolean; message: string; code?: string; discount?: number };

export type ShippingChoice = { id: string; name: string; price: number; etaDays: number; time: string };

export type QuoteResponse = {
  lines: QuoteLine[];
  allOk: boolean;
  subtotal: number;
  discount: number;
  coupon: CouponResult | null;
  weightGrams: number;
  shipping: ShippingChoice[];
};

export type AddressInput = {
  recipient: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export type CustomerInput = { name: string; email: string; phone: string };

export type OrderRequest = {
  items: CartItemInput[];
  customer: CustomerInput;
  address: AddressInput;
  shippingId: string;
  coupon?: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
};

export type OrderCreated = { number: string; token: string; total: number; subtotal: number; discount: number; shipping: number };

export type PaymentDto = {
  status: "pending" | "authorized" | "paid" | "failed" | "expired" | "refunded";
  method: "pix" | "credit_card" | "boleto";
  statusDetail: string | null;
  installments: number;
  pix?: { qrCode: string; qrCodeBase64?: string; expiresAt?: string };
  boleto?: { url?: string; barcode?: string };
};

export type OrderStatusValue = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "returned";

export type OrderDto = {
  number: string;
  status: OrderStatusValue;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  shippingMethod: string;
  etaDays: number | null;
  placedAt: string;
  /** Prazo para pagar; depois disso o pedido é cancelado e o estoque volta. */
  expiresAt: string | null;
  customer: { name: string | null; email: string | null };
  address: Partial<AddressInput> | null;
  items: { name: string; image: string | null; options: Record<string, string>; qty: number; unitPrice: number; condition: string }[];
  payment: PaymentDto | null;
  simulated: boolean;
};

export type PayResponse = { order: OrderDto; message?: string };

export const ORDER_PAY_WINDOW_MINUTES = 30;

export function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
