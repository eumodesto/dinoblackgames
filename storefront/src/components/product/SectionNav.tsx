"use client";

import { useEffect, useState } from "react";

type Item = { id: string; label: string };

/** Navegação fixa por seções da página de produto, com destaque da seção visível. */
export function SectionNav({ items, className = "" }: { items: Item[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);

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

  return (
    <nav
      aria-label="Seções do produto"
      className={`sticky top-16 z-40 -mx-4 lg:top-[68px] border-y border-gray-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-[#050507]/90 ${className}`}
    >
      <ul className="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "true" : undefined}
              className={`block rounded-full px-4 py-2 text-sm font-bold transition ${
                active === item.id
                  ? "bg-dino-red text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
