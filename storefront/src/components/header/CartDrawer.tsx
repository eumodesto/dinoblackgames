"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  ShoppingCartIcon,
  type ShoppingCartIconHandle,
} from "@/components/icons/shopping-cart-icon";
import { useCart } from "@/components/cart-provider";
import { formatBRL } from "@/lib/types";

export function CartButton() {
  const { count, setOpen } = useCart();
  const cartIconRef = useRef<ShoppingCartIconHandle>(null);

  return (
    <button
      type="button"
      aria-label="Carrinho de compras"
      onClick={() => setOpen(true)}
      onMouseEnter={() => cartIconRef.current?.startAnimation()}
      onMouseLeave={() => cartIconRef.current?.stopAnimation()}
      className="relative grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-800 transition hover:border-dino-red/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <ShoppingCartIcon ref={cartIconRef} size={18} aria-hidden />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-dino-red px-1 text-[10px] font-black text-white">
          {count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer() {
  const { open, setOpen, items, subtotal, removeItem, updateQty } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Fechar carrinho"
        className="absolute inset-0 bg-black/45"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-zinc-950">
        <div className="flex items-center justify-between bg-[#0f172a] px-5 py-4 text-white">
          <div className="flex items-center gap-2 font-bold">
            <ShoppingCartIcon size={18} aria-hidden />
            Carrinho
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-dino-red px-1.5 text-[11px]">
              {items.reduce((n, i) => n + i.qty, 0)}
            </span>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="font-display text-lg font-black text-gray-900 dark:text-white">Seu carrinho está vazio</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Escolha um produto para começar.</p>
                <Link
                  href="/loja"
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-flex h-11 items-center rounded-2xl bg-dino-red px-5 text-sm font-black text-white hover:bg-dino-red-hover"
                >
                  Ver a loja
                </Link>
              </div>
            </div>
          )}
          {items.map((line) => (
            <div
              key={line.key}
              className="rounded-2xl bg-gray-50 p-3 dark:bg-zinc-900"
            >
              <div className="flex gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-zinc-200">
                  <Image
                    src={line.product.image}
                    alt={line.product.name}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remover ${line.product.name}`}
                    onClick={() => removeItem(line.key)}
                    className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {line.product.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {line.color && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {line.color}
                      </span>
                    )}
                    {line.storage && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {line.storage}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
                      <button
                        type="button"
                        className="px-2 py-1 text-sm"
                        aria-label="Diminuir quantidade"
                        onClick={() =>
                          updateQty(line.key, line.qty - 1)
                        }
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-xs font-bold">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 text-sm"
                        aria-label="Aumentar quantidade"
                        onClick={() =>
                          updateQty(line.key, line.qty + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-black text-gray-900 dark:text-white">
                      {formatBRL(line.product.price)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-gray-500">Subtotal:</span>
            <span className="text-lg font-black text-dino-red">
              {formatBRL(subtotal)}
            </span>
          </div>
          <Link
            href="/checkout"
            onClick={() => setOpen(false)}
            aria-disabled={items.length === 0}
            className={`flex h-12 items-center justify-center rounded-2xl text-sm font-black uppercase tracking-wide text-white transition ${
              items.length === 0 ? "pointer-events-none bg-zinc-400 dark:bg-zinc-700" : "bg-dino-red hover:bg-dino-red-hover"
            }`}
          >
            Finalizar compra
          </Link>
        </div>
      </aside>
    </div>
  );
}
