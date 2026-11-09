"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/components/cart-provider";
import {
  ORDER_PAY_WINDOW_MINUTES,
  brl,
  type OrderCreated,
  type OrderDto,
  type PayResponse,
  type QuoteResponse,
} from "@/lib/checkout-types";
import { isValidCep, onlyDigits } from "@/lib/shipping";
import { PaymentBrick } from "./PaymentBrick";

type Config = { ready: boolean; db: boolean; payments: boolean; mode: "simulated" | "live"; publicKey: string; maxInstallments: number };

type Customer = { name: string; email: string; phone: string };
type Address = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string; recipient: string };
type Draft = { customer: Customer; address: Address; shippingId: string; couponInput: string; coupon: string; marketing: boolean };
type PendingOrder = OrderCreated & { placedAt: number };

const DRAFT_KEY = "dinoblack-checkout-draft";
const ORDER_KEY = "dinoblack-checkout-order";
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const EMPTY_CUSTOMER: Customer = { name: "", email: "", phone: "" };
const EMPTY_ADDRESS: Address = { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", recipient: "" };

const maskCep = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};
const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; code?: string } }> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  return { ok: res.ok, status: res.status, data };
}

function Field({
  id,
  label,
  error,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-dino-red">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  `h-12 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-dino-red focus:ring-2 focus:ring-dino-red/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-white ${
    invalid ? "border-dino-red" : "border-gray-200 dark:border-zinc-700"
  }`;

function Section({ n, title, done, children, locked }: { n: number; title: string; done?: boolean; children: ReactNode; locked?: boolean }) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:p-7" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 font-display text-xl font-black text-gray-900 dark:text-white">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${done ? "bg-emerald-500 text-white" : "bg-dino-red text-white"}`} aria-hidden>
          {done ? "✓" : n}
        </span>
        {title}
        {locked && <span className="ml-auto text-xs font-bold text-gray-500 dark:text-zinc-400">travado durante o pagamento</span>}
      </h2>
      {children}
    </section>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const { items, ready: cartReady, updateQty, removeItem, clear } = useCart();

  const [cfg, setCfg] = useState<Config | null>(null);
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [shippingId, setShippingId] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [touched, setTouched] = useState(false);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound">("idle");

  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [payError, setPayError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const draftLoaded = useRef(false);
  const paymentRef = useRef<HTMLDivElement>(null);

  // ---- configuração do servidor (modo, chave pública, se o banco está ativo)
  useEffect(() => {
    api<Config>("/api/checkout/config").then((r) => r.ok && setCfg(r.data));
  }, []);

  // ---- rascunho e pedido em andamento (sessão do navegador)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        setCustomer({ ...EMPTY_CUSTOMER, ...d.customer });
        setAddress({ ...EMPTY_ADDRESS, ...d.address });
        setShippingId(d.shippingId ?? "");
        setCouponInput(d.couponInput ?? "");
        setCoupon(d.coupon ?? "");
        setMarketing(Boolean(d.marketing));
      }
      const pending = sessionStorage.getItem(ORDER_KEY);
      if (pending) {
        const p = JSON.parse(pending) as PendingOrder;
        api<{ order: OrderDto }>(`/api/checkout/order/${p.number}?t=${p.token}`).then((r) => {
          if (r.ok && r.data.order.status === "pending_payment") setOrder(p);
          else sessionStorage.removeItem(ORDER_KEY);
        });
      }
    } catch {
      // sem sessionStorage: segue sem rascunho
    }
    draftLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      const draft: Draft = { customer, address, shippingId, couponInput, coupon, marketing };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignora
    }
  }, [customer, address, shippingId, couponInput, coupon, marketing]);

  // ---- cotação no servidor (preço, estoque, frete e cupom vêm do banco)
  const cartItems = useMemo(
    () => items.map((l) => ({ slug: l.product.slug, color: l.color, storage: l.storage, qty: l.qty })),
    [items],
  );
  const cepDigits = onlyDigits(address.cep);
  const cepOk = isValidCep(address.cep);

  useEffect(() => {
    if (!cartReady || cartItems.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const t = window.setTimeout(async () => {
      const r = await api<QuoteResponse>("/api/checkout/quote", {
        method: "POST",
        body: JSON.stringify({ items: cartItems, cep: cepOk ? cepDigits : null, coupon: coupon || null, email: customer.email || null }),
      });
      if (cancelled) return;
      setQuoteLoading(false);
      if (r.ok) {
        setQuote(r.data);
        setQuoteError("");
      } else {
        setQuoteError(r.data.error ?? "Não foi possível atualizar o resumo.");
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [cartReady, cartItems, cepOk, cepDigits, coupon, customer.email]);

  // escolhe a primeira entrega quando a lista muda
  useEffect(() => {
    if (!quote?.shipping.length) return;
    if (!quote.shipping.some((s) => s.id === shippingId)) setShippingId(quote.shipping[0].id);
  }, [quote, shippingId]);

  // ---- CEP: preenche o endereço
  useEffect(() => {
    if (!cepOk) {
      setCepStatus("idle");
      return;
    }
    let cancelled = false;
    setCepStatus("loading");
    fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      .then((r) => r.json())
      .then((d: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }) => {
        if (cancelled) return;
        if (d.erro) {
          setCepStatus("notfound");
          return;
        }
        setCepStatus("idle");
        setAddress((a) => ({
          ...a,
          street: a.street || d.logradouro || "",
          district: a.district || d.bairro || "",
          city: d.localidade || a.city,
          state: d.uf || a.state,
        }));
      })
      .catch(() => !cancelled && setCepStatus("notfound"));
    return () => {
      cancelled = true;
    };
  }, [cepOk, cepDigits]);

  // ---- contagem regressiva do pedido
  useEffect(() => {
    if (!order) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [order]);
  const expiresAt = order ? order.placedAt + ORDER_PAY_WINDOW_MINUTES * 60_000 : 0;
  const remaining = order ? Math.min(ORDER_PAY_WINDOW_MINUTES * 60_000, Math.max(0, expiresAt - now)) : 0;
  const expired = Boolean(order) && remaining === 0;

  const forgetOrder = useCallback(() => {
    setOrder(null);
    try {
      sessionStorage.removeItem(ORDER_KEY);
    } catch {
      // ignora
    }
  }, []);

  useEffect(() => {
    if (order && expired) {
      api(`/api/checkout/order/${order.number}?t=${order.token}`, { method: "DELETE" });
      forgetOrder();
      setPayError("O tempo para pagar terminou e seus itens foram liberados. Confira o resumo e continue de novo.");
    }
  }, [order, expired, forgetOrder]);

  // ---- totais
  const chosenShipping = quote?.shipping.find((s) => s.id === shippingId) ?? null;
  const subtotal = quote?.subtotal ?? 0;
  const discount = quote?.discount ?? 0;
  const shipping = chosenShipping?.price ?? 0;
  const total = Math.round((subtotal - discount + shipping) * 100) / 100;

  // ---- validação
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (customer.name.trim().split(/\s+/).length < 2) e.name = "Informe nome e sobrenome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email.trim())) e.email = "Informe um e-mail válido.";
    const ph = onlyDigits(customer.phone);
    if (ph.length < 10 || ph.length > 11) e.phone = "Informe um celular com DDD.";
    if (!cepOk) e.cep = "Informe um CEP com 8 números.";
    if (!address.street.trim()) e.street = "Informe a rua.";
    if (!address.number.trim()) e.number = "Informe o número (ou S/N).";
    if (!address.district.trim()) e.district = "Informe o bairro.";
    if (!address.city.trim()) e.city = "Informe a cidade.";
    if (!UFS.includes(address.state)) e.state = "Escolha o estado.";
    if (cepOk && !chosenShipping) e.shipping = "Escolha a forma de entrega.";
    if (!terms) e.terms = "Aceite os termos para continuar.";
    return e;
  }, [customer, address, cepOk, chosenShipping, terms]);
  const show = (k: string) => (touched ? errors[k] : undefined);

  const lines = quote?.lines ?? [];
  const hasUnavailable = lines.some((l) => !l.ok);

  // ---- ações
  async function goToPayment() {
    setTouched(true);
    setFormError("");
    setPayError("");
    if (Object.keys(errors).length > 0) {
      setFormError("Revise os campos em destaque.");
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    if (!quote?.allOk) {
      setFormError("Há itens indisponíveis no carrinho. Remova-os para continuar.");
      return;
    }
    setCreating(true);
    const r = await api<OrderCreated>("/api/checkout/order", {
      method: "POST",
      body: JSON.stringify({
        items: cartItems,
        customer: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone },
        address: {
          recipient: address.recipient.trim() || customer.name.trim(),
          phone: customer.phone,
          cep: cepDigits,
          street: address.street.trim(),
          number: address.number.trim(),
          complement: address.complement.trim(),
          district: address.district.trim(),
          city: address.city.trim(),
          state: address.state,
        },
        shippingId,
        coupon: coupon || undefined,
        acceptTerms: terms,
        marketingOptIn: marketing,
      }),
    });
    setCreating(false);
    if (!r.ok) {
      setFormError(r.data.error ?? "Não foi possível criar o pedido.");
      return;
    }
    const placed: PendingOrder = { ...r.data, placedAt: Date.now() };
    setNow(placed.placedAt);
    setOrder(placed);
    try {
      sessionStorage.setItem(ORDER_KEY, JSON.stringify(placed));
    } catch {
      // ignora
    }
    window.setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function editData() {
    if (!order) return;
    await api(`/api/checkout/order/${order.number}?t=${order.token}`, { method: "DELETE" });
    forgetOrder();
    setPayError("");
  }

  // O Payment Brick chama isto quando o cliente confirma. Resolver = deu certo; rejeitar = mostra erro e permite nova tentativa.
  const pay = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!order) throw new Error("sem pedido");
      setPayError("");
      const r = await api<PayResponse>("/api/checkout/pay", { method: "POST", body: JSON.stringify({ number: order.number, token: order.token, formData }) });
      if (!r.ok) {
        const msg = r.data.error ?? "Não foi possível processar o pagamento.";
        setPayError(msg);
        throw new Error(msg);
      }
      const status = r.data.order.payment?.status;
      if (status === "failed" || status === "expired") {
        const msg = r.data.message ?? "O pagamento não foi aprovado. Tente outro meio de pagamento.";
        setPayError(msg);
        throw new Error(msg);
      }
      clear();
      forgetOrder();
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignora
      }
      router.push(`/checkout/confirmacao/${order.number}?t=${order.token}`);
    },
    [order, clear, forgetOrder, router],
  );

  // ---- telas de estado
  if (!cartReady) {
    return <div className="container mx-auto px-4 py-16 text-center text-sm text-gray-500 dark:text-zinc-400" aria-busy="true">Carregando seu carrinho…</div>;
  }
  if (items.length === 0 && !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-lg rounded-[28px] border border-dashed border-gray-300 p-10 text-center dark:border-zinc-700">
          <h1 className="font-display text-3xl font-black text-gray-900 dark:text-white">Seu carrinho está vazio</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Adicione produtos para finalizar a compra.</p>
          <Link href="/loja" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-dino-red px-6 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-dino-red/30 hover:bg-dino-red-hover">
            Ir para a loja
          </Link>
        </div>
      </div>
    );
  }

  const locked = Boolean(order);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  const renderSummary = (prefix: string) => (
    <div className="space-y-4">
      <ul className="space-y-3" aria-label="Itens do pedido">
        {items.map((line, i) => {
          const q = lines[i];
          const unitPrice = q?.unitPrice ?? line.product.price;
          const bad = q && !q.ok;
          return (
            <li key={line.key} className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                <Image src={q?.image ?? line.product.image} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{line.product.name}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">{[line.color, line.storage].filter(Boolean).join(" · ")}</p>
                {bad && <p role="alert" className="mt-0.5 text-xs font-bold text-dino-red">{q.reason ?? "Indisponível"}</p>}
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {locked ? (
                    <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Qtd. {q?.qty ?? line.qty}</span>
                  ) : (
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
                      <button type="button" aria-label={`Diminuir quantidade de ${line.product.name}`} disabled={line.qty <= 1 || q?.unique} onClick={() => updateQty(line.key, line.qty - 1)} className="h-9 w-9 text-sm disabled:opacity-40">−</button>
                      <span className="min-w-7 text-center text-xs font-bold" aria-live="polite">{q?.qty ?? line.qty}</span>
                      <button type="button" aria-label={`Aumentar quantidade de ${line.product.name}`} disabled={q?.unique || (q?.available != null && line.qty >= q.available)} onClick={() => updateQty(line.key, line.qty + 1)} className="h-9 w-9 text-sm disabled:opacity-40">+</button>
                    </div>
                  )}
                  <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{brl(unitPrice * (q?.qty ?? line.qty))}</span>
                </div>
                {!locked && (
                  <button type="button" onClick={() => removeItem(line.key)} className="mt-1 text-xs font-bold text-gray-500 underline-offset-2 hover:text-dino-red hover:underline dark:text-zinc-400">
                    Remover
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!locked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCoupon(couponInput.trim());
          }}
          className="border-t border-gray-100 pt-4 dark:border-zinc-800"
        >
          <label htmlFor={`${prefix}-coupon`} className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Cupom de desconto</label>
          <div className="flex gap-2">
            <input id={`${prefix}-coupon`} value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Digite o cupom" autoCapitalize="characters" className={`${inputClass(false)} h-11 font-mono uppercase`} />
            <button type="submit" className="h-11 shrink-0 rounded-xl bg-gray-900 px-4 text-sm font-black text-white hover:bg-dino-red dark:bg-white dark:text-zinc-950 dark:hover:bg-dino-red dark:hover:text-white">
              Aplicar
            </button>
          </div>
          {coupon && quote?.coupon && (
            <p role="status" className={`mt-1.5 text-xs font-bold ${quote.coupon.ok ? "text-emerald-600 dark:text-emerald-400" : "text-dino-red"}`}>
              {quote.coupon.ok ? `✓ ${quote.coupon.code}: ${quote.coupon.message}` : quote.coupon.message}
            </p>
          )}
        </form>
      )}
      {locked && coupon && quote?.coupon?.ok && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Cupom {quote.coupon.code} aplicado</p>}

      <dl className="space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-zinc-800">
        <div className="flex justify-between"><dt className="text-gray-600 dark:text-zinc-400">Subtotal</dt><dd className="font-mono font-bold text-gray-900 dark:text-white">{brl(subtotal)}</dd></div>
        {discount > 0 && <div className="flex justify-between"><dt className="text-emerald-600 dark:text-emerald-400">Desconto</dt><dd className="font-mono font-bold text-emerald-600 dark:text-emerald-400">− {brl(discount)}</dd></div>}
        <div className="flex justify-between">
          <dt className="text-gray-600 dark:text-zinc-400">Entrega</dt>
          <dd className="font-mono font-bold text-gray-900 dark:text-white">{chosenShipping ? (shipping === 0 ? "Grátis" : brl(shipping)) : "Informe o CEP"}</dd>
        </div>
        <div className="flex items-end justify-between border-t border-gray-100 pt-3 dark:border-zinc-800">
          <dt className="font-black text-gray-900 dark:text-white">Total</dt>
          <dd className="text-right">
            <span className="block font-mono text-2xl font-black text-gray-900 dark:text-white" aria-live="polite">{brl(total)}</span>
            {total > 0 && <span className="block text-xs text-gray-500 dark:text-zinc-400">ou {cfg?.maxInstallments ?? 10}x de {brl(Math.round((total / (cfg?.maxInstallments ?? 10)) * 100) / 100)} sem juros</span>}
          </dd>
        </div>
      </dl>
      {quoteLoading && <p className="text-xs text-gray-500 dark:text-zinc-400" role="status">Atualizando valores…</p>}
      {quoteError && <p role="alert" className="text-xs font-bold text-dino-red">{quoteError}</p>}
    </div>
  );

  return (
    <div className="container mx-auto px-4 pb-24 pt-6 text-gray-800 dark:text-zinc-200">
      <nav aria-label="Você está em" className="mb-3 text-xs text-gray-500 dark:text-zinc-400">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-dino-red">Início</Link></li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="font-semibold text-gray-800 dark:text-zinc-200">Finalizar compra</li>
        </ol>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">Finalizar compra</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Compra segura. Seus dados de cartão vão direto ao Mercado Pago.</p>
        </div>
        <ol className="flex items-center gap-2 text-xs font-bold" aria-label="Etapas">
          {["Dados", "Entrega", "Pagamento"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${i < (locked ? 3 : 2) && (locked || i < 2) ? "bg-dino-red text-white" : "bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>{i + 1}</span>
              <span className="text-gray-700 dark:text-zinc-300">{s}</span>
              {i < 2 && <span aria-hidden className="text-gray-300 dark:text-zinc-700">—</span>}
            </li>
          ))}
        </ol>
      </div>

      {cfg && !cfg.ready && (
        <p role="alert" className="mb-5 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-300">
          O checkout ainda não está ativo neste ambiente ({!cfg.db ? "banco de dados não configurado" : "pagamentos não configurados"}). Você pode preencher os dados, mas não consegue finalizar o pedido.
        </p>
      )}
      {cfg?.ready && cfg.mode === "simulated" && (
        <p role="status" className="mb-5 rounded-2xl border border-sky-400/50 bg-sky-400/10 p-4 text-sm font-semibold text-sky-800 dark:text-sky-300">
          Modo de demonstração: nenhuma cobrança real é feita. Cartão aprova na hora; Pix fica pendente e você pode simular o pagamento na tela seguinte.
        </p>
      )}

      {/* Resumo recolhível no celular */}
      <details className="mb-5 rounded-[24px] border border-gray-200 bg-white lg:hidden dark:border-zinc-800 dark:bg-zinc-950" open={summaryOpen} onToggle={(e) => setSummaryOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-black text-gray-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
          <span>Resumo do pedido ({items.reduce((n, l) => n + l.qty, 0)} {items.reduce((n, l) => n + l.qty, 0) === 1 ? "item" : "itens"})</span>
          <span className="font-mono">{brl(total)}</span>
        </summary>
        <div className="border-t border-gray-100 p-4 dark:border-zinc-800">{renderSummary("m")}</div>
      </details>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <Section n={1} title="Seus dados" done={locked} locked={locked}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Nome completo" error={show("name")} className="sm:col-span-2">
                <input id="name" autoComplete="name" disabled={locked} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} aria-invalid={Boolean(show("name"))} aria-describedby={show("name") ? "name-error" : undefined} className={inputClass(Boolean(show("name")))} />
              </Field>
              <Field id="email" label="E-mail" error={show("email")} hint="Enviamos a confirmação do pedido para este e-mail.">
                <input id="email" type="email" autoComplete="email" inputMode="email" disabled={locked} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} aria-invalid={Boolean(show("email"))} aria-describedby={show("email") ? "email-error" : undefined} className={inputClass(Boolean(show("email")))} />
              </Field>
              <Field id="phone" label="Celular (WhatsApp)" error={show("phone")} hint="Usado só para avisos sobre a entrega.">
                <input id="phone" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="(61) 90000-0000" disabled={locked} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })} aria-invalid={Boolean(show("phone"))} aria-describedby={show("phone") ? "phone-error" : undefined} className={inputClass(Boolean(show("phone")))} />
              </Field>
            </div>
          </Section>

          <Section n={2} title="Entrega" done={locked} locked={locked}>
            <div className="grid gap-4 sm:grid-cols-6">
              <Field id="cep" label="CEP" error={show("cep") ?? (cepStatus === "notfound" && !address.street.trim() ? "CEP não encontrado. Preencha o endereço à mão." : undefined)} hint={cepStatus === "loading" ? "Buscando endereço…" : undefined} className="sm:col-span-2">
                <input id="cep" autoComplete="postal-code" inputMode="numeric" placeholder="00000-000" maxLength={9} disabled={locked} value={address.cep} onChange={(e) => setAddress({ ...address, cep: maskCep(e.target.value) })} aria-invalid={Boolean(show("cep"))} aria-describedby={show("cep") ? "cep-error" : undefined} className={`${inputClass(Boolean(show("cep")))} font-mono`} />
              </Field>
              <Field id="street" label="Rua / avenida" error={show("street")} className="sm:col-span-4">
                <input id="street" autoComplete="address-line1" disabled={locked} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} aria-invalid={Boolean(show("street"))} aria-describedby={show("street") ? "street-error" : undefined} className={inputClass(Boolean(show("street")))} />
              </Field>
              <Field id="number" label="Número" error={show("number")} className="sm:col-span-2">
                <input id="number" inputMode="numeric" autoComplete="off" disabled={locked} value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} aria-invalid={Boolean(show("number"))} aria-describedby={show("number") ? "number-error" : undefined} className={inputClass(Boolean(show("number")))} />
              </Field>
              <Field id="complement" label="Complemento (opcional)" className="sm:col-span-4">
                <input id="complement" autoComplete="address-line2" disabled={locked} value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} className={inputClass(false)} />
              </Field>
              <Field id="district" label="Bairro" error={show("district")} className="sm:col-span-2">
                <input id="district" autoComplete="address-level3" disabled={locked} value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} aria-invalid={Boolean(show("district"))} aria-describedby={show("district") ? "district-error" : undefined} className={inputClass(Boolean(show("district")))} />
              </Field>
              <Field id="city" label="Cidade" error={show("city")} className="sm:col-span-3">
                <input id="city" autoComplete="address-level2" disabled={locked} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} aria-invalid={Boolean(show("city"))} aria-describedby={show("city") ? "city-error" : undefined} className={inputClass(Boolean(show("city")))} />
              </Field>
              <Field id="state" label="Estado" error={show("state")} className="sm:col-span-1">
                <select id="state" autoComplete="address-level1" disabled={locked} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} aria-invalid={Boolean(show("state"))} aria-describedby={show("state") ? "state-error" : undefined} className={inputClass(Boolean(show("state")))}>
                  <option value="">UF</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field id="recipient" label="Quem vai receber (opcional)" hint="Deixe em branco se for você." className="sm:col-span-6">
                <input id="recipient" autoComplete="off" disabled={locked} value={address.recipient} onChange={(e) => setAddress({ ...address, recipient: e.target.value })} className={inputClass(false)} />
              </Field>
            </div>

            <fieldset className="mt-6" disabled={locked}>
              <legend className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Forma de entrega</legend>
              {!cepOk && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">Informe o CEP para ver prazos e valores.</p>}
              {cepOk && quoteLoading && !quote?.shipping.length && <div className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-zinc-800" aria-busy="true" />}
              <div role="radiogroup" className="space-y-2">
                {(quote?.shipping ?? []).map((opt) => {
                  const checked = shippingId === opt.id;
                  return (
                    <label key={opt.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${checked ? "border-dino-red bg-dino-red/10" : "border-gray-200 hover:border-gray-400 dark:border-zinc-700"}`}>
                      <input type="radio" name="shipping" value={opt.id} checked={checked} onChange={() => setShippingId(opt.id)} className="h-4 w-4 accent-[#da2230]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">{opt.name}</span>
                        <span className="block text-xs text-gray-500 dark:text-zinc-400">{opt.time}</span>
                      </span>
                      <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{opt.price === 0 ? "Grátis" : brl(opt.price)}</span>
                    </label>
                  );
                })}
              </div>
              {show("shipping") && <p role="alert" className="mt-1 text-xs font-semibold text-dino-red">{show("shipping")}</p>}
              {cepOk && quote?.shipping.length ? <p className="mt-2 text-[11px] text-gray-500 dark:text-zinc-500">Valores e prazos cotados agora (SuperFrete / Melhor Envio). O frete é recalculado no servidor ao finalizar o pedido.</p> : null}
              {cepOk && !quoteLoading && quote && !quote.shipping.length ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-dino-red">
                  Não encontramos frete para este CEP. Tente outro ou fale conosco no WhatsApp.
                </p>
              ) : null}
            </fieldset>
          </Section>

          <Section n={3} title="Pagamento">
            {!locked ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 text-sm ${show("terms") ? "text-dino-red" : ""}`}>
                    <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={Boolean(show("terms"))} className="mt-0.5 h-5 w-5 shrink-0 accent-[#da2230]" />
                    <span>Li e aceito os termos de compra e a política de privacidade da DinoBlack.</span>
                  </label>
                  {show("terms") && <p role="alert" className="text-xs font-semibold text-dino-red">{show("terms")}</p>}
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#da2230]" />
                    <span className="text-gray-700 dark:text-zinc-300">Quero receber ofertas e novidades por e-mail (opcional, você pode sair quando quiser).</span>
                  </label>
                </div>
                {formError && <p role="alert" className="rounded-xl border border-dino-red/40 bg-dino-red/10 p-3 text-sm font-semibold text-dino-red">{formError}</p>}
                {payError && <p role="alert" className="rounded-xl border border-dino-red/40 bg-dino-red/10 p-3 text-sm font-semibold text-dino-red">{payError}</p>}
                <button
                  type="button"
                  onClick={goToPayment}
                  disabled={creating || !cfg?.ready || hasUnavailable || quoteLoading}
                  className="h-14 w-full rounded-2xl bg-dino-red px-6 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-dino-red/30 transition hover:bg-dino-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dino-red active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Reservando seus itens…" : `Ir para o pagamento · ${brl(total)}`}
                </button>
                <p className="text-center text-xs text-gray-500 dark:text-zinc-400">Ao continuar, reservamos seus itens por {ORDER_PAY_WINDOW_MINUTES} minutos.</p>
              </div>
            ) : (
              <div ref={paymentRef} className="scroll-mt-24 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-zinc-900">
                  <span>Pedido <strong className="font-mono">{order?.number}</strong> · reservamos seus itens</span>
                  <span className={`font-mono font-black ${remaining < 5 * 60_000 ? "text-dino-red" : "text-gray-900 dark:text-white"}`} role="timer" aria-label="Tempo restante para pagar">{mm}:{ss}</span>
                </div>
                {payError && <p role="alert" className="rounded-xl border border-dino-red/40 bg-dino-red/10 p-3 text-sm font-semibold text-dino-red">{payError}</p>}
                {cfg?.publicKey ? (
                  <PaymentBrick publicKey={cfg.publicKey} amount={order?.total ?? total} email={customer.email} maxInstallments={cfg.maxInstallments} onSubmit={pay} />
                ) : (
                  <p role="alert" className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-300">Pagamento indisponível: chave pública do Mercado Pago não configurada.</p>
                )}
                <button type="button" onClick={editData} className="text-sm font-bold text-gray-600 underline-offset-2 hover:text-dino-red hover:underline dark:text-zinc-400">
                  ← Editar dados ou itens (libera a reserva)
                </button>
              </div>
            )}
          </Section>
        </div>

        <aside className="hidden lg:block" aria-label="Resumo do pedido">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 font-display text-xl font-black text-gray-900 dark:text-white">Resumo do pedido</h2>
              {renderSummary("d")}
            </div>
            <ul className="space-y-2 rounded-2xl border border-gray-200 p-4 text-xs text-gray-600 dark:border-zinc-800 dark:text-zinc-400">
              <li className="flex gap-2"><span aria-hidden className="text-dino-red">✓</span> Pagamento processado pelo Mercado Pago</li>
              <li className="flex gap-2"><span aria-hidden className="text-dino-red">✓</span> Garantia DinoBlack em todos os itens</li>
              <li className="flex gap-2"><span aria-hidden className="text-dino-red">✓</span> Envio para todo o Brasil ou retirada em Santa Maria</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
