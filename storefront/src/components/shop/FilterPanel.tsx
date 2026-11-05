import Link from "next/link";
import type { FacetView } from "@/lib/shop";

type PromoView = { count: number; selected: boolean; href: string };

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${
        on ? "border-dino-red bg-dino-red text-white" : "border-gray-300 dark:border-zinc-600"
      }`}
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      )}
    </span>
  );
}

function Row({ label, count, selected, href }: { label: string; count: number; selected: boolean; href: string }) {
  const disabled = count === 0 && !selected;
  const body = (
    <>
      <Check on={selected} />
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      <span className="font-mono text-xs text-gray-500 dark:text-zinc-500">{count}</span>
    </>
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-gray-400 opacity-60 dark:text-zinc-600">
        {body}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-gray-800 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-dino-red dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {body}
      <span className="sr-only">{selected ? ", selecionado. Remover filtro" : ". Aplicar filtro"}</span>
    </Link>
  );
}

export function FilterPanel({
  facets,
  promo,
  clearHref,
  activeCount,
}: {
  facets: FacetView[];
  promo: PromoView;
  clearHref: string;
  activeCount: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2 pb-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Filtros</h2>
        {activeCount > 0 && (
          <Link href={clearHref} prefetch={false} scroll={false} className="text-xs font-bold text-dino-red hover:underline">
            Limpar tudo
          </Link>
        )}
      </div>

      <div className="border-t border-gray-200 py-2 dark:border-zinc-800">
        <Row label="Em promoção" count={promo.count} selected={promo.selected} href={promo.href} />
      </div>

      {facets.map((facet) => (
        <details key={facet.id} open className="group border-t border-gray-200 py-2 dark:border-zinc-800">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-2 text-sm font-black text-gray-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
            {facet.title}
            <span aria-hidden className="text-lg text-dino-red transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="mt-1 flex flex-col">
            {facet.options.map((opt) => (
              <Row key={opt.value} label={opt.label} count={opt.count} selected={opt.selected} href={opt.href} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
