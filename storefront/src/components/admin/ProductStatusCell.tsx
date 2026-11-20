"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/liquid-toggle";

const BADGE: Record<string, { label: string; cls: string }> = {
  published: { label: "Publicado", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  draft: { label: "Rascunho", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
  archived: { label: "Arquivado", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  scheduled: { label: "Agendado", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
};

/** Status do produto com o botão que liga/desliga a exibição na loja (publicado ⇄ rascunho). */
export function ProductStatusCell({ id, name, status: initial }: { id: string; name: string; status: string }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const badge = BADGE[status] ?? BADGE.draft;

  async function change(published: boolean) {
    const previous = status;
    setStatus(published ? "published" : "draft"); // responde na hora; volta atrás se o servidor recusar
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível alterar.");
      setStatus(data.status);
    } catch (e) {
      setStatus(previous);
      setError(e instanceof Error ? e.message : "Não foi possível alterar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Toggle size="sm" checked={status === "published"} onCheckedChange={change} disabled={busy} variant="success" label={`${status === "published" ? "Ocultar da loja" : "Exibir na loja"}: ${name}`} />
      <div className="min-w-0">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>{badge.label}</span>
        {error && <p role="alert" className="mt-1 text-[11px] font-semibold text-red-300">{error}</p>}
      </div>
    </div>
  );
}
