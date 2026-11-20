"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MP_DESCRIPTOR_MAX, MP_MAX_INSTALLMENTS, normalizeDescriptor, type MpSettings } from "@/lib/mp-config";
import { brl } from "@/lib/checkout-types";
import { AdminSelect } from "./AdminSelect";

type CredentialKind = "test" | "app_usr" | "unknown";
type Payload = {
  settings: MpSettings;
  credentials: {
    mode: "simulated" | "live";
    accessToken: { set: boolean; kind: CredentialKind };
    publicKey: { set: boolean; kind: CredentialKind; hint: string };
    webhookSecret: { set: boolean };
    siteUrl: { value: string; https: boolean };
    database: boolean;
  };
  webhook: { url: string; topic: string; secretSet: boolean; public: boolean };
  dashboard: null | {
    stats: { method: string; status: string; n: number; total: number }[];
    events: { id: string; eventType: string; status: string; error: string | null; receivedAt: string; order: string | null }[];
    lastReceivedAt: string | null;
    pendingAlerts: number;
  };
};
type Brand = { id: string; name: string; type: "credit_card" | "debit_card" | "pix"; thumbnail: string | null };
type Connection = { state: "connected" | "missing" | "invalid" | "unreachable"; message: string; checkedAt: string; account?: { id: string; nickname: string; siteId: string }; brands: Brand[]; brandsFromReference: boolean };

