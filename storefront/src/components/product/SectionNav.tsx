"use client";

import { useEffect, useRef, useState } from "react";

type Item = { id: string; label: string };

/** Navegação fixa por seções da página de produto, com destaque da seção visível (vidro com brilho). */
export function SectionNav({ items, className = "" }: { items: Item[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  // Em telas estreitas a lista rola; mantém o item ativo à vista.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="true"]');
    const box = list.current;
    if (!el || !box) return;
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="Seções do produto" className={`sticky top-16 z-40 py-2 lg:top-[68px] ${className}`}>
      <div className="relative mx-auto max-w-fit overflow-hidden rounded-full border border-white/70 bg-gradient-to-b from-white/85 via-white/55 to-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.04),0_10px_34px_-8px_rgba(15,23,42,0.22)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 max-sm:max-w-full dark:border-white/10 dark:from-white/[0.14] dark:via-white/[0.07] dark:to-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_34px_-8px_rgba(0,0,0,0.7)] dark:ring-white/5">
        {/* brilho (gloss): reflexo suave na metade de cima */}
        <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-b-[40%] bg-gradient-to-b from-white/70 to-transparent dark:from-white/15" />
        <ul ref={list} className="scrollbar-none relative flex gap-1 overflow-x-auto p-1.5">
          {items.map((item) => {
            const on = active === item.id;
            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  aria-current={on ? "true" : undefined}
                  className={`relative block overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${
                    on
                      ? "bg-gradient-to-b from-[#ff5360] to-dino-red text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_16px_-2px_rgba(218,34,48,0.55)]"
                      : "text-gray-700 hover:bg-white/70 hover:text-gray-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  {on && <span aria-hidden className="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-b-full bg-gradient-to-b from-white/45 to-transparent" />}
                  <span className="relative">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
