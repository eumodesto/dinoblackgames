import Link from "next/link";

/** Números de página com reticências: 1 … 4 5 [6] 7 8 … 20. */
function pageNumbers(current: number, total: number): (number | "gap")[] {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

const base = "inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-black transition";
const idle = "border-gray-200 bg-white text-gray-800 hover:border-dino-red hover:text-dino-red dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200";
const on = "border-dino-red bg-dino-red text-white shadow-lg shadow-dino-red/25";
const off = "pointer-events-none border-gray-100 bg-gray-50 text-gray-300 dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-700";

export function Pagination({ current, total, links }: { current: number; total: number; links: string[] }) {
  if (total <= 1) return null;
  const href = (n: number) => links[n - 1];

  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {current > 1 ? (
        <Link href={href(current - 1)} prefetch={false} scroll rel="prev" className={`${base} ${idle}`}>← Anterior</Link>
      ) : (
        <span aria-disabled className={`${base} ${off}`}>← Anterior</span>
      )}

      {pageNumbers(current, total).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-gray-400">…</span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            prefetch={false}
            scroll
            aria-current={item === current ? "page" : undefined}
            aria-label={`Página ${item}`}
            className={`${base} ${item === current ? on : idle}`}
          >
            {item}
          </Link>
        ),
      )}

      {current < total ? (
        <Link href={href(current + 1)} prefetch={false} scroll rel="next" className={`${base} ${idle}`}>Próxima →</Link>
      ) : (
        <span aria-disabled className={`${base} ${off}`}>Próxima →</span>
      )}
    </nav>
  );
}
