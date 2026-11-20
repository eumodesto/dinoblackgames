"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CSV_COLUMNS, MAX_IMPORT_BYTES, MAX_IMPORT_PRODUCTS } from "@/lib/product-csv";

type Change = { label: string; before: string; after: string };
type Item = { key: string; rows: number[]; action: "create" | "update" | "error"; sku: string; name: string; category: string; price: string; stock: string; variants: number; errors: string[]; warnings: string[]; changes: Change[] };
type Preview = { fileErrors: string[]; ignoredColumns: string[]; extras: boolean; totalRows: number; items: Item[]; counts: { create: number; update: number; error: number } };
type Result = { created: number; updated: number; failed: { sku: string; name: string; error: string }[]; skipped: number };

const ACTION: Record<Item["action"], { label: string; tone: string }> = {
  create: { label: "Novo", tone: "bg-emerald-500/15 text-emerald-300" },
  update: { label: "Atualiza", tone: "bg-sky-500/15 text-sky-300" },
  error: { label: "Com erro", tone: "bg-red-500/15 text-red-300" },
};
const SHOWN = 200;
const btn = "inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-white transition hover:border-dino-red disabled:opacity-50";

/** Lê o arquivo como UTF-8; se não for (Excel antigo salva em Windows-1252), tenta Windows-1252 para não perder os acentos. */
async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function ProductsImportExport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "apply">("");
  const [error, setError] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [guide, setGuide] = useState(false);
  // O painel ocupa a largura toda, logo abaixo do cabeçalho da página (os botões ficam no cabeçalho).
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById("products-import-slot")); }, []);

  function reset() {
    setCsv(""); setFileName(""); setPreview(null); setResult(null); setError(""); setOnlyErrors(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(""); setResult(null); setPreview(null);
    if (!/\.(csv|txt)$/i.test(file.name) && !file.type.includes("csv") && !file.type.startsWith("text/")) return setError("Envie um arquivo .csv (use o modelo).");
    if (file.size > MAX_IMPORT_BYTES) return setError(`Arquivo grande demais (máximo ${Math.round(MAX_IMPORT_BYTES / 1_000_000)} MB). Divida em partes.`);
    const text = await readText(file);
    setCsv(text); setFileName(file.name); setBusy("preview");
    try {
      const res = await fetch("/api/admin/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "preview", csv: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível ler o arquivo.");
      setPreview(data as Preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setBusy("");
    }
  }

  async function apply() {
    if (!csv || !preview) return;
    setBusy("apply"); setError("");
    try {
      const res = await fetch("/api/admin/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "apply", csv }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível importar.");
      setResult(data.result as Result);
      setPreview(null); setCsv("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setBusy("");
    }
  }

  const valid = preview ? preview.counts.create + preview.counts.update : 0;
  const items = preview ? (onlyErrors ? preview.items.filter((i) => i.action === "error") : preview.items) : [];

  return (
    <div className="contents">
      <a href="/api/admin/products/export" download className={btn} title="Baixa todos os produtos (qualquer status) em CSV">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
        Exportar CSV
      </a>
      <button type="button" onClick={() => { setOpen((v) => !v); }} aria-expanded={open} aria-controls="products-import-panel" className={btn}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14" /></svg>
        Importar CSV
      </button>

      {open && slot && createPortal(
        <section id="products-import-panel" aria-label="Importar produtos por CSV" className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Importar produtos</h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                1) Baixe o modelo e preencha sem mudar os nomes das colunas. 2) Envie o arquivo e confira a pré-visualização. 3) Confirme. Nada é gravado antes da sua confirmação.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/api/admin/products/import" download className={btn}>Baixar modelo CSV</a>
              <button type="button" onClick={() => setGuide((v) => !v)} aria-expanded={guide} className={btn}>{guide ? "Ocultar colunas" : "Como preencher"}</button>
            </div>
          </div>

          {guide && (
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-zinc-400">
                <li>Uma linha por variação. Produto sem variações = uma linha. Várias linhas com o mesmo <b className="text-zinc-200">sku</b> = variações do mesmo produto (use a coluna <b className="text-zinc-200">opcoes</b>).</li>
                <li><b className="text-zinc-200">sku</b> existente atualiza o produto; vazio (ou novo) cria. Em produto existente, célula vazia <b className="text-zinc-200">não altera</b> o que já está salvo.</li>
                <li>Produto novo entra como <b className="text-zinc-200">rascunho</b> se o status ficar vazio. Imagens são links: o arquivo não envia fotos.</li>
                <li>Salve como “CSV UTF-8” no Excel. Separador “;” ou “,”; preços como 1.199,90 ou 1199.90. Máximo de {MAX_IMPORT_PRODUCTS} produtos por arquivo.</li>
              </ul>
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs">
                <thead><tr className="text-zinc-500"><th className="py-1.5 pr-3 font-bold">Coluna</th><th className="py-1.5 font-bold">O que vai</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">{CSV_COLUMNS.map((c) => <tr key={c.key}><td className="py-1.5 pr-3 align-top font-mono font-bold text-zinc-200">{c.header}</td><td className="py-1.5 text-zinc-400">{c.help}</td></tr>)}</tbody>
              </table></div>
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void pick(e.dataTransfer.files); }}
            className={`flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed p-4 transition ${dragging ? "border-dino-red bg-dino-red/10" : "border-zinc-700"}`}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => void pick(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== ""} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white disabled:opacity-50">{fileName ? "Trocar arquivo" : "Escolher arquivo CSV"}</button>
            <span className="text-sm text-zinc-400">{busy === "preview" ? "Lendo e validando o arquivo…" : fileName ? <>Arquivo: <b className="text-zinc-200">{fileName}</b></> : "ou arraste o arquivo CSV para cá"}</span>
            {(fileName || result) && busy === "" && <button type="button" onClick={reset} className="ml-auto text-xs font-bold text-zinc-400 hover:text-white">Limpar</button>}
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">{error}</p>}

          {preview && preview.fileErrors.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">{preview.fileErrors.map((m) => <p key={m}>{m}</p>)}</div>
          )}

          {preview && preview.fileErrors.length === 0 && (
            <div className="space-y-3">
              <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-bold text-emerald-300">{preview.counts.create} {preview.counts.create === 1 ? "novo" : "novos"}</span>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 font-bold text-sky-300">{preview.counts.update} {preview.counts.update === 1 ? "atualização" : "atualizações"}</span>
                <span className={`rounded-full px-3 py-1 font-bold ${preview.counts.error > 0 ? "bg-red-500/15 text-red-300" : "bg-zinc-800 text-zinc-400"}`}>{preview.counts.error} com erro</span>
                <span className="text-xs text-zinc-500">{preview.totalRows} {preview.totalRows === 1 ? "linha lida" : "linhas lidas"}</span>
                {preview.counts.error > 0 && <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-300"><input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} className="h-4 w-4 accent-[#da2230]" />Mostrar só os erros</label>}
              </div>
              {preview.ignoredColumns.length > 0 && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-200">Colunas ignoradas (nome não reconhecido): {preview.ignoredColumns.join(", ")}.</p>}

              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-500">
                    <tr><th className="px-3 py-2.5 font-bold">Linha</th><th className="px-3 py-2.5 font-bold">Ação</th><th className="px-3 py-2.5 font-bold">Produto</th><th className="px-3 py-2.5 font-bold">Categoria</th><th className="px-3 py-2.5 font-bold">Preço</th><th className="px-3 py-2.5 font-bold">Estoque</th><th className="px-3 py-2.5 font-bold">Var.</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                    {items.slice(0, SHOWN).map((it) => (
                      <tr key={it.key} className="align-top">
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{it.rows.length > 1 ? `${it.rows[0]}–${it.rows[it.rows.length - 1]}` : it.rows[0]}</td>
                        <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${ACTION[it.action].tone}`}>{ACTION[it.action].label}</span></td>
                        <td className="max-w-[320px] px-3 py-2.5">
                          <div className="font-semibold text-white">{it.name}</div>
                          <div className="font-mono text-[11px] text-zinc-500">{it.sku || "SKU gerado automaticamente"}</div>
                          {it.errors.map((m) => <p key={m} className="mt-1 text-xs font-semibold text-red-300">✕ {m}</p>)}
                          {it.warnings.map((m) => <p key={m} className="mt-1 text-xs text-amber-300">⚠ {m}</p>)}
                          {it.changes.length > 0 && <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-400">{it.changes.map((c) => <li key={c.label}><span className="text-zinc-500">{c.label}:</span> {c.before} <span aria-hidden>→</span><span className="sr-only">para</span> <b className="text-zinc-200">{c.after}</b></li>)}</ul>}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">{it.category || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-zinc-200">{it.price}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{it.stock}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{it.variants || "—"}</td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Nenhum item para mostrar.</td></tr>}
                  </tbody>
                </table>
              </div>
              {items.length > SHOWN && <p className="text-xs text-zinc-500">Mostrando os primeiros {SHOWN} de {items.length}. A importação considera todos.</p>}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void apply()} disabled={busy !== "" || valid === 0} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">
                  {busy === "apply" ? "Importando…" : `Importar ${valid} ${valid === 1 ? "produto" : "produtos"}`}
                </button>
                {preview.counts.error > 0 && <span className="text-xs text-zinc-500">{preview.counts.error} {preview.counts.error === 1 ? "produto com erro será ignorado" : "produtos com erro serão ignorados"}. Corrija o arquivo e envie de novo para incluí-los.</span>}
                {valid > 0 && preview.counts.update > 0 && <span className="text-xs text-zinc-500">Atualizações alteram produtos existentes. Exporte antes, se quiser um backup.</span>}
              </div>
            </div>
          )}

          {result && (
            <div role="status" className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              <p className="font-bold text-emerald-200">Importação concluída: {result.created} {result.created === 1 ? "produto criado" : "produtos criados"}, {result.updated} {result.updated === 1 ? "atualizado" : "atualizados"}{result.skipped ? `, ${result.skipped} ignorado(s) por erro` : ""}.</p>
              {result.failed.length > 0 && (
                <div className="text-red-300">
                  <p className="font-bold">Falharam ao gravar ({result.failed.length}):</p>
                  <ul className="mt-1 list-disc pl-5 text-xs">{result.failed.map((f) => <li key={f.sku + f.name}>{f.sku || f.name}: {f.error}</li>)}</ul>
                </div>
              )}
              <p className="text-xs text-zinc-400">Produtos novos entram como rascunho (a menos que o status venha no arquivo). Revise e publique pela lista.</p>
            </div>
          )}
        </section>,
        slot,
      )}
    </div>
  );
}
