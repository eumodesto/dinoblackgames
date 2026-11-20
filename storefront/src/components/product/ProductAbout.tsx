"use client";

import { useEffect, useId, useRef, useState } from "react";

const PREVIEW_PX = 120; // altura do trecho visível quando recolhida

/**
 * "Sobre o produto": seção recolhível que começa fechada, já mostrando um trecho do texto com
 * esmaecimento no fim (descrições longas não empurram a página). Abre ao tocar no cabeçalho, em
 * "Ver mais" ou pelo link #sobre do menu de seções.
 */
export function ProductAbout({ paragraphs }: { paragraphs: string[] }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(PREVIEW_PX);
  const inner = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === "#sobre") setOpen(true); };
    // clique no menu de seções, mesmo quando o hash já é #sobre (não dispara hashchange)
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest?.('a[href="#sobre"]');
      if (link) setOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // Altura real do texto (muda com a largura da tela) para animar a abertura.
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setFull(el.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paragraphs]);

  if (paragraphs.length === 0) return null;
  const needsToggle = full > PREVIEW_PX + 8; // texto curto cabe inteiro: sem recolher
  const expanded = open || !needsToggle;

  return (
    <section id="sobre" className="scroll-mt-36 py-6 sm:py-10">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          disabled={!needsToggle}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition enabled:hover:bg-gray-50 sm:px-7 sm:py-5 dark:enabled:hover:bg-zinc-900"
        >
          <span className="font-display text-xl font-black tracking-tight text-gray-900 sm:text-2xl dark:text-white">Sobre o produto</span>
          {needsToggle && (
            <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              <span className="hidden sm:inline">{expanded ? "Recolher" : "Ver detalhes"}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-full bg-gray-100 transition-transform duration-300 dark:bg-zinc-900 ${expanded ? "rotate-180" : ""}`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </span>
            </span>
          )}
        </button>

        <div className="relative border-t border-gray-100 dark:border-zinc-800">
          <div
            id={panelId}
            role="region"
            aria-label="Sobre o produto"
            className="overflow-hidden transition-[max-height] duration-500 ease-out"
            style={{ maxHeight: expanded ? full : PREVIEW_PX }}
          >
            <div ref={inner} className="max-w-3xl space-y-4 px-5 py-5 text-sm leading-relaxed text-gray-700 sm:px-7 sm:py-6 dark:text-zinc-300">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line break-words">{paragraph}</p>
              ))}
            </div>
          </div>
          {/* esmaecimento + "Ver mais" no trecho recolhido */}
          <div
            aria-hidden={expanded}
            className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent pb-3 transition-opacity duration-300 dark:from-zinc-950 dark:via-zinc-950/90 ${expanded ? "opacity-0" : "opacity-100"}`}
          >
            <button
              type="button"
              tabIndex={expanded ? -1 : 0}
              onClick={() => setOpen(true)}
              className="pointer-events-auto rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-dino-red hover:text-dino-red dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Ver mais
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
