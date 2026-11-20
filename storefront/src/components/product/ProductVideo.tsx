"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseVideoUrl } from "@/lib/catalog-normalize";

/**
 * Vídeo do produto: um cartão com a miniatura e um botão de play abre uma janela grande (16:9)
 * com o vídeo já tocando. Fecha com Esc, clique fora ou no X; o foco volta ao cartão.
 * O iframe só é criado com a janela aberta, então a página não carrega o player antes da hora.
 */
export function ProductVideo({ url, title }: { url: string; title: string }) {
  const video = parseVideoUrl(url);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!video) return null;
  const src = `${video.embed}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 pr-4 text-left sm:gap-4 sm:pr-5 lg:mt-4 transition hover:border-dino-red hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span className="relative block aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-zinc-900 sm:w-48">
          {video.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura externa do YouTube; não passa pelo otimizador
            <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/20">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-dino-red text-white shadow-lg shadow-dino-red/40 transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-gray-900 dark:text-white">Assistir ao vídeo</span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-zinc-400">Veja o produto em ação, sem sair da página.</span>
        </span>
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Vídeo: ${title}`}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <div className="w-full max-w-5xl">
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <p className="truncate text-sm font-bold">{title}</p>
              <div className="flex shrink-0 items-center gap-2">
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10">
                  Abrir no {video.provider === "youtube" ? "YouTube" : "Vimeo"}
                </a>
                <button ref={closer} type="button" onClick={close} aria-label="Fechar vídeo" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-dino-red">
                  ✕
                </button>
              </div>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              <iframe
                src={src}
                title={`Vídeo: ${title}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
