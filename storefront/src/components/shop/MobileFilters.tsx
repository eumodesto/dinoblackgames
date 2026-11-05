"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Gaveta de filtros para telas pequenas. Os filtros são links, então a gaveta continua aberta enquanto a lista atualiza. */
export function MobileFilters({
  activeCount,
  total,
  children,
}: {
  activeCount: number;
  total: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const trigger = triggerRef.current;
    return () => {
      document.documentElement.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-900 transition hover:border-dino-red dark:border-zinc-700 dark:bg-zinc-900 dark:text-white lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M7 12h10M10 18h4" />
        </svg>
        Filtros
        {activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-dino-red px-1 text-[11px] text-white">{activeCount}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <button type="button" aria-label="Fechar filtros" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-zinc-800">
              <span className="font-display text-lg font-black text-gray-900 dark:text-white">Filtrar produtos</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-gray-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                ✕
              </button>
            </div>
            <div className="scrollbar-none flex-1 overflow-y-auto px-3 py-3">{children}</div>
            <div className="border-t border-gray-200 p-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-12 w-full rounded-2xl bg-dino-red text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-dino-red/30 hover:bg-dino-red-hover"
                aria-live="polite"
              >
                Ver {total} {total === 1 ? "produto" : "produtos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
