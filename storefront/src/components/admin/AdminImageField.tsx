"use client";

import { useRef, useState } from "react";

const input = "mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
const label = "text-xs font-bold uppercase tracking-wide text-zinc-400";

/** Imagem por envio (arquivo vira WebP no bucket público) ou por link. Mostra a pré-visualização e permite remover. */
export function AdminImageField({ title, value, onChange, placeholder, uploadName = "imagem", ratio = "aspect-[16/7]" }: { title: string; value: string; onChange: (value: string) => void; placeholder?: string; /** Base do nome do arquivo no armazenamento (vira parte do endereço da imagem). */ uploadName?: string; /** Proporção da pré-visualização (classe do Tailwind). */ ratio?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    try {
      const body = new FormData();
      body.set("name", uploadName);
      body.append("files", file);
      const response = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Falha no envio da imagem.");
      onChange(data.files?.[0]?.url ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no envio da imagem.");
    } finally {
      setBusy(false); setDragging(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <span className={label}>{title}</span>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files); }}
        className={`mt-1 grid gap-3 rounded-xl border border-dashed p-3 transition sm:grid-cols-[160px_1fr] ${dragging ? "border-dino-red bg-dino-red/10" : "border-zinc-700"}`}
      >
        <div className={`grid ${ratio} place-items-center overflow-hidden rounded-lg bg-zinc-900 text-center text-[11px] font-semibold text-zinc-500`}>
          {value
            ? /* eslint-disable-next-line @next/next/no-img-element -- pré-visualização no admin */ <img src={value} alt="Imagem de fundo do destaque" className="h-full w-full object-cover" />
            : "Sem imagem própria"}
        </div>
        <div className="grid content-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files)} />
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="h-10 rounded-xl bg-dino-red px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}</button>
            {value && <button type="button" onClick={() => onChange("")} className="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-300 hover:border-dino-red hover:text-white">Remover</button>}
            <span className="text-xs text-zinc-500">ou arraste um arquivo aqui (JPG, PNG, WebP · até 4 MB)</span>
          </div>
          <input aria-label={`${title}: link da imagem`} className={input} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
          {error && <p role="alert" className="text-xs font-semibold text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