const card = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6";
const input = "mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-dino-red";
const METHOD_LABEL: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito" };
const KIND_LABEL: Record<CredentialKind, string> = { test: "Credencial de teste (TEST-)", app_usr: "Credencial APP_USR (produção ou usuário de teste)", unknown: "Formato desconhecido" };

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "info"; children: ReactNode }) {
  const tones = { ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", warn: "border-amber-500/30 bg-amber-500/10 text-amber-400", bad: "border-red-500/30 bg-red-500/10 text-red-400", info: "border-sky-500/30 bg-sky-500/10 text-sky-300" } as const;
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${checked ? "border-dino-red/60 bg-dino-red/5" : "border-zinc-800 bg-zinc-950"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[#da2230]" />
      <span><span className="block font-bold text-white">{label}</span><span className="mt-0.5 block text-xs text-zinc-500">{hint}</span></span>
    </label>
  );
}

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function MercadoPagoIntegrationForm() {
  const [data, setData] = useState<Payload | null>(null);
  const [settings, setSettings] = useState<MpSettings | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [webhookTest, setWebhookTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/mercadopago", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check" }) });
      const body = await res.json();
      if (res.ok) setConnection(body.connection);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/mercadopago")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar a integração.");
        setData(body);
        setSettings(body.settings);
        void check();
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [check]);

  const dirty = useMemo(() => Boolean(data && settings && JSON.stringify(data.settings) !== JSON.stringify(settings)), [data, settings]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage("Salvando…");
    try {
      const res = await fetch("/api/admin/mercadopago", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível salvar.");
      setData((current) => (current ? { ...current, settings: body.settings } : current));
      setSettings(body.settings);
      setMessage("Configurações salvas. O checkout já usa os novos valores.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function runWebhookTest() {
    setTesting(true);
    setWebhookTest(null);
    try {
      const res = await fetch("/api/admin/mercadopago", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test-webhook" }) });
      const body = await res.json();
      setWebhookTest(res.ok ? body.result : { ok: false, message: body.error ?? "Não foi possível testar." });
    } finally {
      setTesting(false);
    }
  }

  async function copyUrl() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.webhook.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão: o campo continua selecionável
    }
  }

  const performance = useMemo(() => {
    const rows = data?.dashboard?.stats ?? [];
    const by = (method: string) => {
      const mine = rows.filter((r) => r.method === method);
      const sum = (statuses: string[], key: "n" | "total") => mine.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r[key], 0);
      const paid = sum(["paid"], "n");
      const failed = sum(["failed", "expired"], "n");
      return { method, paid, pending: sum(["pending", "authorized"], "n"), failed, refunded: sum(["refunded"], "n"), volume: sum(["paid"], "total"), rate: paid + failed > 0 ? paid / (paid + failed) : null };
    };
    const list = ["pix", "credit_card", "debit_card"].map(by);
    return { list, paid: list.reduce((s, m) => s + m.paid, 0), failed: list.reduce((s, m) => s + m.failed, 0), pending: list.reduce((s, m) => s + m.pending, 0), volume: list.reduce((s, m) => s + m.volume, 0) };
  }, [data]);

  if (loadError) return <div className={`${card} text-sm text-red-300`}>{loadError}</div>;
  if (!data || !settings) return <div className={`${card} text-sm text-zinc-400`}>Carregando integração…</div>;

  const { credentials: cred, webhook } = data;
  const connState = checking && !connection ? "checking" : connection?.state ?? "checking";
  const connBadge =
    connState === "connected" ? <Badge tone="ok">Conectado</Badge>
    : connState === "checking" ? <Badge tone="info">Verificando…</Badge>
    : connState === "missing" ? <Badge tone="warn">Credenciais pendentes</Badge>
    : <Badge tone="bad">{connState === "invalid" ? "Token recusado" : "Sem resposta"}</Badge>;
  const approvalRate = performance.paid + performance.failed > 0 ? performance.paid / (performance.paid + performance.failed) : null;

  const checklist: { ok: boolean; label: string; hint: string }[] = [
    { ok: cred.accessToken.set, label: "Access Token definido", hint: "Variável MP_ACCESS_TOKEN na Vercel." },
    { ok: cred.publicKey.set, label: "Chave pública definida", hint: "Variável NEXT_PUBLIC_MP_PUBLIC_KEY." },
    { ok: connection?.state === "connected", label: "Conta verificada na API", hint: "Use “Verificar conexão” acima." },
    { ok: cred.webhookSecret.set, label: "Segredo do webhook definido", hint: "Variável MP_WEBHOOK_SECRET (chave secreta do painel do Mercado Pago)." },
    { ok: cred.siteUrl.https, label: "Site com HTTPS", hint: "NEXT_PUBLIC_SITE_URL começando com https://; sem isso o Mercado Pago não avisa os pagamentos." },
    { ok: cred.database, label: "Banco de dados conectado", hint: "DATABASE_URL; sem ele o pedido não é gravado." },
    { ok: Boolean(data.dashboard?.lastReceivedAt), label: "Notificação recebida", hint: "Aparece depois do primeiro pagamento de teste ou real." },
    { ok: cred.mode === "live", label: "Modo de produção ativo", hint: "MP_MODE=live. Em “simulado”, ninguém é cobrado de verdade." },
  ];
  const brandGroups: [string, Brand[]][] = [
    ["Cartão de crédito", (connection?.brands ?? []).filter((b) => b.type === "credit_card")],
    ["Cartão de débito", (connection?.brands ?? []).filter((b) => b.type === "debit_card")],
    ["Pix", (connection?.brands ?? []).filter((b) => b.type === "pix")],
  ];

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-white">Status da conexão</h2>
              {connBadge}
              {cred.mode === "live" ? <Badge tone="ok">Produção</Badge> : <Badge tone="warn">Modo simulado</Badge>}
            </div>
            <p className="mt-1 text-sm text-zinc-500" role="status">
              {connection ? connection.message : "Conferindo a conta no Mercado Pago…"}
              {connection ? ` Última verificação: ${when(connection.checkedAt)}.` : ""}
            </p>
          </div>
          <button type="button" onClick={() => void check()} disabled={checking} className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-bold text-white transition hover:border-dino-red disabled:opacity-50">
            {checking ? "Verificando…" : "Verificar conexão"}
          </button>
        </div>
        {connection?.account && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[["Conta (ID)", connection.account.id], ["Apelido", connection.account.nickname], ["País / site", connection.account.siteId]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><dt className="text-xs text-zinc-500">{k}</dt><dd className="mt-1 font-mono text-sm font-bold text-white">{v}</dd></div>
            ))}
          </dl>
        )}
        {cred.mode === "simulated" && (
          <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">O checkout está em <strong>modo simulado</strong> (<code>MP_MODE</code>): cartão aprova e Pix fica pendente, sem cobrança real. Mude para <code>live</code> só depois de testar com a conta de teste do Mercado Pago.</p>
        )}
        {data.dashboard && data.dashboard.pendingAlerts > 0 && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-5 text-red-200">{data.dashboard.pendingAlerts} alerta(s) de pagamento sem leitura (valor divergente, estorno ou pagamento em pedido cancelado). Confira nas notificações do painel.</p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Credenciais do ambiente</h2>
        <p className="mt-1 text-sm text-zinc-500">As chaves ficam nas variáveis de ambiente da Vercel e nunca são salvas no banco nem exibidas aqui. Pegue-as em Mercado Pago → Suas integrações → Credenciais.</p>
        <ul className="mt-5 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
          {[
            { name: "MP_ACCESS_TOKEN", set: cred.accessToken.set, detail: cred.accessToken.set ? KIND_LABEL[cred.accessToken.kind] : "Chave privada: cria e consulta pagamentos no servidor." },
            { name: "NEXT_PUBLIC_MP_PUBLIC_KEY", set: cred.publicKey.set, detail: cred.publicKey.set ? `${cred.publicKey.hint} · ${KIND_LABEL[cred.publicKey.kind]}` : "Chave pública: usada no navegador pelo formulário de pagamento." },
            { name: "MP_WEBHOOK_SECRET", set: cred.webhookSecret.set, detail: "Chave secreta do webhook: valida que a notificação veio mesmo do Mercado Pago." },
            { name: "NEXT_PUBLIC_SITE_URL", set: cred.siteUrl.https, detail: cred.siteUrl.value ? cred.siteUrl.value : "Endereço público do site, com https://.", off: cred.siteUrl.value ? "Sem HTTPS" : undefined },
            { name: "MP_MODE", set: cred.mode === "live", detail: cred.mode === "live" ? "live (cobranças reais)" : "simulated (sem cobrança)", on: "Produção", off: "Simulado" },
          ].map((row: { name: string; set: boolean; detail: string; on?: string; off?: string }) => (
            <li key={row.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><code className="text-sm font-bold text-white">{row.name}</code><p className="mt-0.5 break-words text-xs text-zinc-500">{row.detail}</p></div>
              <Badge tone={row.set ? "ok" : "warn"}>{row.set ? row.on ?? "Definida" : row.off ?? "Pendente"}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Formas de pagamento</h2>
            <p className="mt-1 text-sm text-zinc-500">Escolha o que o cliente vê no checkout. A mudança vale na hora, sem novo deploy.</p>
          </div>
          <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar configurações"}</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Toggle checked={settings.methods.pix} onChange={(v) => setSettings({ ...settings, methods: { ...settings.methods, pix: v } })} label="Pix" hint="Aprovação na hora, QR Code e copia e cola. Vale 30 minutos." />
          <Toggle checked={settings.methods.credit_card} onChange={(v) => setSettings({ ...settings, methods: { ...settings.methods, credit_card: v } })} label="Cartão de crédito" hint="Todas as bandeiras aceitas pela sua conta, com parcelamento." />
          <Toggle checked={settings.methods.debit_card} onChange={(v) => setSettings({ ...settings, methods: { ...settings.methods, debit_card: v } })} label="Cartão de débito" hint="Sempre à vista. Debita na hora, quando o banco autoriza." />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="text-sm text-zinc-300">
            Parcelamento máximo no crédito
            <div className="mt-2">
              <AdminSelect
                value={String(settings.maxInstallments)}
                onValueChange={(v) => setSettings({ ...settings, maxInstallments: Number(v) })}
                aria-label="Parcelamento máximo"
                options={Array.from({ length: MP_MAX_INSTALLMENTS }, (_, i) => ({ value: String(i + 1), label: i === 0 ? "À vista (sem parcelar)" : `Até ${i + 1}x` }))}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Parcelas sem juros dependem do que você configurou na conta do Mercado Pago; o teto aqui nunca é ultrapassado.</p>
          </div>
          <label className="text-sm text-zinc-300">
            Nome na fatura do cartão
            <input value={settings.statementDescriptor} onChange={(e) => setSettings({ ...settings, statementDescriptor: normalizeDescriptor(e.target.value.toUpperCase().replace(/\s{2,}/g, " ")) })} maxLength={MP_DESCRIPTOR_MAX} className={`${input} font-mono uppercase`} aria-describedby="descriptor-hint" />
            <span id="descriptor-hint" className="mt-1.5 block text-xs text-zinc-500">{settings.statementDescriptor.length}/{MP_DESCRIPTOR_MAX} · só letras e números, em maiúsculas. É o que o cliente reconhece na fatura.</span>
          </label>
        </div>
        {message && <p className="mt-4 text-xs text-zinc-400" role="status">{message}</p>}

        <div className="mt-6 border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-bold text-white">Bandeiras e meios aceitos pela sua conta</h3>
          <p className="mt-1 text-xs text-zinc-500">O checkout libera todas as bandeiras que a conta do Mercado Pago aceita; não há como habilitar uma bandeira que a conta não tenha. {connection?.brandsFromReference ? "Lista de referência do Brasil: confirme a conexão acima para ver as bandeiras reais da conta." : "Lista lida da sua conta."}</p>
          <div className="mt-4 space-y-4">
            {brandGroups.map(([title, list]) => list.length > 0 && (
              <div key={title}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">{title}</p>
                <ul className="flex flex-wrap gap-2">
                  {list.map((b) => (
                    <li key={b.id} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-200">
                      {b.thumbnail && /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.thumbnail} alt="" width={20} height={20} className="h-5 w-5 object-contain" />}
                      {b.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Webhook de notificações</h2>
        <p className="mt-1 text-sm text-zinc-500">O Mercado Pago avisa por aqui quando um pagamento muda de status (aprovado, recusado, estornado). Sem ele, o pedido só atualiza quando o cliente reabre a tela de confirmação.</p>

        <div className="mt-5 grid gap-4">
          <label className="text-sm text-zinc-300">
            URL de notificação
            <div className="mt-2 flex gap-2">
              <input readOnly value={webhook.url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-white" />
              <button type="button" onClick={copyUrl} className="shrink-0 rounded-xl border border-zinc-600 px-4 text-sm font-bold text-white hover:border-dino-red">{copied ? "Copiado ✓" : "Copiar"}</button>
            </div>
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-xs text-zinc-500">Evento a assinar</p><p className="mt-1 font-mono text-sm font-bold text-white">Pagamentos ({webhook.topic})</p></div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-xs text-zinc-500">Chave secreta (<code>MP_WEBHOOK_SECRET</code>)</p><p className="mt-1"><Badge tone={webhook.secretSet ? "ok" : "warn"}>{webhook.secretSet ? "Definida" : "Pendente"}</Badge></p></div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-xs text-zinc-500">Última notificação recebida</p><p className="mt-1 text-sm font-bold text-white">{when(data.dashboard?.lastReceivedAt ?? null)}</p></div>
          </div>
          {!webhook.public && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">Este endereço não é público (precisa começar com <code>https://</code>). Defina <code>NEXT_PUBLIC_SITE_URL</code> com o domínio da loja para o Mercado Pago conseguir chamar.</p>}
          <ol className="list-decimal space-y-1 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 pl-8 text-xs leading-5 text-blue-200">
            <li>No painel do Mercado Pago, abra Suas integrações → sua aplicação → Webhooks → Configurar notificações.</li>
            <li>Cole a URL acima (modo de produção e, se for testar, também o de teste) e marque o evento <strong>Pagamentos</strong>.</li>
            <li>Copie a <strong>chave secreta</strong> mostrada ali para a variável <code>MP_WEBHOOK_SECRET</code> na Vercel e faça um novo deploy.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={runWebhookTest} disabled={testing} className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-bold text-white transition hover:border-dino-red disabled:opacity-50">{testing ? "Testando…" : "Testar assinatura do webhook"}</button>
            {webhookTest && <span role="status" className={`text-xs font-semibold ${webhookTest.ok ? "text-emerald-400" : "text-red-300"}`}>{webhookTest.message}</span>}
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-bold text-white">Últimas notificações</h3>
          {data.dashboard && data.dashboard.events.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2">Quando</th><th className="px-3 py-2">Evento</th><th className="px-3 py-2">Pedido</th><th className="px-3 py-2">Resultado</th></tr></thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
                  {data.dashboard.events.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-3 py-2">{when(e.receivedAt)}</td>
                      <td className="px-3 py-2 font-mono">{e.eventType}</td>
                      <td className="px-3 py-2 font-mono">{e.order ?? "—"}</td>
                      <td className="px-3 py-2"><Badge tone={e.status === "processed" ? "ok" : e.status === "failed" ? "bad" : "info"}>{e.status === "processed" ? "Processada" : e.status === "failed" ? "Falhou" : e.status === "ignored" ? "Ignorada" : "Recebida"}</Badge>{e.error && <span className="ml-2 text-red-300">{e.error}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500">Nenhuma notificação ainda. Faça um pagamento de teste para ver o primeiro evento aqui.</p>
          )}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Desempenho dos pagamentos · 30 dias</h2>
        {!data.dashboard ? (
          <p className="mt-3 text-sm text-zinc-500">Sem banco de dados conectado, não há números para mostrar.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[["Aprovados", String(performance.paid)], ["Recusados ou expirados", String(performance.failed)], ["Aguardando", String(performance.pending)], ["Volume aprovado", brl(performance.volume)]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{k}</p><p className="mt-1 font-display text-2xl font-black text-white">{v}</p></div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">Taxa de aprovação: <strong className="text-zinc-300">{approvalRate === null ? "—" : `${Math.round(approvalRate * 100)}%`}</strong> (aprovados ÷ aprovados + recusados; os que aguardam não entram).</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2">Forma</th><th className="px-3 py-2">Aprovados</th><th className="px-3 py-2">Recusados</th><th className="px-3 py-2">Aguardando</th><th className="px-3 py-2">Taxa</th><th className="px-3 py-2">Volume</th></tr></thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
                  {performance.list.map((m) => (
                    <tr key={m.method}><td className="px-3 py-2 font-semibold text-white">{METHOD_LABEL[m.method]}</td><td className="px-3 py-2">{m.paid}</td><td className="px-3 py-2">{m.failed}</td><td className="px-3 py-2">{m.pending}</td><td className="px-3 py-2">{m.rate === null ? "—" : `${Math.round(m.rate * 100)}%`}</td><td className="px-3 py-2 font-mono">{brl(m.volume)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Checklist para vender de verdade</h2>
        <p className="mt-1 text-sm text-zinc-500">{checklist.filter((c) => c.ok).length} de {checklist.length} itens prontos.</p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.label} className={`flex items-start gap-3 rounded-xl border p-3 ${item.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950"}`}>
              <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black ${item.ok ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-300"}`}>{item.ok ? "✓" : "!"}</span>
              <span><span className="block text-sm font-bold text-white">{item.label}<span className="sr-only">{item.ok ? " — pronto" : " — pendente"}</span></span><span className="block text-xs text-zinc-500">{item.hint}</span></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
