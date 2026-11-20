"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StoreEvent } from "@/lib/store-events";

type Endpoint = { id: string; name: string; url: string; events: StoreEvent[]; active: boolean; includeCustomer: boolean; secretHint?: string };
type EventRow = { key: StoreEvent; label: string; description: string; core?: boolean };
type Delivery = { id: string; event: string; endpoint: string; order: string | null; status: string; attempts: number; httpStatus: number | null; error: string | null; at: string };
type View = {
  pendingAfterMinutes: number;
  endpoints: Endpoint[];
  deliveries: Delivery[];
  events: EventRow[];
  limits: { pendingMin: number; pendingMax: number; payWindow: number };
  cron: { urls: string[]; secretSet: boolean };
  allowLocal: boolean;
};

const card = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6";
const input = "mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const blank = (): Endpoint => ({ id: "", name: "", url: "", events: ["order.created", "order.pending", "order.cancelled", "order.refunded"], active: true, includeCustomer: true });

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "off"; children: ReactNode }) {
  const tones = { ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", warn: "border-amber-500/30 bg-amber-500/10 text-amber-400", bad: "border-red-500/30 bg-red-500/10 text-red-400", off: "border-zinc-700 bg-zinc-800/60 text-zinc-400" } as const;
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export default function WebhooksManager() {
  const [view, setView] = useState<View | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [minutes, setMinutes] = useState(15);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");

  const apply = useCallback((v: View) => {
    setView(v);
    setEndpoints(v.endpoints);
    setMinutes(v.pendingAfterMinutes);
  }, []);

  useEffect(() => {
    fetch("/api/admin/webhooks")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar os webhooks.");
        apply(body);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [apply]);

  const dirty = useMemo(() => Boolean(view && (minutes !== view.pendingAfterMinutes || JSON.stringify(endpoints.map(({ secretHint, ...e }) => e)) !== JSON.stringify(view.endpoints.map(({ secretHint, ...e }) => e)))), [view, minutes, endpoints]);

  async function save() {
    setSaving(true);
    setMessage("Salvando…");
    try {
      const res = await fetch("/api/admin/webhooks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoints, pendingAfterMinutes: minutes }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível salvar.");
      apply(body);
      setSecrets((s) => ({ ...s, ...body.newSecrets }));
      setEditing(null);
      setMessage("Webhooks salvos.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const [tests, setTests] = useState<Record<number, { ok: boolean; text: string }>>({});

  /** Testa o destino com o que está no formulário (salvo ou novo), mostrando o resultado ao lado do botão. */
  async function testEndpoint(i: number) {
    const e = endpoints[i];
    setBusy(`test:${i}`);
    setTests((t) => { const { [i]: _drop, ...rest } = t; return rest; });
    try {
      const res = await fetch("/api/admin/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", id: e.id, url: e.url, includeCustomer: e.includeCustomer }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível testar.");
      if (body.deliveries) setView((v) => (v ? { ...v, deliveries: body.deliveries } : v));
      const r = body.result as { ok: boolean; message: string; temporarySecret?: boolean };
      setTests((t) => ({ ...t, [i]: { ok: r.ok, text: r.ok ? `Funcionou: ${r.message}${r.temporarySecret ? " (assinado com um segredo provisório; o definitivo é gerado ao salvar)" : ""}` : `Falhou: ${r.message}` } }));
    } catch (err) {
      setTests((t) => ({ ...t, [i]: { ok: false, text: err instanceof Error ? err.message : "Não foi possível testar." } }));
    } finally {
      setBusy("");
    }
  }

  async function act(action: "regenerate" | "scan", id = "") {
    setBusy(`${action}:${id}`);
    setMessage("");
    try {
      const res = await fetch("/api/admin/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível concluir.");
      if (body.deliveries) setView((v) => (v ? { ...v, deliveries: body.deliveries } : v));
      if (action === "regenerate") setSecrets((s) => ({ ...s, [id]: body.secret }));
      if (action === "scan") setMessage(`Verificação feita: ${body.pending.notified} pedido(s) avisado(s) de ${body.pending.checked} pendente(s) além de ${body.pending.minutes} min; ${body.retried} reenvio(s).`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy("");
    }
  }

  const patch = (i: number, p: Partial<Endpoint>) => setEndpoints((list) => list.map((e, n) => (n === i ? { ...e, ...p } : e)));

  if (loadError) return <div className={`${card} text-sm text-red-300`}>{loadError}</div>;
  if (!view) return <div className={`${card} text-sm text-zinc-400`}>Carregando webhooks…</div>;
  const { limits } = view;
  const minutesOk = Number.isInteger(minutes) && minutes >= limits.pendingMin && minutes <= limits.pendingMax;

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Webhooks da loja</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">A loja avisa seus sistemas (ERP, WhatsApp, planilhas, n8n, Zapier) quando algo acontece com um pedido: novo pedido, pagamento pendente, cancelado e estornado. Cada envio é assinado e fica registrado.</p>
          </div>
          <div className="flex items-center gap-3">
            {message && <span role="status" className="max-w-xs text-xs text-zinc-400">{message}</span>}
            <button type="button" onClick={save} disabled={saving || !dirty || !minutesOk} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar webhooks"}</button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="text-sm font-bold text-white">Aviso de pagamento pendente</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">O pedido fica reservado por {limits.payWindow} minutos. Defina depois de quantos minutos sem pagamento a loja dispara o aviso (e-mail de lembrete ao cliente, e-mail à equipe e o webhook “Pagamento pendente”). Cada pedido é avisado uma vez só.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input type="range" min={limits.pendingMin} max={limits.pendingMax} value={Number.isFinite(minutes) ? minutes : limits.pendingMin} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Minutos sem pagamento até o aviso" className="min-w-0 flex-1 accent-[#da2230]" style={{ maxWidth: 360 }} />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="number" min={limits.pendingMin} max={limits.pendingMax} value={Number.isFinite(minutes) ? minutes : ""} onChange={(e) => setMinutes(Number(e.target.value))} className="h-11 w-20 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-center text-sm font-bold text-white" aria-label="Minutos" />
              minutos
            </label>
          </div>
          {!minutesOk && <p role="alert" className="mt-2 text-xs font-semibold text-red-300">Use um valor entre {limits.pendingMin} e {limits.pendingMax} minutos.</p>}
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Destinos</h2>
          <button type="button" onClick={() => { setEndpoints((l) => [...l, blank()]); setEditing(endpoints.length); }} disabled={endpoints.length >= 10} className="h-10 rounded-xl border border-zinc-600 px-4 text-sm font-bold text-white transition hover:border-dino-red disabled:opacity-50">Adicionar destino</button>
        </div>
        {endpoints.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">Nenhum destino ainda. Adicione o endereço que vai receber os avisos.</p>}
        <div className="mt-4 space-y-4">
          {endpoints.map((e, i) => {
            const open = editing === i;
            const secret = secrets[e.id];
            return (
              <div key={e.id || `novo-${i}`} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{e.name || "Novo destino"}</h3><Badge tone={e.active ? "ok" : "off"}>{e.active ? "Ativo" : "Pausado"}</Badge>{!e.id && <Badge tone="warn">Não salvo</Badge>}</div>
                    <p className="mt-1 break-all font-mono text-xs text-zinc-500">{e.url || "—"}</p>
                    <p className="mt-2 flex flex-wrap gap-1.5">{e.events.map((ev) => <span key={ev} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">{view.events.find((x) => x.key === ev)?.label ?? ev}</span>)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <button type="button" onClick={() => setEditing(open ? null : i)} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:border-dino-red">{open ? "Fechar" : "Editar"}</button>
                    <button type="button" onClick={() => void testEndpoint(i)} disabled={!e.url || busy === `test:${i}`} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:border-dino-red disabled:opacity-50">{busy === `test:${i}` ? "Enviando…" : "Enviar teste"}</button>
                    <button type="button" onClick={() => { setEndpoints((l) => l.filter((_, n) => n !== i)); setEditing(null); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-red-300 hover:border-red-500/60">Remover</button>
                  </div>
                </div>

                {tests[i] && <p role="status" className={`mt-3 rounded-xl border p-3 text-xs font-semibold ${tests[i].ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{tests[i].text}</p>}

                {secret && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-bold text-amber-300">Segredo de assinatura (aparece só agora, copie e guarde)</p>
                    <div className="mt-2 flex gap-2"><input readOnly value={secret} onFocus={(ev) => ev.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-amber-500/30 bg-zinc-950 px-3 font-mono text-xs text-white" /><button type="button" onClick={() => void navigator.clipboard?.writeText(secret)} className="rounded-lg border border-amber-500/40 px-3 text-xs font-bold text-amber-200">Copiar</button></div>
                  </div>
                )}

                {open && (
                  <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-zinc-300">Nome<input value={e.name} onChange={(ev) => patch(i, { name: ev.target.value })} placeholder="Ex.: ERP, n8n, Planilha" className={input} /></label>
                      <div className="block text-sm text-zinc-300"><label htmlFor={`wh-url-${i}`}>Endereço (URL)</label>
                        <div className="mt-2 flex gap-2"><input id={`wh-url-${i}`} value={e.url} onChange={(ev) => patch(i, { url: ev.target.value.trim() })} placeholder="https://seu-servidor.com/webhooks/dinoblack" inputMode="url" spellCheck={false} className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono text-sm text-white outline-none focus:border-dino-red" />
                          <button type="button" onClick={() => void testEndpoint(i)} disabled={!e.url || busy === `test:${i}`} className="h-11 shrink-0 whitespace-nowrap rounded-xl border border-zinc-600 px-4 text-sm font-bold text-white hover:border-dino-red disabled:opacity-50">{busy === `test:${i}` ? "Enviando…" : "Testar webhook"}</button></div>
                        <p className="mt-1.5 text-xs text-zinc-500">Envia um pedido de exemplo agora, sem precisar salvar antes.</p></div>
                    </div>
                    <fieldset>
                      <legend className="text-sm font-bold text-white">Eventos que este destino recebe</legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {view.events.map((ev) => (
                          <label key={ev.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${e.events.includes(ev.key) ? "border-dino-red/60 bg-dino-red/5" : "border-zinc-800"}`}>
                            <input type="checkbox" checked={e.events.includes(ev.key)} onChange={(c) => patch(i, { events: c.target.checked ? [...e.events, ev.key] : e.events.filter((x) => x !== ev.key) })} className="mt-1 h-4 w-4 accent-[#da2230]" />
                            <span><span className="block font-bold text-white">{ev.label}{ev.core && <span className="ml-2 text-[10px] font-black uppercase text-dino-red">principal</span>}</span><span className="block text-xs text-zinc-500">{ev.description}</span></span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="flex flex-wrap gap-6 text-sm text-zinc-300">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={e.active} onChange={(c) => patch(i, { active: c.target.checked })} className="h-4 w-4 accent-[#da2230]" /> Destino ativo</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={e.includeCustomer} onChange={(c) => patch(i, { includeCustomer: c.target.checked })} className="h-4 w-4 accent-[#da2230]" /> Enviar nome, e-mail e telefone do cliente</label>
                    </div>
                    {e.id && (
                      <p className="text-xs text-zinc-500">Segredo atual: <code>{e.secretHint}</code>{" "}
                        <button type="button" onClick={() => { if (window.confirm("Gerar um novo segredo? O antigo para de valer na hora e o destino precisa ser atualizado.")) void act("regenerate", e.id); }} className="font-bold text-zinc-300 underline underline-offset-2 hover:text-white">Gerar novo segredo</button></p>
                    )}
                    {!view.allowLocal && <p className="text-xs text-zinc-500">O endereço precisa ser https:// público. Endereços internos e localhost não são aceitos.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-white">Entregas recentes</h2><p className="mt-1 text-sm text-zinc-500">Falhas são reenviadas até 5 vezes, com espera crescente, em até 24 horas.</p></div>
          <button type="button" onClick={() => void act("scan")} disabled={busy === "scan:"} className="h-10 rounded-xl border border-zinc-600 px-4 text-sm font-bold text-white transition hover:border-dino-red disabled:opacity-50">{busy === "scan:" ? "Verificando…" : "Verificar pendentes e reenviar falhas"}</button>
        </div>
        {view.deliveries.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500">Nenhuma entrega ainda. Use “Enviar teste” em um destino para ver o primeiro registro.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2">Quando</th><th className="px-3 py-2">Evento</th><th className="px-3 py-2">Destino</th><th className="px-3 py-2">Pedido</th><th className="px-3 py-2">Resultado</th></tr></thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
                {view.deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-3 py-2">{when(d.at)}</td>
                    <td className="px-3 py-2 font-mono">{d.event}</td>
                    <td className="px-3 py-2">{d.endpoint}</td>
                    <td className="px-3 py-2 font-mono">{d.order ?? "—"}</td>
                    <td className="px-3 py-2"><Badge tone={d.status === "processed" ? "ok" : d.status === "failed" ? (d.attempts >= 5 ? "bad" : "warn") : "off"}>{d.status === "processed" ? `Entregue${d.httpStatus ? ` (${d.httpStatus})` : ""}` : d.attempts >= 5 ? "Desistiu" : `Falhou · tentativa ${d.attempts}`}</Badge>{d.error && d.status !== "processed" && <span className="ml-2 text-red-300">{d.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Agendador (para o aviso de pendente)</h2>
        <p className="mt-1 text-sm text-zinc-500">O aviso por tempo precisa de alguém que “bata” na loja a cada poucos minutos. Configure qualquer agendador (cron-job.org, Supabase pg_cron, GitHub Actions) para chamar o endereço abaixo a cada 1 a 5 minutos.</p>
        <div className="mt-4 grid gap-3">
          {view.cron.urls.map((u) => <input key={u} readOnly value={u} onFocus={(ev) => ev.currentTarget.select()} aria-label="Endereço do agendador" className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono text-xs text-white" />)}
          <p className="text-xs leading-5 text-zinc-500">Envie o cabeçalho <code>Authorization: Bearer SEU_CRON_SECRET</code>. A variável <code>CRON_SECRET</code> está <Badge tone={view.cron.secretSet ? "ok" : "warn"}>{view.cron.secretSet ? "definida" : "pendente"}</Badge> neste ambiente. A rotina <code>/api/cron/expire-orders</code>, se já agendada, também faz esta verificação.</p>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Agendar pelo Supabase (pg_cron)</h2>
        <p className="mt-1 text-sm text-zinc-500">Rode no SQL Editor do Supabase. O passo 1 funciona já; o passo 2 só depois que esta versão da loja estiver publicada e o <code>CRON_SECRET</code> da Vercel for o mesmo guardado no Vault.</p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-zinc-300">{`-- 1) Vence pedidos sem pagamento (regra de 30 min), a cada 5 min. Funciona sem publicar nada.
create extension if not exists pg_cron;
select cron.schedule('dino-expirar-pedidos-pendentes', '*/5 * * * *',
  $$select public.expire_pending_orders(30)$$);

-- 2) Chama a loja a cada minuto: aviso de pagamento pendente + reenvio de webhooks que falharam.
create extension if not exists pg_net;
select vault.create_secret('COLE_AQUI_O_CRON_SECRET', 'dino_cron_secret');
select cron.schedule('dino-avisos-e-webhooks', '* * * * *', $$
  select net.http_get(
    url := '${view.cron.urls[0] ?? "https://SEU-DOMINIO/api/cron/webhooks"}',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'dino_cron_secret')))
$$);

-- Conferir: select jobname, schedule, active from cron.job;
-- Pausar:   select cron.unschedule('dino-avisos-e-webhooks');`}</pre>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Como receber e conferir</h2>
        <p className="mt-1 text-sm text-zinc-500">Cada chamada é um <code>POST</code> JSON com os cabeçalhos <code>X-DinoBlack-Event</code>, <code>X-DinoBlack-Delivery</code>, <code>X-DinoBlack-Timestamp</code> e <code>X-DinoBlack-Signature</code> (<code>sha256=…</code>). Responda qualquer 2xx em até 8 segundos.</p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-zinc-300">{`// Node.js: confira a assinatura antes de confiar no corpo
const expected = crypto.createHmac("sha256", SEGREDO)
  .update(timestamp + "." + corpoBrutoDaRequisicao).digest("hex");
const ok = signature === "sha256=" + expected;   // compare com timingSafeEqual

// Corpo
{ "id": "evt_…", "type": "order.created", "created_at": "2026-11-23T12:00:00Z",
  "data": { "order": { "number": "DB-1234", "status": "pending_payment", "total": 149.99,
    "items": [{ "slug": "…", "name": "…", "quantity": 1, "unit_price": 149.99 }],
    "customer": { "name": "…", "email": "…", "phone": "…" } } } }`}</pre>
      </section>
    </div>
  );
}
