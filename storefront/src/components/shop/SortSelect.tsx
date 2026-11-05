"use client";

import { useRouter } from "next/navigation";

type Option = { value: string; label: string; href: string };

export function SortSelect({ options, value }: { options: Option[]; value: string }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden font-semibold text-gray-600 dark:text-zinc-400 sm:inline">Ordenar por</span>
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) router.replace(next.href, { scroll: false });
        }}
        aria-label="Ordenar produtos"
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:border-dino-red focus:ring-2 focus:ring-dino-red/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
