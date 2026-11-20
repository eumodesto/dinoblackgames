import Link from "next/link";
import { ArrowUpRight, CircleDollarSign, Gauge, Percent, ShoppingBag, Users, type LucideIcon } from "lucide-react";
import { getFunnel, resolveRange } from "@/lib/server/analytics";
import { getDashboardInsights, MIN_SESSIONS, type Kpi as KpiData } from "@/lib/server/dashboard";
import { FunnelPanel } from "@/components/admin/FunnelPanel";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const nf = new Intl.NumberFormat("pt-BR");
const fmt = (kpi: KpiData, value: number | null) => {
  if (value === null) return "—";
  if (kpi.kind === "money") return formatBRL(value);
  if (kpi.kind === "percent") return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return nf.format(value);
};

/** Variação contra o período anterior de mesma duração. Sem base de comparação, diz isso em vez de inventar um %. */
function delta(kpi: KpiData): { text: string; tone: "up" | "down" | "flat" } {
  const { value, previous } = kpi;
  if (value === null || previous === null) return { text: "sem base para comparar", tone: "flat" };
  if (kpi.kind === "percent") {
    const pp = (value - previous) * 100;
    if (Math.abs(pp) < 0.05) return { text: "igual ao período anterior", tone: "flat" };
    return { text: `${pp > 0 ? "+" : "−"}${Math.abs(pp).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs. anterior`, tone: pp > 0 ? "up" : "down" };
  }
  if (previous === 0) return value === 0 ? { text: "igual ao período anterior", tone: "flat" } : { text: "novo (anterior foi 0)", tone: "up" };
  const change = ((value - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { text: "igual ao período anterior", tone: "flat" };
  return { text: `${change > 0 ? "↑" : "↓"} ${Math.abs(change).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% vs. anterior`, tone: change > 0 ? "up" : "down" };
}

const KPI_META: Record<string, { icon: LucideIcon; href: string; tone?: "featured" }> = {
  "Receita": { icon: CircleDollarSign, href: "/admin/pedidos?status=paid", tone: "featured" },
  "Pedidos pagos": { icon: ShoppingBag, href: "/admin/pedidos?status=paid" },
  "Ticket médio": { icon: Gauge, href: "/admin/pedidos?status=paid" },
  "Sessões": { icon: Users, href: "/admin" },
  "Conversão": { icon: Percent, href: "/admin" },
};

function Kpi({ kpi }: { kpi: KpiData }) {
  const meta = KPI_META[kpi.label];
  const d = delta(kpi);
  const Icon = meta.icon;
  const value = fmt(kpi, kpi.value);
  return (
    <Link href={meta.href} className="gd-metric" data-tone={meta.tone} aria-label={`${kpi.label}: ${value}. ${d.text}`}>
      <div className="gd-metric-head"><span>{kpi.label}</span><span className="gd-metric-icon" aria-hidden="true"><Icon /></span></div>
      <strong className="gd-metric-value">{value}</strong>
      <div className="gd-metric-caption" style={{ color: d.tone === "up" ? "var(--gd-teal)" : d.tone === "down" ? "var(--gd-coral)" : undefined }}>{d.text}</div>
    </Link>
  );
}

// Lê o catálogo do banco em tempo de execução. Sem isto o Next tenta pré-renderizar a página
// durante `next build`, quando não há banco (a Vercel não tem DATABASE_URL no build).
export const dynamic = "force-dynamic";

const INTEGRATIONS: [string, string, "teal" | "ochre"][] = [
  ["Supabase", "Conectado", "teal"],
  ["Mercado Pago", "Configurado", "teal"],
  ["SuperFrete / Melhor Envio", "Configurado", "teal"],
  ["PGlite local", "Ativo (dev)", "teal"],
];

const QUICK = [
  { href: "/admin/produtos", label: "Gerenciar produtos", hint: "Catálogo, preços e estoque" },
  { href: "/admin/pedidos", label: "Ver pedidos", hint: "Pagamentos, envio e status" },
  { href: "/", label: "Abrir loja pública", hint: "Como o cliente vê a loja" },
];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string; dispositivo?: string; origem?: string }> }) {
  const params = await searchParams;
  const range = resolveRange(params);
  const [insights, funnel] = await Promise.all([getDashboardInsights(range), getFunnel(range, { dispositivo: params.dispositivo, origem: params.origem })]);
  const { stock, actions, viewedNotSold } = insights;
  const pending = actions.filter((a) => a.count > 0);
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <header className="gd-view-head">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: "var(--gd-muted)", fontSize: 13, margin: "8px 0 0" }}>Visão geral da loja DinoBlack Games.</p>
        </div>
      </header>

      <div className="gd-metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {insights.kpis.map((kpi) => <Kpi key={kpi.label} kpi={kpi} />)}
      </div>
      <p style={{ margin: "-6px 2px 0", color: "var(--gd-muted)", fontSize: 11 }}>
        {range.label}, comparado com o período imediatamente anterior de mesma duração. Receita conta pedidos pagos no período.
      </p>

      <section className="gd-panel" aria-labelledby="actions-title">
        <header className="gd-panel-head"><div><h2 id="actions-title">Precisa de ação hoje</h2><p>{pending.length > 0 ? `${pending.length} ${pending.length === 1 ? "assunto pede" : "assuntos pedem"} atenção` : "Nada pendente agora"}</p></div></header>
        <div className="gd-quick-list">
          {actions.map((item) => (
            <Link key={item.id} href={item.href} style={{ opacity: item.count === 0 ? 0.55 : 1 }}>
              <div style={{ flex: 1 }}><strong>{item.title}</strong><small>{item.detail}</small></div>
              <span style={{ fontWeight: 800, fontSize: 18, color: item.count === 0 ? "var(--gd-muted)" : item.tone === "danger" ? "var(--gd-coral)" : "var(--gd-ink)" }}>{nf.format(item.count)}</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {insights.smallSample && (
        <p role="note" style={{ margin: 0, padding: "8px 12px", borderRadius: 12, background: "var(--gd-card-light)", color: "var(--gd-muted)", fontSize: 12 }}>
          Poucas visitas no período (menos de {MIN_SESSIONS} sessões). Conversão e funil ainda oscilam muito com cada pessoa; não tire conclusões só daqui.
        </p>
      )}

      <FunnelPanel funnel={funnel} today={today} />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section className="gd-panel">
          <header className="gd-panel-head"><div><h2>Saúde do estoque</h2><p>Produtos publicados</p></div></header>
          <div style={{ display: "grid", gap: 10 }}>
            <Link href="/admin/produtos?status=published" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 650 }}>Visíveis na loja</span><strong>{nf.format(stock.visibleProducts)}</strong>
            </Link>
            <Link href="/admin/produtos?estoque=alerta" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 650 }}>Visíveis sem estoque</span>
              <strong style={{ color: stock.visibleOutOfStock > 0 ? "var(--gd-coral)" : undefined }}>{nf.format(stock.visibleOutOfStock)}</strong>
            </Link>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }} title="Produtos publicados com visibilidade oculta; quase todos estão sem estoque">
              <span style={{ fontWeight: 650 }}>Ocultos da loja</span><strong>{nf.format(stock.hiddenProducts)}</strong>
            </div>
            <small style={{ color: "var(--gd-muted)" }}>{nf.format(stock.hiddenOutOfStock)} dos ocultos estão sem estoque. “Sem estoque” é saldo disponível zerado, não nível mínimo.</small>
          </div>
        </section>

        <section className="gd-panel">
          <header className="gd-panel-head"><div><h2>Visitados e não vendidos</h2><p>{insights.range.label} · revise preço, foto ou descrição</p></div></header>
          {viewedNotSold.length > 0 ? (
            <div className="gd-quick-list">
              {viewedNotSold.map((item) => (
                <Link key={item.slug} href={`/produto/${item.slug}`} target="_blank">
                  <div style={{ flex: 1 }}><strong>{item.name}</strong><small>{nf.format(item.views)} {item.views === 1 ? "visita" : "visitas"}, nenhuma venda</small></div>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--gd-muted)", fontSize: 13 }}>Nenhum produto visitado sem venda neste período.</p>
          )}
        </section>

        <section className="gd-panel">
          <header className="gd-panel-head"><div><h2>Ações rápidas</h2><p>Atalhos para o que você mais usa</p></div></header>
          <div className="gd-quick-list">
            {QUICK.map((item) => (
              <Link key={item.href} href={item.href}>
                <div style={{ flex: 1 }}><strong>{item.label}</strong><small>{item.hint}</small></div>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="gd-panel">
          <header className="gd-panel-head"><div><h2>Status da integração</h2><p>Serviços conectados à loja</p></div></header>
          <div style={{ display: "grid", gap: 10 }}>
            {INTEGRATIONS.map(([name, status, tone]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 650 }}>{name}</span>
                <span className="gd-status" data-state={tone}><i aria-hidden="true" />{status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
