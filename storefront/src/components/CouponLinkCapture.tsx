"use client";

import { useEffect, useState } from "react";

/** Mesma chave lida pelo checkout. */
export const COUPON_LINK_KEY = "dino-coupon-link";

/**
 * Link de cupom: qualquer página aberta com `?cupom=CODIGO` guarda o código e avisa o cliente.
 * O checkout aplica o cupom sozinho (se o carrinho atender às condições).
 */
export function CouponLinkCapture() {
  const [code, setCode] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("cupom");
    if (!raw) return;
    const clean = raw.trim().toUpperCase();
    // tira o parâmetro da barra de endereço, válido ou não
    url.searchParams.delete("cupom");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (!/^[A-Z0-9_-]{3,40}$/.test(clean)) return;
    try { localStorage.setItem(COUPON_LINK_KEY, clean); } catch { /* sem armazenamento: o aviso ainda aparece */ }
    setCode(clean);
    const timer = window.setTimeout(() => setCode(""), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!code) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-4 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-500/40 bg-white p-4 text-sm shadow-2xl dark:bg-zinc-950">
      <span aria-hidden className="text-lg text-emerald-500">✓</span>
      <p className="flex-1 text-gray-800 dark:text-zinc-100">Cupom <strong className="font-mono">{code}</strong> adicionado. Ele será aplicado no checkout.</p>
      <button type="button" onClick={() => setCode("")} aria-label="Fechar aviso" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">✕</button>
    </div>
  );
}
