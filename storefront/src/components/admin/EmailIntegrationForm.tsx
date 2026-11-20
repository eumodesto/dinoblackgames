"use client";

import { useEffect, useState } from "react";
import { AdminSelect } from "./AdminSelect";

const TEMPLATE_KEYS = [
  "account_created",
  "order_created",
  "order_paid",
  "order_shipped",
  "order_delivered",
  "used_request_received",
  "back_in_stock",
] as const;

type TemplateKey = (typeof TEMPLATE_KEYS)[number];
type Template = { name: string; subject: string; enabled: boolean; body: string };
type Templates = Record<TemplateKey, Template>;

const LABELS: Record<TemplateKey, string> = {
  account_created: "Nova conta",
  order_created: "Nova compra",
  order_paid: "Pagamento confirmado",
  order_shipped: "Pedido enviado",
  order_delivered: "Pedido entregue",
  used_request_received: "Solicitação de troca recebida",
  back_in_stock: "Produto disponível novamente",
};

export default function EmailIntegrationForm() {
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [from, setFrom] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState("Carregando configuração…");
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] = useState<TemplateKey>("account_created");

  useEffect(() => {
    fetch("/api/admin/email/settings")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar a configuração.");
        setTemplates(data.templates);
        setFrom(data.from ?? "");
        setReplyTo(data.replyTo ?? "");
        setConfigured(Boolean(data.configured));
        setStatus("Configuração carregada.");
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  function updateTemplate(key: TemplateKey, patch: Partial<Template>) {
    setTemplates((current) => current ? { ...current, [key]: { ...current[key], ...patch } } : current);
  }

  async function save() {
    if (!templates) return;
    setSaving(true);
    setStatus("Salvando templates…");
    try {
      const response = await fetch("/api/admin/email/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, replyTo, templates }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      setConfigured(Boolean(data.configured));
      setStatus("Templates salvos com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setStatus("Enviando teste…");
    const response = await fetch("/api/admin/email/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testTo, template: testTemplate }) });
    const data = await response.json();
    setStatus(data.message ?? data.error ?? "Teste processado.");
  }

  if (!templates) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">{status}</div>;

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
            <input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="DinoBlack Games <noreply@seudominio.com>" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-dino-red" />
          </label>
          <label className="text-sm text-zinc-300">Responder para (opcional)
            <input value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="atendimento@seudominio.com" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-dino-red" />
          </label>
        </div>
        <p className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-blue-200">Para ativar os envios, adicione <code>RESEND_API_KEY</code> na Vercel. O domínio do remetente também precisa estar verificado no Resend.</p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-bold text-white">Templates transacionais</h2><p className="mt-1 text-sm text-zinc-500">Use variáveis como <code>{"{{name}}"}</code>, <code>{"{{order_number}}"}</code> e <code>{"{{total}}"}</code>.</p></div>
          <button onClick={save} disabled={saving} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar templates"}</button>
        </div>
        <div className="mt-5 space-y-4">
          {TEMPLATE_KEYS.map((key) => {
            const template = templates[key];
            return <details key={key} open={key === "account_created"} className="rounded-xl border border-zinc-800 bg-zinc-950">
              <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-white">{LABELS[key]} <span className="ml-2 text-xs text-zinc-500">{template.enabled ? "Ativo" : "Desativado"}</span></summary>
              <div className="grid gap-4 border-t border-zinc-800 p-4">
                <label className="text-sm text-zinc-300">Nome<input value={template.name} onChange={(event) => updateTemplate(key, { name: event.target.value })} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
                <label className="text-sm text-zinc-300">Assunto<input value={template.subject} onChange={(event) => updateTemplate(key, { subject: event.target.value })} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
                <label className="text-sm text-zinc-300">Corpo HTML<textarea value={template.body} onChange={(event) => updateTemplate(key, { body: event.target.value })} rows={6} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-white" /></label>
                <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={template.enabled} onChange={(event) => updateTemplate(key, { enabled: event.target.checked })} /> Enviar este template quando o evento for ativado</label>
              </div>
            </details>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-lg font-bold text-white">Enviar teste</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="seu@email.com" type="email" className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
          <AdminSelect value={testTemplate} onValueChange={(value) => setTestTemplate(value as TemplateKey)} options={TEMPLATE_KEYS.map((key) => ({ value: key, label: LABELS[key] }))} aria-label="Modelo de e-mail do teste" className="min-w-[220px]" />
          <button onClick={sendTest} disabled={!testTo || !configured} className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-bold text-white hover:border-dino-red disabled:opacity-50">Enviar teste</button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">{status}</p>
      </section>
    </div>
  );
}
