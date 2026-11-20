import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { getSql } from "@/lib/server/sql";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
/** Sem mínimo definido, “baixo” é quando restam até 3 unidades. */
const FALLBACK_LOW = 3;
const LEVELS = [
  ["", "Todos"],
  ["sem", "Sem estoque"],
  ["baixo", "Estoque baixo"],
  ["ok", "Em dia"],
] as const;

type Row = { id: string; name: string; sku: string; options: Record<string, string> | null; status: string; on_hand: number; reserved: number; units: number; min_level: number; available: number };
type Params = { q?: string; nivel?: string; page?: string };

/** Estoque por variação: o que está disponível agora, o que está reservado em pedidos e quem precisa de reposição. */
export default async function StockPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const nivel = LEVELS.some(([key]) => key === params.nivel) ? (params.nivel ?? "") : "";
  const page = Math.max(1, Number(params.page) || 1);

  const sql = await getSql();
  const base = `
    with s as (
      select p.id, p.name, p.status::text as status, v.sku, v.option_values as options,
             coalesce((select sum(il.on_hand) from inventory_levels il where il.variant_id = v.id), 0)::int as on_hand,
             coalesce((select sum(il.reserved) from inventory_levels il where il.variant_id = v.id), 0)::int as reserved,
             (select count(*) from inventory_units u where u.variant_id = v.id and u.status = 'disponivel')::int as units,
             coalesce((select max(il.min_level) from inventory_levels il where il.variant_id = v.id), 0)::int as min_level
      from product_variants v
      join products p on p.id = v.product_id
      where v.is_active and p.status <> 'archived'
        and ($1 = '' or p.name ilike '%' || $1 || '%' or v.sku ilike '%' || $1 || '%')
    ), t as (
      select *, (on_hand - reserved + units) as available from s
    )`;
  const [counts] = await sql.query<{ total: number; sem: number; baixo: number }>(
    `${base}
     select count(*)::int as total,
            count(*) filter (where available <= 0)::int as sem,
            count(*) filter (where available > 0 and available <= greatest(min_level, ${FALLBACK_LOW}))::int as baixo
     from t`,
    [q],
  );
  const filter =
    nivel === "sem" ? "available <= 0"
    : nivel === "baixo" ? `available > 0 and available <= greatest(min_level, ${FALLBACK_LOW})`
    : nivel === "ok" ? `available > greatest(min_level, ${FALLBACK_LOW})`
    : "true";
  const [{ n: total }] = await sql.query<{ n: number }>(`${base} select count(*)::int as n from t where ${filter}`, [q]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = await sql.query<Row>(`${base} select * from t where ${filter} order by available asc, name, sku limit ${PAGE_SIZE} offset ${(current - 1) * PAGE_SIZE}`, [q]);

  const href = (n: number, level = nivel) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (level) query.set("nivel", level);
    if (n > 1) query.set("page", String(n));
    const text = query.toString();
    return text ? `/admin/estoque?${text}` : "/admin/estoque";
  };

  const cards = [
    { label: "Variações ativas", value: counts?.total ?? 0, tone: "text-white" },
    { label: "Sem estoque", value: counts?.sem ?? 0, tone: (counts?.sem ?? 0) > 0 ? "text-red-400" : "text-white" },
    { label: "Estoque baixo", value: counts?.baixo ?? 0, tone: (counts?.baixo ?? 0) > 0 ? "text-amber-400" : "text-white" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black text-white">Estoque</h1>
        <p className="mt-1 text-sm text-zinc-500">Saldo de cada variação. Disponível = em estoque − reservado em pedidos abertos (+ unidades únicas à venda).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{c.label}</p>
            <p className={`mt-1 font-display text-3xl font-black ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <form method="get" action="/admin/estoque" role="search" className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <input name="q" defaultValue={q} placeholder="Nome ou SKU" aria-label="Buscar no estoque" className="h-11 min-w-0 flex-1 basis-56 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red" />
        {nivel && <input type="hidden" name="nivel" value={nivel} />}
        <button className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white hover:bg-dino-red-hover">Buscar</button>
        <div role="group" aria-label="Filtrar por nível de estoque" className="flex w-full flex-wrap gap-2">
          {LEVELS.map(([key, label]) => (
            <Link key={key} href={href(1, key)} aria-current={nivel === key ? "true" : undefined} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${nivel === key ? "border-transparent bg-dino-red text-white" : "border-zinc-700 text-zinc-300 hover:text-white"}`}>{label}</Link>
          ))}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-bold">Produto</th>
              <th className="px-4 py-3 font-bold">SKU</th>
              <th className="px-4 py-3 text-right font-bold">Em estoque</th>
              <th className="px-4 py-3 text-right font-bold">Reservado</th>
              <th className="px-4 py-3 text-right font-bold">Disponível</th>
              <th className="px-4 py-3 text-right font-bold">Mínimo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Nenhuma variação encontrada.</td></tr>}
            {rows.map((r) => {
              const low = r.available > 0 && r.available <= Math.max(r.min_level, FALLBACK_LOW);
              const options = Object.values(r.options ?? {}).filter(Boolean).join(" · ");
              const state = r.status === "published" ? "" : r.status === "draft" ? "Rascunho" : r.status;
              return (
                <tr key={`${r.id}-${r.sku}`} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/produtos/${r.id}`} className="font-semibold text-white hover:text-dino-red">{r.name}</Link>
                    <div className="text-xs text-zinc-500">{[options, state].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.sku}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{r.on_hand + r.units}</td>
                  <td className="px-4 py-3 text-right text-zinc-400">{r.reserved}</td>
                  <td className={`px-4 py-3 text-right font-bold ${r.available <= 0 ? "text-red-400" : low ? "text-amber-400" : "text-emerald-400"}`}>{r.available}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">{r.min_level || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdminPagination page={current} pages={pages} total={total} pageSize={PAGE_SIZE} href={(n) => href(n)} />
      <p className="text-xs text-zinc-500">Para ajustar o saldo ou o mínimo, abra o produto e edite a variação.</p>
    </div>
  );
}
