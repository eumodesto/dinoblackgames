"use client";

import { useState } from "react";

const field = "mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";

export default function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== again) return setMessage({ ok: false, text: "A confirmação não é igual à nova senha." });
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível trocar a senha.");
      setMessage({ ok: true, text: "Senha trocada." });
      setCurrent(""); setNext(""); setAgain("");
      if (forced) window.location.assign("/admin"); // primeiro acesso: libera o painel
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Não foi possível trocar a senha." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <label className="block text-sm text-zinc-300">Senha atual<input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} required /></label>
      <label className="block text-sm text-zinc-300">Nova senha<input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} minLength={10} className={field} required /><span className="mt-1.5 block text-xs text-zinc-500">Pelo menos 10 caracteres, com letras e números.</span></label>
      <label className="block text-sm text-zinc-300">Repita a nova senha<input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={field} required /></label>
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm font-semibold ${message.ok ? "text-emerald-400" : "text-red-300"}`}>{message.text}</p>}
      <button type="submit" disabled={busy} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white hover:bg-dino-red-hover disabled:opacity-50">{busy ? "Salvando…" : "Trocar senha"}</button>
    </form>
  );
}
