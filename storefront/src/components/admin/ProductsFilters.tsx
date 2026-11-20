"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AdminSelect, type SelectOption } from "./AdminSelect";

export type ProductsFilterValues = { q: string; categoria: string; status: string; condicao: string; estoque: string; visibilidade: string; precoMin: string; precoMax: string };
const KEYS: (keyof ProductsFilterValues)[] = ["q", "categoria", "status", "condicao", "estoque", "visibilidade", "precoMin", "precoMax"];
export const emptyProductFilters: ProductsFilterValues = { q: "", categoria: "", status: "", condicao: "", estoque: "", visibilidade: "", precoMin: "", precoMax: "" };

const STATUS: SelectOption[] = [{ value: "", label: "Todos os status" }, { value: "published", label: "Publicado" }, { value: "draft", label: "Rascunho" }, { value: "scheduled", label: "Agendado" }, { value: "archived", label: "Arquivado" }];
const CONDITION: SelectOption[] = [{ value: "", label: "Todas as condições" }, { value: "novo", label: "Novo" }, { value: "seminovo", label: "Seminovo" }, { value: "raridade", label: "Raridade" }, { value: "pre_venda", label: "Pré-venda" }];
const STOCK: SelectOption[] = [{ value: "", label: "Qualquer estoque" }, { value: "com", label: "Com estoque" }, { value: "baixo", label: "Estoque baixo (1 a 5)" }, { value: "alerta", label: "Em alerta (esgotado ou abaixo do mínimo)" }, { value: "sem", label: "Sem estoque" }];
const VISIBILITY: SelectOption[] = [{ value: "", label: "Qualquer visibilidade" }, { value: "visible", label: "Visível na loja" }, { value: "hidden", label: "Oculto" }];

function toQuery(values: ProductsFilterValues) {
  const params = new URLSearchParams();
  for (const key of KEYS) if (values[key]) params.set(key, values[key]);
  return params.toString();
}

/**
 * Filtros de produtos sem botão "Filtrar": a lista se atualiza sozinha enquanto os campos são
 * preenchidos (texto com pequena espera; selects na hora). Mudar um filtro volta à página 1.
 */
export function ProductsFilters({ initial, categories }: { initial: ProductsFilterValues; categories: { slug: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = toQuery(values);
  const set = (key: keyof ProductsFilterValues) => (value: string) => setValues((old) => ({ ...old, [key]: value }));
  const active = KEYS.some((key) => values[key]);

  useEffect(() => {
    const shown = new URLSearchParams(current.toString());
    shown.delete("page");
    if (shown.toString() === query) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, current, pathname, router]);

  const text = "h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
  const categoryOptions: SelectOption[] = [{ value: "", label: "Todas as categorias" }, ...categories.map((c) => ({ value: c.slug, label: c.label }))];

  const extra = KEYS.filter((key) => key !== "q" && values[key]).length;
  const panelId = "products-filters-panel";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" role="search" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-3">
        <input value={values.q} onChange={(e) => set("q")(e.target.value)} placeholder="Nome, SKU (ID DinoBlack) ou categoria" aria-label="Buscar produtos" className={`${text} min-w-0 flex-1 basis-64`} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-white transition hover:border-dino-red"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M7 12h10M10 18h4" /></svg>
          Filtros
          {extra > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-dino-red px-1 text-[11px] text-white">{extra}</span>}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {active && !open && (
          <Link href="/admin/produtos" onClick={() => setValues(emptyProductFilters)} className="text-sm font-bold text-zinc-300 hover:text-white">Limpar</Link>
        )}
        <p className="gd-filter-status text-xs text-zinc-500" role="status" aria-live="polite">{pending ? "Atualizando…" : ""}</p>
      </div>

      <div id={panelId} hidden={!open} className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminSelect options={categoryOptions} value={values.categoria} onValueChange={set("categoria")} aria-label="Filtrar por categoria" />
        <AdminSelect options={STATUS} value={values.status} onValueChange={set("status")} aria-label="Filtrar por status" />
        <AdminSelect options={CONDITION} value={values.condicao} onValueChange={set("condicao")} aria-label="Filtrar por condição" />
        <AdminSelect options={STOCK} value={values.estoque} onValueChange={set("estoque")} aria-label="Filtrar por estoque" />
        <AdminSelect options={VISIBILITY} value={values.visibilidade} onValueChange={set("visibilidade")} aria-label="Filtrar por visibilidade" />
        <div className="flex gap-2 md:col-span-1 xl:col-span-2">
          <input type="number" min="0" step="0.01" value={values.precoMin} onChange={(e) => set("precoMin")(e.target.value)} placeholder="Preço mín." aria-label="Preço mínimo" className={`${text} min-w-0 flex-1`} />
          <input type="number" min="0" step="0.01" value={values.precoMax} onChange={(e) => set("precoMax")(e.target.value)} placeholder="Preço máx." aria-label="Preço máximo" className={`${text} min-w-0 flex-1`} />
        </div>
        {active && (
          <div className="md:col-span-2 xl:col-span-4">
            <Link href="/admin/produtos" onClick={() => setValues(emptyProductFilters)} className="inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white">Limpar filtros</Link>
          </div>
        )}
      </div>
    </div>
  );
}
