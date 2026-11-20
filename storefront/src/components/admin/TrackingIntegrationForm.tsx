"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RE, TRACKING_EVENTS, type AdsLabelKey, type TrackingSettings } from "@/lib/tracking-config";
import { IntegrationIcon, type IntegrationSlug } from "./IntegrationIcon";

const card = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6";
const field = "mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-dino-red";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-white">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[#da2230]" />
      {label}
    </label>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "off"; children: ReactNode }) {
  const tones = { ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", warn: "border-amber-500/30 bg-amber-500/10 text-amber-400", off: "border-zinc-700 bg-zinc-800/60 text-zinc-400" } as const;
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

function Section({ icon, title, subtitle, badge, children }: { icon: IntegrationSlug; title: string; subtitle: string; badge: ReactNode; children: ReactNode }) {
  return (
    <section id={icon} className={`${card} scroll-mt-28`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <IntegrationIcon slug={icon} />
          <div><h2 className="text-lg font-bold text-white">{title}</h2><p className="mt-1 max-w-2xl text-sm text-zinc-500">{subtitle}</p></div>
        </div>
        {badge}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-blue-200">{children}</p>;
}

const idState = (enabled: boolean, id: string, re: RegExp): ReactNode =>
  !enabled ? <Badge tone="off">Desativado</Badge> : re.test(id) ? <Badge tone="ok">Ativo</Badge> : <Badge tone="warn">ID pendente</Badge>;

export default function TrackingIntegrationForm() {
  const [saved, setSaved] = useState<TrackingSettings | null>(null);
  const [s, setS] = useState<TrackingSettings | null>(null);
  const [capiTokenSet, setCapiTokenSet] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [metaTest, setMetaTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/tracking")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar as integrações.");
        setSaved(body.settings);
        setS(body.settings);
        setCapiTokenSet(Boolean(body.capiTokenSet));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const dirty = useMemo(() => Boolean(saved && s && JSON.stringify(saved) !== JSON.stringify(s)), [saved, s]);

  async function save() {
    if (!s) return;
    setSaving(true);
    setMessage("Salvando…");
    try {
      const res = await fetch("/api/admin/tracking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível salvar.");
      setSaved(body.settings);
      setS(body.settings);
      setMessage("Salvo. As tags já valem para quem abrir o site agora (até 1 minuto de cache).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function testMeta() {
    setTesting(true);
    setMetaTest(null);
    try {
      const res = await fetch("/api/admin/tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test-meta" }) });
      const body = await res.json();
      const r = body.result as { ok: boolean; received?: number; error?: string } | undefined;
      setMetaTest(r?.ok ? { ok: true, text: `A Meta recebeu o evento de teste (${r.received ?? 1}). Veja em Gerenciador de Eventos → Testar eventos.` } : { ok: false, text: r?.error ?? body.error ?? "Não foi possível enviar o teste." });
    } finally {
      setTesting(false);
    }
  }

  if (loadError) return <div className={`${card} text-sm text-red-300`}>{loadError}</div>;
  if (!s) return <div className={`${card} text-sm text-zinc-400`}>Carregando integrações…</div>;

  const set = (patch: Partial<TrackingSettings>) => setS({ ...s, ...patch });
  const label = (key: AdsLabelKey) => s.googleAds.labels[key];
  const adsLabels: { key: AdsLabelKey; title: string; hint: string }[] = [
    { key: "purchase", title: "Compra concluída (principal)", hint: "A conversão que mede vendas. Enviada com valor e número do pedido." },
    { key: "begin_checkout", title: "Início do checkout (opcional)", hint: "Útil para remarketing de quem não terminou a compra." },
    { key: "add_to_cart", title: "Adicionar ao carrinho (opcional)", hint: "Sinal de interesse para campanhas de Performance Max." },
  ];

  return (
    <div className="space-y-6">
      <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 className="text-lg font-bold text-white">Medição e conversões</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">Ative só o que você usa. Cada serviço recebe os eventos da loja (produto visto, carrinho, checkout e compra) sem precisar mexer no código. Os IDs são públicos, não há segredos nesta tela.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span role="status" className="text-xs text-zinc-400">{message}</span>}
          <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Salvar integrações"}</button>
        </div>
      </section>

      <Section icon="googleanalytics" title="Google Analytics 4" subtitle="Comportamento dos visitantes, funil e receita no GA4." badge={idState(s.ga4.enabled, s.ga4.measurementId, RE.ga4)}>
        <Switch checked={s.ga4.enabled} onChange={(v) => set({ ga4: { ...s.ga4, enabled: v } })} label="Enviar eventos ao Google Analytics" />
        <label className="block text-sm text-zinc-300">ID de métricas
          <input value={s.ga4.measurementId} onChange={(e) => set({ ga4: { ...s.ga4, measurementId: e.target.value.toUpperCase() } })} placeholder="G-XXXXXXXXXX" spellCheck={false} className={field} />
        </label>
        <Hint>No GA4: Administrador → Fluxos de dados → Web → copie o <strong>ID da métrica</strong> (começa com G-). Para conferir, abra o site e veja em Admin → DebugView.</Hint>
      </Section>

      <Section icon="googleads" title="Google Ads (conversões)" subtitle="Mede vendas e ações das campanhas direto pelo site, sem Google Tag Manager." badge={idState(s.googleAds.enabled, s.googleAds.conversionId, RE.adsId)}>
        <Switch checked={s.googleAds.enabled} onChange={(v) => set({ googleAds: { ...s.googleAds, enabled: v } })} label="Enviar conversões ao Google Ads" />
        <label className="block text-sm text-zinc-300">ID de conversão
          <input value={s.googleAds.conversionId} onChange={(e) => set({ googleAds: { ...s.googleAds, conversionId: e.target.value.toUpperCase() } })} placeholder="AW-123456789" spellCheck={false} className={field} />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          {adsLabels.map((l) => (
            <label key={l.key} className="block text-sm text-zinc-300">{l.title}
              <input value={label(l.key)} onChange={(e) => set({ googleAds: { ...s.googleAds, labels: { ...s.googleAds.labels, [l.key]: e.target.value.trim() } } })} placeholder="Rótulo da conversão" spellCheck={false} className={field} />
              <span className="mt-1.5 block text-xs text-zinc-500">{l.hint}</span>
            </label>
          ))}
        </div>
        <Switch checked={s.googleAds.enhancedConversions} onChange={(v) => set({ googleAds: { ...s.googleAds, enhancedConversions: v } })} label="Conversões otimizadas (e-mail do comprador em hash)" />
        <Hint>
          Sim, dá para configurar pelo site. Crie a ação de conversão em Google Ads → Metas → Conversões → Nova ação → Site → <strong>Inserir conversões manualmente</strong> e copie o ID (AW-…) e o rótulo do “snippet de evento”. A loja envia{" "}
          <code>{`gtag('event','conversion',{send_to:'AW-ID/RÓTULO', value, currency:'BRL', transaction_id})`}</code>; o número do pedido evita contar a mesma compra duas vezes. Nas conversões otimizadas, só o e-mail em SHA-256 é enviado, nunca em texto puro; ative também a opção no Google Ads.
        </Hint>
      </Section>

      <Section icon="meta" title="Meta (Pixel e API de Conversões)" subtitle="Anúncios no Facebook e Instagram: eventos pelo navegador e a compra confirmada pelo servidor." badge={idState(s.meta.enabled, s.meta.pixelId, RE.pixel)}>
        <Switch checked={s.meta.enabled} onChange={(v) => set({ meta: { ...s.meta, enabled: v } })} label="Ativar o Pixel da Meta" />
        <label className="block text-sm text-zinc-300">ID do Pixel (conjunto de dados)
          <input value={s.meta.pixelId} onChange={(e) => set({ meta: { ...s.meta, pixelId: e.target.value.replace(/\D/g, "") } })} placeholder="123456789012345" inputMode="numeric" className={field} />
        </label>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Switch checked={s.meta.capi} onChange={(v) => set({ meta: { ...s.meta, capi: v } })} label="API de Conversões (compra enviada pelo servidor)" />
            <Badge tone={capiTokenSet ? "ok" : "warn"}>{capiTokenSet ? "Token definido" : "Token pendente"}</Badge>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Recupera compras que o navegador perde (bloqueadores, app aberto no Instagram). O token fica só na variável <code>META_CAPI_ACCESS_TOKEN</code> da Vercel. Pixel e servidor usam o número do pedido como identificador, então a Meta conta a compra uma única vez. Só envia em modo de produção, com e-mail e telefone em hash.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block text-sm text-zinc-300">Código de teste (opcional)
              <input value={s.meta.testEventCode} onChange={(e) => set({ meta: { ...s.meta, testEventCode: e.target.value.toUpperCase() } })} placeholder="TEST12345" spellCheck={false} className={field} />
            </label>
            <button type="button" onClick={testMeta} disabled={testing || dirty || !capiTokenSet || !s.meta.pixelId || !s.meta.testEventCode} className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-bold text-white transition hover:border-dino-red disabled:opacity-50">{testing ? "Enviando…" : "Enviar evento de teste"}</button>
          </div>
          {dirty && <p className="mt-2 text-xs text-zinc-500">Salve as alterações antes de enviar o teste.</p>}
          {metaTest && <p role="status" className={`mt-3 text-xs font-semibold ${metaTest.ok ? "text-emerald-400" : "text-red-300"}`}>{metaTest.text}</p>}
        </div>
        <Hint>No Gerenciador de Eventos da Meta: Fontes de dados → seu Pixel → copie o ID. Para o token, em Configurações → API de Conversões → Gerar token de acesso. O código de teste fica em Testar eventos.</Hint>
      </Section>

      <Section icon="clarity" title="Microsoft Clarity" subtitle="Gravações de sessão e mapas de calor para ver onde o cliente trava." badge={idState(s.clarity.enabled, s.clarity.projectId, RE.clarity)}>
        <Switch checked={s.clarity.enabled} onChange={(v) => set({ clarity: { ...s.clarity, enabled: v } })} label="Ativar o Clarity" />
        <label className="block text-sm text-zinc-300">ID do projeto
          <input value={s.clarity.projectId} onChange={(e) => set({ clarity: { ...s.clarity, projectId: e.target.value.trim() } })} placeholder="abc1defg2h" spellCheck={false} className={field} />
        </label>
        <Hint>No Clarity: Configurações → Visão geral → <strong>ID do projeto</strong>. Os eventos da loja (carrinho, checkout, compra) aparecem como eventos personalizados para filtrar as gravações. Se “Clarify” era outra ferramenta, avise.</Hint>
      </Section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Eventos enviados</h2>
        <p className="mt-1 text-sm text-zinc-500">Desligue um evento para ele deixar de ir a todas as integrações ativas.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2">Enviar</th><th className="px-3 py-2">Evento da loja</th><th className="px-3 py-2">GA4</th><th className="px-3 py-2">Meta</th><th className="px-3 py-2">Google Ads</th></tr></thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
              {TRACKING_EVENTS.map((e) => (
                <tr key={e.key}>
                  <td className="px-3 py-2"><input type="checkbox" aria-label={`Enviar ${e.label}`} checked={s.events[e.key]} onChange={(ev) => set({ events: { ...s.events, [e.key]: ev.target.checked } })} className="h-4 w-4 accent-[#da2230]" /></td>
                  <td className="px-3 py-2 font-semibold text-white">{e.label}</td>
                  <td className="px-3 py-2 font-mono">{e.ga4}</td>
                  <td className="px-3 py-2 font-mono">{e.meta}</td>
                  <td className="px-3 py-2">{e.ads ? "Conversão (com rótulo)" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Privacidade (LGPD)</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-400">
          <li>Quem usa “Não rastrear” no navegador não envia nada a essas ferramentas. O painel admin nunca é medido.</li>
          <li>Compras em modo de demonstração (Mercado Pago simulado) não geram conversão.</li>
          <li>E-mail e telefone só saem em hash (SHA-256), e apenas na compra, para Meta e Google Ads.</li>
          <li>Antes de ativar anúncios, publique a política de privacidade citando essas ferramentas e avalie um aviso de cookies com consentimento.</li>
        </ul>
      </section>
    </div>
  );
}
