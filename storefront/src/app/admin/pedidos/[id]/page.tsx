import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrderDetail } from "@/lib/server/catalog";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending_payment: "Aguardando pagamento", paid: "Pago", preparing: "Preparando", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado", returned: "Devolvido",
};

function money(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function date(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

function jsonText(value: unknown) {
  if (!value) return "—";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();
  const o = detail.order;
  const address = (o.shipping_address ?? {}) as Record<string, unknown>;
  const status = String(o.status ?? "");
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-zinc-500 hover:text-white">← Voltar para pedidos</Link>
          <h1 className="mt-3 font-display text-3xl font-black text-white">Pedido #{String(o.number)}</h1>
          <p className="mt-1 text-sm text-zinc-500">Criado em {date(o.placed_at)} · {STATUS[status] ?? status}</p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300">{STATUS[status] ?? status}</span>
      </div>

      <OrderStatusActions orderId={id} currentStatus={status} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="font-bold text-white">Itens do pedido</h2>
            <div className="mt-4 divide-y divide-zinc-800">
              {detail.items.map((item) => <div key={String(item.id)} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1"><p className="font-semibold text-white">{String(item.product_name ?? (item.snapshot as Record<string, unknown> | null)?.name ?? "Produto")}</p><p className="mt-1 text-xs text-zinc-500">SKU/variante: {String(item.variant_sku ?? "—")} · Quantidade: {String(item.quantity)}</p></div>
                <p className="font-mono font-bold text-white">{money(item.unit_price)}</p>
              </div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="font-bold text-white">Linha do tempo</h2>
            <div className="mt-4 space-y-4">
              {detail.events.length === 0 ? <p className="text-sm text-zinc-500">Nenhum evento registrado.</p> : detail.events.map((event) => <div key={String(event.id)} className="border-l-2 border-dino-red/60 pl-4"><p className="text-sm font-semibold text-white">{String(event.message ?? event.type)}</p><p className="mt-1 text-xs text-zinc-500">{date(event.created_at)}{event.actor_name ? ` · ${String(event.actor_name)}` : ""}</p></div>)}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Cliente</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-zinc-500">Nome</dt><dd className="text-right text-zinc-200">{String(o.customer_name ?? "—")}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">E-mail</dt><dd className="break-all text-right text-zinc-200">{String(o.customer_email ?? o.guest_email ?? "—")}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Telefone</dt><dd className="text-right text-zinc-200">{String(o.customer_phone ?? "—")}</dd></div></dl></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Entrega</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-zinc-500">Método</dt><dd className="text-right text-zinc-200">{String(o.shipping_method ?? "—")}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Prazo</dt><dd className="text-right text-zinc-200">{o.shipping_eta_days ? `${String(o.shipping_eta_days)} dias úteis` : "—"}</dd></div></dl><pre className="mt-4 whitespace-pre-wrap rounded-xl bg-zinc-950 p-3 text-xs leading-5 text-zinc-400">{jsonText(address)}</pre></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Resumo financeiro</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd className="font-mono text-zinc-200">{money(o.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Desconto {o.coupon_code ? `(${String(o.coupon_code)})` : ""}</dt><dd className="font-mono text-zinc-200">− {money(o.discount_total)}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Frete</dt><dd className="font-mono text-zinc-200">{money(o.shipping_total)}</dd></div><div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-base font-black"><dt className="text-white">Total</dt><dd className="font-mono text-white">{money(o.total)}</dd></div></dl></div>
        </aside>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Pagamentos</h2><div className="mt-4 space-y-3">{detail.payments.length === 0 ? <p className="text-sm text-zinc-500">Nenhum pagamento registrado.</p> : detail.payments.map((payment) => <div key={String(payment.id)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"><div className="flex justify-between"><span className="text-zinc-300">{String(payment.method)} · {String(payment.status)}</span><strong className="font-mono text-white">{money(payment.amount)}</strong></div><p className="mt-1 text-xs text-zinc-500">Provedor: {String(payment.provider ?? "—")} · Confirmado: {date(payment.paid_at)}</p></div>)}</div></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Envios</h2><div className="mt-4 space-y-3">{detail.shipments.length === 0 ? <p className="text-sm text-zinc-500">Nenhum envio registrado.</p> : detail.shipments.map((shipment) => <div key={String(shipment.id)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"><p className="font-semibold text-white">{String(shipment.carrier ?? "Transportadora não definida")} · {String(shipment.status)}</p><p className="mt-1 text-xs text-zinc-500">Serviço: {String(shipment.service ?? "—")} · Rastreio: {String(shipment.tracking_code ?? "—")}</p></div>)}</div></div>
      </section>
    </div>
  );
}
