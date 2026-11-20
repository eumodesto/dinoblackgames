"use client";

import { useEffect, useState } from "react";
import { BULK_LABEL, type BulkAction, type PriceMode, type Rounding } from "@/lib/bulk-products";
import { brl } from "@/lib/checkout-types";
import { AdminSelect } from "./AdminSelect";

type Sample = { name: string; sku: string; oldPrice: number; oldCompare: number | null; newPrice: number; newCompare: number | null };
type Preview = { matched: number; totals?: { products: number; variants: number }; sample?: Sample[] };

const ACTIONS: BulkAction[] = ["price", "promo", "publish", "unpublish", "visibility", "category", "badge", "warranty", "installments", "archive"];
const field = "mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";

/** Painel de edição em lote dos produtos selecionados: escolhe a ação, mostra o efeito e só então aplica. */
export function BulkEditPanel({ ids, categories, onDone, onClose }: { ids: string[]; categories: { id: string; label: string }[]; onDone: (message: string) => void; onClose: () => void }) {
  const [action, setAction] = useState<BulkAction>("price");
  const [mode, setMode] = useState<PriceMode>("percent");
  const [value, setValue] = useState("");
  const [rounding, setRounding] = useState<Rounding>("none");
  const [promoMode, setPromoMode] = useState<"apply" | "remove">("apply");
  const [percent, setPercent] = useState("10");
  const [visibility, setVisibility] = useState<"visible" | "hidden">("visible");
  const [categoryId, setCategoryId] = useState("");
  const [badge, setBadge] = useState("");
  const [months, setMonths] = useState("12");
  const [count, setCount] = useState("10");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const params = (): Record<string, unknown> => {
    switch (action) {
      case "price": return { mode, value, rounding };
      case "promo": return promoMode === "remove" ? { mode: "remove" } : { mode: "apply", percent, rounding };
      case "visibility": return { value: visibility };
      case "category": return { categoryId };
      case "badge": return { text: badge };
      case "warranty": return { months };
      case "installments": return { count };
      default: return {};
    }
  };

  async function call(dryRun: boolean) {
    const res = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action, params: params(), dryRun }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir.");
    return data;
  }

  // Mostra o efeito enquanto o formulário é preenchido (leitura apenas, nada é gravado).
  const key = JSON.stringify([action, params(), ids]);
  useEffect(() => {
    setPreview(null);
    setError("");
    const t = window.setTimeout(() => {
      call(true).then(setPreview).catch((e: Error) => setError(e.message));
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function apply() {
    if (action === "archive" && !window.confirm(`Arquivar ${ids.length} produto(s)? Eles saem da loja.`)) return;
    setBusy(true);
    setError("");
    try {
      const data = await call(false);
      onDone(`${BULK_LABEL[action]}: ${data.matched} produto${data.matched === 1 ? "" : "s"} atualizado${data.matched === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  const ready = !error && preview !== null;
  const plural = ids.length === 1 ? "produto" : "produtos";

  return (
    <section aria-label="Editar produtos selecionados" className="rounded-2xl border border-dino-red/40 bg-zinc-900/90 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-bold text-white">Editar {ids.length} {plural} de uma vez</h2><p className="mt-0.5 text-xs text-zinc-500">Veja o efeito antes de aplicar. Nada é gravado até você confirmar.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white">Fechar</button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="text-sm text-zinc-300">O que fazer
          <div className="mt-2"><AdminSelect value={action} onValueChange={(v) => setAction(v as BulkAction)} aria-label="Ação em lote" options={ACTIONS.map((a) => ({ value: a, label: BULK_LABEL[a] }))} /></div>
        </div>

        <div className="space-y-3">
          {action === "price" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-sm text-zinc-300">Tipo<div className="mt-2"><AdminSelect value={mode} onValueChange={(v) => setMode(v as PriceMode)} aria-label="Tipo de ajuste" options={[{ value: "percent", label: "Porcentagem (±%)" }, { value: "amount", label: "Valor em R$ (±)" }, { value: "set", label: "Definir preço" }]} /></div></div>
              <label className="block text-sm text-zinc-300">{mode === "percent" ? "Ajuste (%)" : mode === "amount" ? "Ajuste (R$)" : "Novo preço (R$)"}<input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={mode === "set" ? "199,90" : "-10 ou 10"} className={field} /></label>
              <div className="text-sm text-zinc-300">Arredondar<div className="mt-2"><AdminSelect value={rounding} onValueChange={(v) => setRounding(v as Rounding)} aria-label="Arredondamento" options={[{ value: "none", label: "Sem arredondar" }, { value: "ends90", label: "Terminar em ,90" }, { value: "whole", label: "Reais inteiros" }]} /></div></div>
            </div>
          )}
          {action === "promo" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-sm text-zinc-300">Promoção<div className="mt-2"><AdminSelect value={promoMode} onValueChange={(v) => setPromoMode(v as "apply" | "remove")} aria-label="Promoção" options={[{ value: "apply", label: "Aplicar desconto" }, { value: "remove", label: "Remover promoção" }]} /></div></div>
              {promoMode === "apply" && <>
                <label className="block text-sm text-zinc-300">Desconto (%)<input value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" className={field} /></label>
                <div className="text-sm text-zinc-300">Arredondar<div className="mt-2"><AdminSelect value={rounding} onValueChange={(v) => setRounding(v as Rounding)} aria-label="Arredondamento" options={[{ value: "none", label: "Sem arredondar" }, { value: "ends90", label: "Terminar em ,90" }, { value: "whole", label: "Reais inteiros" }]} /></div></div>
              </>}
              <p className="text-xs leading-5 text-zinc-500 sm:col-span-3">{promoMode === "apply" ? "O preço atual vira o “de” (riscado) e o “por” cai pelo desconto. Repetir a ação dá o mesmo resultado." : "O preço volta ao valor “de” e a promoção some."}</p>
            </div>
          )}
          {action === "visibility" && <div className="text-sm text-zinc-300">Nas listas e na busca<div className="mt-2 max-w-sm"><AdminSelect value={visibility} onValueChange={(v) => setVisibility(v as "visible" | "hidden")} aria-label="Visibilidade" options={[{ value: "visible", label: "Visível" }, { value: "hidden", label: "Oculto (só pelo link direto)" }]} /></div></div>}
          {action === "category" && <div className="text-sm text-zinc-300">Nova categoria<div className="mt-2 max-w-md"><AdminSelect value={categoryId} onValueChange={setCategoryId} aria-label="Categoria" options={[{ value: "", label: "Escolha a categoria" }, ...categories.map((c) => ({ value: c.id, label: c.label }))]} /></div></div>}
          {action === "badge" && <label className="block max-w-sm text-sm text-zinc-300">Texto do selo (vazio remove)<input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={24} placeholder="Ex.: Oferta, Lançamento" className={field} /></label>}
          {action === "warranty" && <label className="block max-w-xs text-sm text-zinc-300">Garantia (meses)<input value={months} onChange={(e) => setMonths(e.target.value)} inputMode="numeric" className={field} /></label>}
          {action === "installments" && <label className="block max-w-xs text-sm text-zinc-300">Parcelas máximas (1 a 12)<input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" className={field} /></label>}
          {(action === "publish" || action === "unpublish" || action === "archive") && (
            <p className="text-sm text-zinc-400">{action === "publish" ? "Os produtos passam a aparecer na loja." : action === "unpublish" ? "Os produtos saem da loja e ficam como rascunho; dá para publicar de novo depois." : "Os produtos saem da loja e ficam arquivados."}</p>
          )}
        </div>
      </div>

      {preview?.sample && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
          <p className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">{preview.totals?.variants} variação(ões) em {preview.totals?.products} produto(s)
            {preview.sample.length < (preview.totals?.variants ?? 0) ? ` · mostrando ${preview.sample.length}` : ""}</p>
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="text-zinc-500"><tr><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Antes</th><th className="px-3 py-2">Depois</th></tr></thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
              {preview.sample.map((r) => (
                <tr key={r.sku}>
                  <td className="px-3 py-2"><span className="block font-semibold text-white">{r.name}</span><span className="font-mono text-[11px] text-zinc-500">{r.sku}</span></td>
                  <td className="px-3 py-2 font-mono">{brl(r.oldPrice)}{r.oldCompare !== null && <span className="ml-2 text-zinc-500 line-through">{brl(r.oldCompare)}</span>}</td>
                  <td className="px-3 py-2 font-mono font-bold text-white">{brl(r.newPrice)}{r.newCompare !== null && <span className="ml-2 font-normal text-zinc-500 line-through">{brl(r.newCompare)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-300">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={apply} disabled={busy || !ready} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{busy ? "Aplicando…" : `Aplicar a ${ids.length} ${plural}`}</button>
        {!ready && !error && <span className="text-xs text-zinc-500">Preencha os campos para ver o efeito…</span>}
      </div>
    </section>
  );
}
