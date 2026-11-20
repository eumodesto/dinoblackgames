"use client";

import { useState } from "react";
import type { StoreCategoryNode } from "./useStoreCategories";

/** Menu de categorias para telas pequenas: principal → subcategoria → item, abrindo por toque. */
export function CategoryAccordion({ tree, onNavigate }: { tree: StoreCategoryNode[]; onNavigate?: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const link = "block px-4 py-2.5 text-sm text-gray-700 transition hover:text-dino-red dark:text-zinc-300";
  return (
    <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
      {tree.map((main) => {
        const isOpen = openId === main.id;
        return (
          <li key={main.id}>
            <div className="flex items-stretch">
              <a href={main.href} onClick={onNavigate} className="flex-1 px-4 py-3 text-sm font-bold text-gray-900 transition hover:text-dino-red dark:text-white">
                {main.name}
              </a>
              {main.children.length > 0 && (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`Subcategorias de ${main.name}`}
                  onClick={() => setOpenId(isOpen ? null : main.id)}
                  className="px-4 text-gray-400 transition hover:text-dino-red"
                >
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                </button>
              )}
            </div>
            {isOpen && (
              <div className="bg-gray-50 pb-2 dark:bg-zinc-900/60">
                {main.children.map((sub) => (
                  <div key={sub.id}>
                    <a href={sub.href} onClick={onNavigate} className={`${link} font-semibold`}>{sub.name}</a>
                    {sub.children.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 px-8 pb-1">
                        {sub.children.map((leaf) => (
                          <a key={leaf.id} href={leaf.href} onClick={onNavigate} className="py-1 text-xs text-gray-500 transition hover:text-dino-red dark:text-zinc-400">
                            {leaf.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
