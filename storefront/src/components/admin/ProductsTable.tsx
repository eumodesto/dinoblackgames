"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GooeyFilter } from "@/components/ui/liquid-toggle";
import { BulkEditPanel } from "./BulkEditPanel";
import { ProductStatusCell } from "./ProductStatusCell";

export type ProductRow = { id: string; name: string; sku: string; condition: string; categoryName: string; price: number; available: number; status: string; image: string | null };

const CONDITION_LABEL: Record<string, string> = { novo: "Novo", seminovo: "Seminovo", raridade: "Raridade", pre_venda: "Pré-venda" };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Lista de produtos com seleção múltipla e edição em lote (preço, promoção, publicação, categoria e mais). */
export function ProductsTable({ products, categories }: { products: ProductRow[]; categories: { id: string; label: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState(false);
  const [notice, setNotice] = useState("");
  const master = useRef<HTMLInputElement>(null);
  const ids = useMemo(() => products.map((p) => p.id), [products]);
  const chosen = ids.filter((id) => selected.has(id)); // só o que está na página atual
  const all = chosen.length === ids.length && ids.length > 0;

  // A seleção vale para a página aberta: mudou o filtro ou a página, recomeça.
  const signature = ids.join(",");
  useEffect(() => { setSelected(new Set()); setPanel(false); }, [signature]);
  useEffect(() => { if (master.current) master.current.indeterminate = chosen.length > 0 && !all; }, [chosen.length, all]);

  const toggle = (id: string) => setSelected((s) => { const next = new Set(s); if (!next.delete(id)) next.add(id); return next; });
  const toggleAll = () => setSelected(all ? new Set() : new Set(ids));
  const box = "h-4 w-4 cursor-pointer accent-[#da2230]";

  return (
    <div className="space-y-3">
      <GooeyFilter />
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">{notice}</p>}

      {chosen.length > 0 && (
        <div className="sticky top-2 z-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dino-red/40 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur">
            <p className="text-sm font-bold text-white">{chosen.length} selecionado{chosen.length === 1 ? "" : "s"}{all && ids.length > 1 ? " (a página toda)" : ""}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setNotice(""); setPanel((v) => !v); }} aria-expanded={panel} className="h-10 rounded-xl bg-dino-red px-4 text-sm font-bold text-white hover:bg-dino-red-hover">{panel ? "Fechar edição" : "Editar em lote"}</button>
              <button type="button" onClick={() => setSelected(new Set())} className="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200 hover:text-white">Limpar seleção</button>
            </div>
          </div>
          {panel && (
            <BulkEditPanel
              ids={chosen}
              categories={categories}
              onClose={() => setPanel(false)}
              onDone={(message) => { setNotice(message); setPanel(false); setSelected(new Set()); router.refresh(); }}
            />
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900">
            <tr>
              <th className="w-10 py-3 pl-4"><input ref={master} type="checkbox" checked={all} onChange={toggleAll} aria-label="Selecionar todos os produtos da página" className={box} /></th>
              <th className="px-4 py-3 font-bold text-zinc-400">Produto</th>
              <th className="hidden px-4 py-3 font-bold text-zinc-400 md:table-cell">SKU</th>
              <th className="hidden px-4 py-3 font-bold text-zinc-400 sm:table-cell">Categoria</th>
              <th className="px-4 py-3 font-bold text-zinc-400">Preço</th>
              <th className="hidden px-4 py-3 font-bold text-zinc-400 sm:table-cell">Estoque</th>
              <th className="px-4 py-3 font-bold text-zinc-400">Na loja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {products.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Nenhum produto encontrado.</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className={`transition ${selected.has(p.id) ? "bg-dino-red/5" : "hover:bg-zinc-900/50"}`}>
                <td className="w-10 py-3 pl-4"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Selecionar ${p.name}`} className={box} /></td>
                <td className="p-0">
                  <Link href={`/admin/produtos/${p.id}`} aria-label={`Editar ${p.name}`} className="flex min-w-0 items-center gap-3 px-4 py-3 hover:text-dino-red">
                    {p.image ? <Image src={p.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg bg-zinc-900 object-cover" /> : <div className="h-10 w-10 rounded-lg bg-zinc-800" />}
                    <div><div className="font-semibold text-white">{p.name}</div><div className="text-xs text-zinc-500">{CONDITION_LABEL[p.condition] ?? p.condition}</div></div>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs text-zinc-500 md:table-cell">{p.sku}</td>
                <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">{p.categoryName}</td>
                <td className="px-4 py-3 font-mono font-semibold text-white">{money(p.price)}</td>
                <td className="hidden px-4 py-3 sm:table-cell"><span className={`font-semibold ${p.available > 5 ? "text-emerald-400" : p.available > 0 ? "text-amber-400" : "text-red-400"}`}>{p.available}</span></td>
                <td className="px-4 py-3"><ProductStatusCell id={p.id} name={p.name} status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
