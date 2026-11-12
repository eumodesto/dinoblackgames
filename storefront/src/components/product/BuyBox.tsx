"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useCart } from "@/components/cart-provider";
import { formatBRL, type ProductCard } from "@/lib/types";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import type { ShippingOption } from "@/lib/shipping";
import { waLink } from "@/lib/whatsapp";

const CONDITION_LABEL: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo · unidade única",
  raridade: "Raridade",
  pre_venda: "Pré-venda",
};

const MAX_INSTALLMENTS = 10;
function installmentValue(price: number) {
  return Math.ceil((price / MAX_INSTALLMENTS) * 100) / 100;
}

type OptionValue = { label: string; available: boolean };
type ProductOption = { id: string; name: string; values: OptionValue[] };

export type BuyBoxProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  condition: string;
  tagline: string;
  price: number;
  compareAt?: number | null;
  discount?: number | null;
  rating?: number | null;
  soldCount: number;
  available: number;
  inStock: boolean;
  image: string;
  warrantyMonths: number;
  warrantyText: string | null;
  maxInstallments: number;
  options: ProductOption[];
};

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-amber-400" aria-hidden>
      {"★★★★★".split("").map((s, i) => (
        <span key={i} className={i < Math.round(value) ? "" : "opacity-25"}>
          {s}
        </span>
      ))}
    </span>
  );
}

function TrustItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-dino-red/10 text-dino-red">{icon}</span>
      <span>
        <span className="block text-sm font-bold text-gray-900 dark:text-white">{title}</span>
        <span className="block text-xs text-gray-600 dark:text-zinc-400">{text}</span>
      </span>
    </li>
  );
}

