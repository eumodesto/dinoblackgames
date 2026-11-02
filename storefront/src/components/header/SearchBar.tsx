"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  POPULAR_SEARCH_CATEGORIES,
  TRENDING_SEARCHES,
} from "@/data/demo";

type SearchBarProps = {
  /** Inclui o seletor de categorias dentro da barra (mobile). */
  withCategories?: boolean;
};

export function SearchBar({ withCategories = false }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCatsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative w-full flex-1 ${withCategories ? "" : "max-w-xl"}`}
    >
      <div
        className={`flex h-11 items-stretch overflow-hidden rounded-full border bg-white shadow-sm transition dark:bg-zinc-900 ${
          open || catsOpen
            ? "border-dino-red ring-2 ring-dino-red/20"
            : "border-gray-200 dark:border-zinc-700"
        }`}
      >
        {withCategories && (
          <>
            <button
              type="button"
              aria-label="Todas as categorias"
              aria-expanded={catsOpen}
              onClick={() => {
                setCatsOpen((v) => !v);
                setOpen(false);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 bg-dino-red px-3 text-xs font-bold text-white transition hover:bg-dino-red-hover sm:px-3.5 sm:text-sm"
            >
              <span aria-hidden className="text-[11px]">
                ▦
              </span>
              <span className="max-w-[4.5rem] truncate sm:max-w-none">
                Categorias
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3 w-3 transition ${catsOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <span
              className="w-px shrink-0 self-stretch bg-dino-red/30 dark:bg-zinc-700"
              aria-hidden
            />
          </>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
          {!withCategories && (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setOpen(true);
              setCatsOpen(false);
            }}
            placeholder={
              withCategories
                ? "Buscar na DinoBlack..."
                : "Buscar produtos, marcas, gadgets..."
            }
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            aria-label="Buscar produtos"
          />
          <button
            type="button"
            aria-label="Enviar busca"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-dino-red text-white transition hover:bg-dino-red-hover"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {withCategories && catsOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-4 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Categorias de produtos
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.id}
                href={cat.href}
                className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 hover:text-dino-red dark:text-zinc-200 dark:hover:bg-zinc-900"
                onClick={() => setCatsOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-zinc-600" />
                  {cat.name}
                </span>
                <span className="text-gray-300">›</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-gray-100 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span className="text-dino-red">↗</span>
              Buscas em alta
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-dino-red/10 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-dino-red/15 dark:text-zinc-100"
                >
                  <span className="text-dino-red">✦</span>
                  {term}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span className="grid h-3.5 w-3.5 place-items-center text-[9px]">
                ▦
              </span>
              Categorias populares
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {POPULAR_SEARCH_CATEGORIES.map((cat) => (
                <a
                  key={cat}
                  href={`/loja?categoria=${cat.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center gap-2 text-sm font-medium text-gray-800 transition hover:text-dino-red dark:text-zinc-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-dino-red" />
                  {cat}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
