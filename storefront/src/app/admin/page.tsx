import Link from "next/link";
import { getDashboardKpis } from "@/lib/server/catalog";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-display text-3xl font-black text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  const kpis = await getDashboardKpis();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-black text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Visão geral da loja DinoBlack Games.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Produtos publicados" value={kpis.publishedProducts} sub={`${kpis.totalProducts} total`} />
        <Kpi label="Pedidos" value={kpis.totalOrders} sub={`${kpis.pendingOrders} aguardando pagamento`} />
        <Kpi label="Receita" value={formatBRL(kpis.revenue)} sub={`${kpis.paidOrders} pedidos pagos`} />
        <Kpi label="Alertas de estoque" value={kpis.inventoryAlerts} sub="Itens com estoque baixo" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Ações rápidas</h2>
          </div>
          <div className="mt-4 grid gap-2">
            <Link
              href="/admin/produtos"
              className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <span>Gerenciar produtos</span>
              <span className="text-zinc-500">→</span>
            </Link>
            <Link
              href="/admin/pedidos"
              className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <span>Ver pedidos</span>
              <span className="text-zinc-500">→</span>
            </Link>
            <Link
              href="/"
              className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <span>Abrir loja pública</span>
              <span className="text-zinc-500">→</span>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-bold text-white">Status da integração</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Supabase", "Conectado", true],
              ["Mercado Pago", "Configurado", true],
              ["SuperFrete / Melhor Envio", "Configurado", true],
              ["PGlite local", "Ativo (dev)", true],
            ].map(([name, status, ok]) => (
              <div key={name as string} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{name as string}</span>
                <span className={`flex items-center gap-1.5 font-semibold ${ok ? "text-emerald-400" : "text-amber-400"}`}>
                  <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {status as string}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
