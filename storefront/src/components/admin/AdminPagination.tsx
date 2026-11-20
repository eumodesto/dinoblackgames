import Link from "next/link";

/** Páginas a exibir: 1 … 4 5 [6] 7 8 … 14 (sempre a primeira, a última e a vizinhança da atual). */
function windowOf(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/** Paginação por links (funciona sem JavaScript). `href(n)` monta o endereço da página n. */
export function AdminPagination({ page, pages, total, pageSize, href }: { page: number; pages: number; total: number; pageSize: number; href: (page: number) => string }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const base = "grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm font-semibold transition";
  const idle = `${base} border-zinc-700 text-zinc-300 hover:border-dino-red hover:text-white`;
  const off = `${base} cursor-not-allowed border-zinc-800 text-zinc-600`;
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
      <p>Mostrando <strong className="text-zinc-200">{from}–{to}</strong> de <strong className="text-zinc-200">{total}</strong></p>
      {pages > 1 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          <li>{page > 1 ? <Link href={href(page - 1)} className={idle} aria-label="Página anterior" rel="prev">‹</Link> : <span className={off} aria-hidden>‹</span>}</li>
          {windowOf(page, pages).map((n, i) => (
            <li key={`${n}-${i}`}>
              {n === "gap" ? (
                <span className="px-1 text-zinc-600" aria-hidden>…</span>
              ) : n === page ? (
                <span aria-current="page" className={`${base} border-dino-red bg-dino-red text-white`}>{n}</span>
              ) : (
                <Link href={href(n)} className={idle} aria-label={`Página ${n}`}>{n}</Link>
              )}
            </li>
          ))}
          <li>{page < pages ? <Link href={href(page + 1)} className={idle} aria-label="Próxima página" rel="next">›</Link> : <span className={off} aria-hidden>›</span>}</li>
        </ul>
      )}
    </nav>
  );
}
