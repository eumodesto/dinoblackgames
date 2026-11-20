"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const input = "mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-dino-red";

/** Conexão com o Resend: remetente, resposta e se a chave está no ambiente. Os templates ficam na tela de e-mails. */
export default function ResendIntegrationForm() {
  const [loaded, setLoaded] = useState(false);
  const [from, setFrom] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [admins, setAdmins] = useState("");
  const [saved, setSaved] = useState({ from: "", replyTo: "", admins: "" });
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState("Carregando configuração…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email/settings")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar a configuração.");
        setFrom(data.from ?? "");
        setReplyTo(data.replyTo ?? "");
        const list = ((data.adminRecipients ?? []) as string[]).join("\n");
        setAdmins(list);
        setSaved({ from: data.from ?? "", replyTo: data.replyTo ?? "", admins: list });
        setConfigured(Boolean(data.configured));
        setStatus("");
        setLoaded(true);
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  async function save() {
    setSaving(true);
    setStatus("Salvando…");
    try {
      const response = await fetch("/api/admin/email/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, replyTo, adminRecipients: admins }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      setConfigured(Boolean(data.configured));
      const list = ((data.adminRecipients ?? []) as string[]).join("\n");
      setAdmins(list);
      setSaved({ from, replyTo, admins: list });
      setStatus("Remetente salvo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">{status}</div>;
  const dirty = from !== saved.from || replyTo !== saved.replyTo || admins !== saved.admins;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Resend</h2>
            <p className="mt-1 text-sm text-zinc-500">A chave de API é configurada no ambiente da Vercel e nunca fica salva no banco.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${configured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
            {configured ? "Configurado" : "Chave pendente"}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">Remetente
            <input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="DinoBlack Games <noreply@seudominio.com>" className={input} />
          </label>
          <label className="text-sm text-zinc-300">Responder para (opcional)
            <input value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="atendimento@seudominio.com" className={input} />
          </label>
        </div>
        <label className="mt-4 block text-sm text-zinc-300">E-mails da equipe (um por linha)
          <textarea value={admins} onChange={(event) => setAdmins(event.target.value)} rows={3} placeholder={"vendas@seudominio.com\nfinanceiro@seudominio.com"} spellCheck={false} className={`${input} font-mono text-xs leading-5`} />
          <span className="mt-1.5 block text-xs text-zinc-500">Recebem os avisos de novo pedido, pagamento pendente, cancelamento, troca e estorno. Cada aviso pode ser ligado ou desligado em Configurações → E-mails.</span>
        </label>
        <p className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-blue-200">Para ativar os envios, adicione <code>RESEND_API_KEY</code> na Vercel. O domínio do remetente também precisa estar verificado no Resend.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar remetente"}</button>
          <Link href="/admin/configuracoes/integracoes/email" className="text-sm font-bold text-zinc-300 hover:text-white">Editar templates e enviar teste →</Link>
          {status && <span role="status" className="text-xs text-zinc-400">{status}</span>}
        </div>
      </section>
    </div>
  );
}
