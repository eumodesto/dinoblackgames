import { getOrders } from "@/lib/server/catalog";

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

export default async function AdminOrdersPage() {
  const orders = await getOrders(undefined, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black text-white">Pedidos</h1>
        <p className="mt-1 text-sm text-zinc-500">{orders.length} pedidos registrados</p>
      </div>

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
                      <span className="font-mono font-semibold text-white">#{o.number}</span>
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
    </div>
  );
}
