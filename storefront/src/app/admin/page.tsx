import Link from "next/link";
import { ArrowUpRight, Box, CircleDollarSign, ShoppingBag, TriangleAlert, type LucideIcon } from "lucide-react";
import { getDashboardKpis } from "@/lib/server/catalog";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string | number; sub?: string; icon: LucideIcon; tone?: "teal" }) {
  return (
    <article className="gd-metric" data-tone={tone}>
      <div className="gd-metric-head"><span>{label}</span><span className="gd-metric-icon" aria-hidden="true"><Icon /></span></div>
      <strong className="gd-metric-value">{value}</strong>
      {sub && <div className="gd-metric-caption">{sub}</div>}
    </article>
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

export default async function AdminDashboard() {
  const kpis = await getDashboardKpis();

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <header className="gd-view-head">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: "var(--gd-muted)", fontSize: 13, margin: "8px 0 0" }}>Visão geral da loja DinoBlack Games.</p>
        </div>
      </header>

      <div className="gd-metric-grid">
        <Kpi label="Receita" value={formatBRL(kpis.revenue)} sub={`${kpis.paidOrders} pedidos pagos`} icon={CircleDollarSign} tone="teal" />
        <Kpi label="Pedidos" value={kpis.totalOrders} sub={`${kpis.pendingOrders} aguardando pagamento`} icon={ShoppingBag} />
        <Kpi label="Produtos publicados" value={kpis.publishedProducts} sub={`${kpis.totalProducts} no total`} icon={Box} />
        <Kpi label="Alertas de estoque" value={kpis.inventoryAlerts} sub="Itens com estoque baixo" icon={TriangleAlert} />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
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
