"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUDIENCE_LABEL, type EmailAudience, type EmailTemplate } from "@/lib/email-templates";

type Meta = { key: string; audience: EmailAudience; label: string; when: string; defaults: EmailTemplate; delayed?: boolean };
type Limits = { sendAfterMin: number; sendAfterMax: number; payWindow: number };
const AUDIENCES: EmailAudience[] = ["customer", "admin", "staff"];
const field = "mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";

export default function EmailIntegrationForm() {
  const [templates, setTemplates] = useState<Record<string, EmailTemplate> | null>(null);
  const [saved, setSaved] = useState<Record<string, EmailTemplate>>({});
  const [meta, setMeta] = useState<Meta[]>([]);
  const [variables, setVariables] = useState<[string, string][]>([]);
  const [limits, setLimits] = useState<Limits>({ sendAfterMin: 1, sendAfterMax: 29, payWindow: 30 });
  const [configured, setConfigured] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState("Carregando configuração…");
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [recipients, setRecipients] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const openRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    fetch("/api/admin/email/settings")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar a configuração.");
        setTemplates(data.templates);
        setSaved(data.templates);
        setMeta(data.meta);
        setVariables(data.variables);
        if (data.limits) setLimits(data.limits);
        setConfigured(Boolean(data.configured));
        setRecipients((data.adminRecipients ?? []).length);
        setStatus("");
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  const current = selected ? templates?.[selected] : undefined;
  const currentMeta = meta.find((m) => m.key === selected);
  const dirtyKeys = useMemo(() => (templates ? Object.keys(templates).filter((k) => JSON.stringify(templates[k]) !== JSON.stringify(saved[k])) : []), [templates, saved]);

  const update = (patch: Partial<EmailTemplate>) => {
    if (!selected) return;
    setTemplates((all) => (all ? { ...all, [selected]: { ...all[selected], ...patch } } : all));
  };

  const loadPreview = useCallback(async (key: string, draft: EmailTemplate) => {
    try {
      const response = await fetch("/api/admin/email/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", template: key, draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível gerar a pré-visualização.");
      setPreview(data);
      setPreviewError("");
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Não foi possível gerar a pré-visualização.");
    }
  }, []);

  useEffect(() => {
    if (!current || !selected) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void loadPreview(selected, current), 400);
    return () => window.clearTimeout(timer.current);
  }, [current, selected, loadPreview]);

  // Ao abrir um template, leva a tela até ele (a lista é longa e o editor abre logo abaixo do item).
  useEffect(() => {
    if (selected) openRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  async function save() {
    if (!templates || dirtyKeys.length === 0) return;
    const badTime = dirtyKeys.find((k) => meta.find((m) => m.key === k)?.delayed && !(Number.isInteger(templates[k].sendAfterMinutes) && (templates[k].sendAfterMinutes as number) >= limits.sendAfterMin && (templates[k].sendAfterMinutes as number) <= limits.sendAfterMax));
    if (badTime) {
      setStatus(`Corrija o tempo de envio de “${meta.find((m) => m.key === badTime)?.label}”: use entre ${limits.sendAfterMin} e ${limits.sendAfterMax} minutos.`);
      return;
    }
    setSaving(true);
    setStatus("Salvando templates…");
    try {
      const changed = Object.fromEntries(dirtyKeys.map((k) => [k, templates[k]]));
      const response = await fetch("/api/admin/email/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templates: changed }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      setSaved(data.templates);
      setTemplates(data.templates);
      setConfigured(Boolean(data.configured));
      setStatus(`${dirtyKeys.length === 1 ? "Template salvo" : `${dirtyKeys.length} templates salvos`}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!selected) return;
    setStatus("Enviando teste…");
    const response = await fetch("/api/admin/email/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: selected, to: testTo }) });
    const data = await response.json();
    setStatus(data.message ?? data.error ?? "Teste processado.");
  }

  if (!templates) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">{status}</div>;

  const editor = current && selected && (
    <div id={`editor-${selected}`} role="region" aria-label={`Editar ${currentMeta?.label ?? "template"}`} className="mt-2 space-y-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs text-zinc-500">{currentMeta?.when}</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-white"><input type="checkbox" role="switch" checked={current.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="h-5 w-5 accent-[#da2230]" />Enviar este e-mail</label>
      </div>

      {currentMeta?.delayed && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h4 className="text-sm font-bold text-white">Quando enviar</h4>
          <p className="mt-1 text-xs leading-5 text-zinc-500">O pedido fica reservado por {limits.payWindow} minutos. Este e-mail sai quando o pedido passa do tempo abaixo sem pagamento. Cada pedido recebe uma vez só.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input type="range" min={limits.sendAfterMin} max={limits.sendAfterMax} value={Number.isFinite(current.sendAfterMinutes) ? current.sendAfterMinutes : limits.sendAfterMin} onChange={(e) => update({ sendAfterMinutes: Number(e.target.value) })} aria-label="Minutos sem pagamento até o envio" className="min-w-0 flex-1 accent-[#da2230]" style={{ maxWidth: 360 }} />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="number" min={limits.sendAfterMin} max={limits.sendAfterMax} value={Number.isFinite(current.sendAfterMinutes) ? current.sendAfterMinutes : ""} onChange={(e) => update({ sendAfterMinutes: Number(e.target.value) })} aria-label="Minutos" className="h-11 w-20 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-center text-sm font-bold text-white" />
              minutos sem pagamento
            </label>
          </div>
          {!(Number.isInteger(current.sendAfterMinutes) && (current.sendAfterMinutes as number) >= limits.sendAfterMin && (current.sendAfterMinutes as number) <= limits.sendAfterMax) && <p role="alert" className="mt-2 text-xs font-semibold text-red-300">Use um valor entre {limits.sendAfterMin} e {limits.sendAfterMax} minutos.</p>}
          {selected === "payment_pending_reminder" && <p className="mt-3 text-xs text-zinc-500">Quantos e-mails saíram, quantos clientes voltaram à loja e quantas compras vieram deles: <Link href="/admin#lembretes" className="font-bold text-zinc-200 underline underline-offset-2">veja no Dashboard</Link>.</p>}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-zinc-300">Assunto<input value={current.subject} onChange={(e) => update({ subject: e.target.value })} className={`${field} h-11`} /></label>
        <label className="block text-sm text-zinc-300">Título na mensagem<input value={current.title} onChange={(e) => update({ title: e.target.value })} className={`${field} h-11`} /></label>
      </div>
      <label className="block text-sm text-zinc-300">Texto (HTML simples: &lt;p&gt;, &lt;strong&gt;, &lt;a&gt;, &lt;ul&gt;)
        <textarea value={current.body} onChange={(e) => update({ body: e.target.value })} rows={7} className={`${field} py-2.5 font-mono text-xs leading-5`} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-zinc-300">Texto do botão (vazio = sem botão)<input value={current.buttonLabel} onChange={(e) => update({ buttonLabel: e.target.value })} className={`${field} h-11`} /></label>
        <label className="block text-sm text-zinc-300">Link do botão<input value={current.buttonUrl} onChange={(e) => update({ buttonUrl: e.target.value })} spellCheck={false} className={`${field} h-11 font-mono text-xs`} /></label>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={current.showItems} onChange={(e) => update({ showItems: e.target.checked })} className="h-4 w-4 accent-[#da2230]" />Mostrar os produtos do pedido (foto, nome, quantidade e preço)</label>

      <details className="rounded-xl border border-zinc-800 bg-zinc-950">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-white">Variáveis disponíveis</summary>
        <ul className="grid gap-x-6 gap-y-1.5 border-t border-zinc-800 p-4 text-xs text-zinc-400 sm:grid-cols-2">
          {variables.map(([name, text]) => <li key={name}><code className="font-bold text-zinc-200">{`{{${name}}}`}</code> · {text}</li>)}
        </ul>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => currentMeta && setTemplates((all) => (all ? { ...all, [selected]: { ...currentMeta.defaults } } : all))} className="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200 hover:border-dino-red">Restaurar texto padrão</button>
        <button type="button" onClick={save} disabled={saving || !dirtyKeys.includes(selected)} className="h-10 rounded-xl bg-dino-red px-4 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar este template"}</button>
        {dirtyKeys.includes(selected) && <span className="text-xs text-amber-300">Alterações não salvas</span>}
      </div>

      <div>
        <h4 className="text-sm font-bold text-white">Pré-visualização</h4>
        {preview && <p className="mt-1 text-xs text-zinc-500">Assunto: <strong className="text-zinc-300">{preview.subject}</strong> · dados de exemplo</p>}
        {previewError && <p role="alert" className="mt-2 text-xs font-semibold text-red-300">{previewError}</p>}
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800 bg-[#f1f3f6]">
          {preview ? <iframe title="Pré-visualização do e-mail" sandbox="" srcDoc={preview.html} className="block h-[640px] w-full border-0" /> : <div className="grid h-40 place-items-center text-sm text-zinc-500">Gerando pré-visualização…</div>}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h4 className="text-sm font-bold text-white">Enviar teste deste e-mail</h4>
        <div className="mt-3 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="seu@email.com" type="email" aria-label="E-mail que recebe o teste" className="h-11 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white" />
          <button onClick={sendTest} disabled={!testTo || !configured || dirtyKeys.includes(selected)} className="h-11 whitespace-nowrap rounded-xl border border-zinc-600 px-5 text-sm font-bold text-white hover:border-dino-red disabled:opacity-50">Enviar teste</button>
        </div>
        {dirtyKeys.includes(selected) && <p className="mt-2 text-xs text-zinc-500">Salve o template antes de enviar o teste: ele envia a versão salva.</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {!configured && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          O Resend ainda não está configurado, então os e-mails não são enviados. Configure o remetente e a chave em{" "}
          <Link href="/admin/configuracoes/integracoes/resend" className="font-bold underline underline-offset-2">Integrações → Resend</Link>.
        </p>
      )}
      {configured && recipients === 0 && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          Nenhum e-mail da equipe cadastrado: os avisos para administradores (novo pedido, cancelamento, estorno) não têm para quem ir. Cadastre em{" "}
          <Link href="/admin/configuracoes/integracoes/resend" className="font-bold underline underline-offset-2">Integrações → Resend</Link>.
        </p>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Templates de e-mail</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">Todos usam o visual da DinoBlack (cabeçalho, botões, produtos do pedido e rodapé com contato e redes sociais). Toque em um template para abrir o editor logo abaixo dele.</p>
          </div>
          <div className="flex items-center gap-3">
            {status && <span role="status" className="max-w-xs text-xs text-zinc-400">{status}</span>}
            <button onClick={save} disabled={saving || dirtyKeys.length === 0} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : dirtyKeys.length > 1 ? `Salvar ${dirtyKeys.length} templates` : "Salvar template"}</button>
          </div>
        </div>

        <nav aria-label="Templates de e-mail" className="mt-6 space-y-6">
          {AUDIENCES.map((audience) => (
            <div key={audience}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">{AUDIENCE_LABEL[audience]}</p>
              <ul className="space-y-2">
                {meta.filter((m) => m.audience === audience).map((m) => {
                  const open = selected === m.key;
                  return (
                    <li key={m.key} ref={open ? openRef : undefined}>
                      <button
                        type="button"
                        onClick={() => { setSelected(open ? null : m.key); setPreview(null); setPreviewError(""); }}
                        aria-expanded={open}
                        aria-controls={`editor-${m.key}`}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${open ? "border-dino-red/60 bg-dino-red/10 text-white" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"}`}
                      >
                        <span className="min-w-0 truncate">{m.label}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {dirtyKeys.includes(m.key) && <span title="Alterações não salvas" className="h-2 w-2 rounded-full bg-amber-400" />}
                          <span className={`text-[10px] font-black uppercase ${templates[m.key]?.enabled ? "text-emerald-400" : "text-zinc-500"}`}>{templates[m.key]?.enabled ? "Ativo" : "Off"}</span>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                        </span>
                      </button>
                      {open && editor}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </section>
    </div>
  );
}
