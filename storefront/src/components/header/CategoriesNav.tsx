"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, NAV_LINKS } from "@/data/demo";

export function CategoriesNav() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="hidden border-t border-gray-100 bg-white dark:border-zinc-800/80 dark:bg-[#050507] lg:block">
      <div className="container mx-auto flex items-center gap-5 px-4 py-3">
        <div ref={rootRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-dino-red px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-dino-red/25 transition hover:bg-dino-red-hover"
          >
            <span aria-hidden>▦</span>
            Todas as categorias
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="px-4 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Categorias de produtos
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {CATEGORIES.map((cat) => (
                  <a
                    key={cat.id}
                    href={cat.href}
                    className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 hover:text-dino-red dark:text-zinc-200 dark:hover:bg-zinc-900"
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
        </div>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-gray-700 dark:text-zinc-300 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-dino-red"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