const svgProps = {
  viewBox: "0 0 24 24",
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function BuyBox({ product }: { product: BuyBoxProduct }) {
  const { addItem } = useCart();
  const isUnique = product.condition === "seminovo" || product.condition === "raridade";
  const soldOut = product.available === 0;
  const lowStock = product.available > 0 && product.available <= 5;

  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.options.map((o) => [o.id, (o.values.find((v) => v.available) ?? o.values[0]).label]),
    ),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cep, setCep] = useState("");
  const [cepError, setCepError] = useState("");
  const [shipping, setShipping] = useState<ShippingOption[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 2200);
    return () => window.clearTimeout(t);
  }, [added]);

  function handleAdd() {
    if (soldOut) return;
    const cartProduct: ProductCard = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      compareAt: product.compareAt,
      image: product.image,
    };
    addItem(cartProduct, { color: selected.color, storage: selected.storage, qty: isUnique ? 1 : qty });
    setAdded(true);
  }

  async function handleCep(e: FormEvent) {
    e.preventDefault();
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setShipping(null);
      setCepError("Digite um CEP com 8 números.");
      return;
    }
    setCepError("");
    setShippingLoading(true);
    setShipping(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep: digits,
          items: [{ qty: isUnique ? 1 : qty, unitPrice: product.price }],
        }),
      });
      const data = (await res.json()) as { shipping?: ShippingOption[]; error?: string };
      if (!res.ok) {
        setCepError(data.error ?? "Não foi possível calcular o frete.");
        return;
      }
      setShipping(data.shipping ?? []);
    } catch {
      setCepError("Não foi possível calcular o frete. Tente novamente.");
    } finally {
      setShippingLoading(false);
    }
  }

  const hasDiscount = Boolean(product.compareAt && product.discount);
  const whatsapp = waLink(`Olá! Tenho uma dúvida sobre: ${product.name} (${product.sku})`);
  const warrantyLabel = product.warrantyMonths >= 12
    ? `${product.warrantyMonths} meses`
    : `${product.warrantyMonths * 30} dias`;
  const warrantyText = product.warrantyText ?? `Garantia de ${warrantyLabel} DinoBlack.`;

  return (
    <div className="flex flex-col gap-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
            isUnique
              ? "border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-300"
              : "border-dino-red/40 bg-dino-red/10 text-dino-red"
          }`}
        >
          <span aria-hidden>{isUnique ? "◆" : "●"}</span>
          {CONDITION_LABEL[product.condition] ?? product.condition}
        </span>
        <span className="font-mono text-[11px] text-gray-500 dark:text-zinc-500">SKU {product.sku}</span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-black leading-tight text-gray-900 dark:text-white sm:text-3xl">
          {product.name}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">{product.tagline}</p>
        {product.rating != null && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Stars value={product.rating} />
            <span className="font-bold text-gray-900 dark:text-white">{product.rating}</span>
            {product.soldCount > 0 && (
              <span className="text-gray-500 dark:text-zinc-400">· {product.soldCount}+ vendidos</span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-gray-50 p-4 dark:bg-zinc-900">
        {hasDiscount && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-400 line-through">{formatBRL(product.compareAt!)}</span>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
              −{product.discount}%
            </span>
          </div>
        )}
        <div className="font-mono text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          {formatBRL(product.price)}
        </div>
        <div className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          ou {product.maxInstallments}x de{" "}
          <strong className="text-gray-900 dark:text-white">{formatBRL(installmentValue(product.price))}</strong> sem juros
        </div>
      </div>

      {product.options.map((option) => (
        <div key={option.id}>
          <div className="mb-2 flex items-baseline justify-between">
            <span id={`opt-${option.id}`} className="text-sm font-bold text-gray-900 dark:text-white">
              {option.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-zinc-400">{selected[option.id]}</span>
          </div>
          <div role="radiogroup" aria-labelledby={`opt-${option.id}`} className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const checked = selected[option.id] === value.label;
              return (
                <button
                  key={value.label}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={!value.available}
                  onClick={() => setSelected((s) => ({ ...s, [option.id]: value.label }))}
                  className={`min-h-11 rounded-xl border-2 px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dino-red ${
                    checked
                      ? "border-dino-red bg-dino-red/10 text-gray-900 dark:text-white"
                      : "border-gray-200 text-gray-700 hover:border-gray-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500"
                  } disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-50`}
                >
                  <span className={value.available ? "" : "line-through"}>{value.label}</span>
                  {!value.available && <span className="ml-2 text-[10px] font-black uppercase">Esgotado</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {isUnique ? (
        <p className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
          <span aria-hidden>◆</span> Unidade única: você recebe o item das fotos.
        </p>
      ) : (
        lowStock && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-bold text-dino-red">
                {soldOut ? "Sem estoque" : `Só ${product.available} no estoque`}
              </span>
              <span className="text-gray-500 dark:text-zinc-400">Quase esgotando</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
              <div className="h-full w-[78%] rounded-full bg-dino-red" />
            </div>
          </div>
        )
      )}

      <div ref={ctaRef} className="flex flex-col gap-3">
        <div className="flex items-stretch gap-3">
          {!isUnique && (
            <div
              className="inline-flex h-14 shrink-0 items-center overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-700"
              role="group"
              aria-label="Quantidade"
            >
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-full w-11 text-lg font-bold text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                −
              </button>
              <span className="min-w-8 text-center font-mono text-sm font-bold text-gray-900 dark:text-white" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => setQty((q) => Math.min(product.available || 10, q + 1))}
                className="h-full w-11 text-lg font-bold text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                +
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="h-14 flex-1 rounded-2xl bg-dino-red px-6 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-dino-red/30 transition hover:bg-dino-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dino-red active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-live="polite">{soldOut ? "Avise-me quando chegar" : added ? "Adicionado ao carrinho ✓" : "Adicionar ao carrinho"}</span>
          </button>
        </div>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] text-sm font-black text-[#052e16] shadow-md shadow-[#25D366]/25 transition hover:bg-[#1fbd5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] active:scale-[0.99]"
        >
          <WhatsAppIcon className="h-6 w-6" />
          Tirar uma dúvida no WhatsApp
        </a>
      </div>

      <form onSubmit={handleCep} className="rounded-2xl border border-gray-200 p-4 dark:border-zinc-800" noValidate>
        <label htmlFor="cep" className="text-sm font-bold text-gray-900 dark:text-white">
          Calcule prazo e frete
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={cep}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCep(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
            }}
            aria-invalid={Boolean(cepError)}
            aria-describedby={cepError ? "cep-error" : undefined}
            className="h-12 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 font-mono text-sm text-gray-900 outline-none focus:border-dino-red focus:ring-2 focus:ring-dino-red/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={shippingLoading}
            className="h-12 rounded-xl bg-gray-900 px-5 text-sm font-black text-white transition hover:bg-dino-red disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-dino-red dark:hover:text-white"
          >
            {shippingLoading ? "Calculando…" : "Calcular"}
          </button>
        </div>
        {cepError && (
          <p id="cep-error" role="alert" className="mt-2 text-xs font-semibold text-dino-red">
            {cepError}
          </p>
        )}
        {shipping && (
          <ul className="mt-3 divide-y divide-gray-100 text-sm dark:divide-zinc-800" aria-live="polite">
            {shipping.map((opt) => (
              <li key={opt.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">{opt.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-zinc-400">{opt.time}</span>
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {opt.price === 0 ? "Grátis" : formatBRL(opt.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </form>

      <ul className="grid gap-4 border-t border-gray-100 pt-5 dark:border-zinc-800">
        <TrustItem
          icon={
            <svg {...svgProps}>
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          }
          title={`Garantia de ${warrantyLabel}`}
          text={warrantyText}
        />
        <TrustItem
          icon={
            <svg {...svgProps}>
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
              <circle cx="17" cy="18" r="2" />
              <circle cx="7" cy="18" r="2" />
            </svg>
          }
          title="Envio para todo o Brasil"
          text="Prazo e valor antes de pagar. Retirada na loja em Santa Maria, Brasília."
        />
        <TrustItem
          icon={
            <svg {...svgProps}>
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
              <path d="m16 16 2 2 4-4" />
              <path d="M12 22V12" />
            </svg>
          }
          title="Troca e devolução"
          text="Política clara para produtos novos e seminovos."
        />
      </ul>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden ${
          showBar ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!showBar}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-gray-500 dark:text-zinc-400">{product.name}</div>
            <div className="font-mono text-lg font-black text-gray-900 dark:text-white">{formatBRL(product.price)}</div>
          </div>
          <button
            type="button"
            tabIndex={showBar ? 0 : -1}
            onClick={handleAdd}
            disabled={soldOut}
            className="h-12 shrink-0 rounded-2xl bg-dino-red px-5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-dino-red/30 active:scale-95 disabled:opacity-50"
          >
            {added ? "Adicionado ✓" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
