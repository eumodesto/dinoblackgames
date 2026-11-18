import { getOrders } from "@/lib/server/catalog";
import Link from "next/link";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Aguardando pgto.", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  paid: { label: "Pago", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  preparing: { label: "Preparando", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  shipped: { label: "Enviado", cls: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  delivered: { label: "Entregue", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/10 text-red-400 border-red-500/30" },
  returned: { label: "Devolvido", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
};

// Lê o catálogo do banco em tempo de execução. Sem isto o Next tenta pré-renderizar a página
// durante `next build`, quando não há banco (a Vercel não tem DATABASE_URL no build).
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pageUrl(params: SearchParams, page: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) next.set(key, value);
  }
  next.set("page", String(page));
  return `/admin/pedidos?${next.toString()}`;
}

function exportUrl(params: SearchParams) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && typeof value === "string" && value) next.set(key, value);
  }
  const query = next.toString();
  return `/api/admin/orders/export${query ? `?${query}` : ""}`;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const page = Math.max(Number(valueOf(params, "page")) || 1, 1);
  const limit = 25;
  const orders = await getOrders({
    query: valueOf(params, "q") || undefined,
    status: valueOf(params, "status") || undefined,
    paymentStatus: valueOf(params, "payment") || undefined,
    carrier: valueOf(params, "carrier") || undefined,
    from: valueOf(params, "from") || undefined,
    to: valueOf(params, "to") || undefined,
    limit,
    offset: (page - 1) * limit,
  });
  const hasNext = orders.length === limit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black text-white">Pedidos</h1>
        <p className="mt-1 text-sm text-zinc-500">Página {page} · {orders.length} pedidos carregados</p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-2 xl:grid-cols-6" method="get">
        <input name="q" defaultValue={valueOf(params, "q")} placeholder="Pedido, cliente, e-mail ou SKU" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-dino-red xl:col-span-2" />
        <select name="status" defaultValue={valueOf(params, "status")} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_BADGE).map(([key, badge]) => <option key={key} value={key}>{badge.label}</option>)}
        </select>
        <select name="payment" defaultValue={valueOf(params, "payment")} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white">
          <option value="">Todos os pagamentos</option>
          <option value="pending">Pendente</option><option value="authorized">Autorizado</option><option value="paid">Pago</option><option value="failed">Falhou</option><option value="refunded">Reembolsado</option>
        </select>
        <input name="carrier" defaultValue={valueOf(params, "carrier")} placeholder="Transportadora" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-dino-red" />
        <div className="flex gap-2 xl:col-span-2">
          <input type="date" name="from" defaultValue={valueOf(params, "from")} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
          <input type="date" name="to" defaultValue={valueOf(params, "to")} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
        </div>
        <button className="rounded-xl bg-dino-red px-4 py-2 text-sm font-bold text-white hover:bg-red-700 xl:col-span-1" type="submit">Filtrar</button>
        <Link href="/admin/pedidos" className="rounded-xl border border-zinc-700 px-4 py-2 text-center text-sm font-bold text-zinc-300 hover:border-zinc-500 hover:text-white">Limpar</Link>
        <a href={exportUrl(params)} className="rounded-xl border border-emerald-700/60 px-4 py-2 text-center text-sm font-bold text-emerald-300 hover:border-emerald-500 hover:text-emerald-200">Exportar CSV</a>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center">
          <p className="font-display text-xl font-black text-white">Nenhum pedido ainda</p>
          <p className="mt-2 text-sm text-zinc-500">Os pedidos aparecerão aqui conforme os clientes comprarem na loja.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-bold text-zinc-400">Pedido</th>
                <th className="hidden px-4 py-3 font-bold text-zinc-400 sm:table-cell">Cliente</th>
                <th className="px-4 py-3 font-bold text-zinc-400">Total</th>
                <th className="hidden px-4 py-3 font-bold text-zinc-400 md:table-cell">Itens</th>
                <th className="hidden px-4 py-3 font-bold text-zinc-400 lg:table-cell">Data</th>
                <th className="px-4 py-3 font-bold text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {orders.map((o) => {
                const badge = STATUS_BADGE[o.status] ?? { label: o.status, cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
                return (
                  <tr key={o.id} className="transition hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold text-white hover:text-dino-red">#{o.number}</Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="text-zinc-300">{o.customerName ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{o.customerEmail ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-white">{formatBRL(o.total)}</td>
                    <td className="hidden px-4 py-3 text-zinc-400 md:table-cell">{o.itemCount} {o.itemCount === 1 ? "item" : "itens"}</td>
                    <td className="hidden px-4 py-3 text-xs text-zinc-500 lg:table-cell">{formatDate(o.placedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between">
          {page > 1 ? <Link href={pageUrl(params, page - 1)} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:text-white">← Anterior</Link> : <span />}
          {hasNext ? <Link href={pageUrl(params, page + 1)} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:text-white">Próxima →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
