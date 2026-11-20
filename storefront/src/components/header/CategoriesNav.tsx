"use client";

import { useEffect, useRef, useState } from "react";
import { useStoreCategories } from "./useStoreCategories";
const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Loja", href: "/loja" },
  { label: "Sobre", href: "/sobre" },
  { label: "Contato", href: "/contato" },
];
import {
  AlignRightIcon,
  type AlignRightIconHandle,
} from "@/components/icons/align-right-icon";

export function CategoriesNav() {
  const { categories: CATEGORIES, ready } = useStoreCategories();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0];
  const menuIconRef = useRef<AlignRightIconHandle>(null);
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
            onMouseEnter={() => menuIconRef.current?.startAnimation()}
            onMouseLeave={() => menuIconRef.current?.stopAnimation()}
            className="inline-flex items-center gap-2 rounded-full bg-dino-red px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-dino-red/25 transition hover:bg-dino-red-hover"
          >
            <AlignRightIcon ref={menuIconRef} size={16} aria-hidden />
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
            <div className="absolute left-0 top-[calc(100%+10px)] z-50 flex w-[min(760px,92vw)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="w-60 shrink-0 border-r border-gray-100 py-2 dark:border-zinc-800">
                <div className="px-4 pb-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Categorias de produtos</div>
                {ready && CATEGORIES.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500 dark:text-zinc-400">Nenhuma categoria disponível.</p>
                )}
                {CATEGORIES.map((cat) => (
                  <a
                    key={cat.id}
                    href={cat.href}
                    onMouseEnter={() => setActiveId(cat.id)}
                    onFocus={() => setActiveId(cat.id)}
                    className={`flex items-center justify-between px-4 py-3 text-sm font-semibold transition ${active?.id === cat.id ? "bg-gray-50 text-dino-red dark:bg-zinc-900" : "text-gray-800 hover:text-dino-red dark:text-zinc-200"}`}
                  >
                    {cat.name}
                    {cat.children.length > 0 && <span className="text-gray-300">›</span>}
                  </a>
                ))}
              </div>
              <div className="max-h-[70vh] min-w-0 flex-1 overflow-y-auto p-5">
                {active && (
                  <>
                    <a href={active.href} className="text-xs font-bold uppercase tracking-wide text-dino-red hover:underline">Ver tudo em {active.name} ›</a>
                    {active.children.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">Em breve novos produtos nesta categoria.</p>
                    ) : (
                      <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        {active.children.map((sub) => (
                          <div key={sub.id}>
                            <a href={sub.href} className="text-sm font-black text-gray-900 transition hover:text-dino-red dark:text-white">{sub.name}</a>
                            {sub.children.length > 0 && (
                              <ul className="mt-1.5 space-y-1">
                                {sub.children.map((leaf) => (
                                  <li key={leaf.id}>
                                    <a href={leaf.href} className="text-sm text-gray-600 transition hover:text-dino-red dark:text-zinc-400">{leaf.name}</a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
