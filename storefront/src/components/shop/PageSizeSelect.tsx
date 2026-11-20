"use client";

import { useRouter } from "next/navigation";

type Option = { value: number; href: string };

/** Quantos produtos mostrar por página (10, 30 ou 50). Trocar volta para a página 1. */
export function PageSizeSelect({ options, value }: { options: Option[]; value: number }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-semibold text-gray-600 dark:text-zinc-400">Mostrar</span>
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((o) => String(o.value) === e.target.value);
          if (next) router.replace(next.href, { scroll: false });
        }}
        aria-label="Produtos por página"
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:border-dino-red focus:ring-2 focus:ring-dino-red/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} por página
          </option>
        ))}
      </select>
    </label>
  );
}
