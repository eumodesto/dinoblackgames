"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXTENDED_STATUSES, ORDER_STATUS_LABEL, ORDER_TRANSITIONS, isOrderStatus, statusLabel, type OrderStatus } from "@/lib/order-status";
import { EVENT_INFO, STATUS_EVENT } from "@/lib/store-events";
import { AdminSelect } from "./AdminSelect";

const NEEDS_REASON = new Set<OrderStatus>(["cancelled", "exchange_requested", "refunded", "returned"]);

export function OrderStatusActions({ orderId, currentStatus, extendedSupported }: { orderId: string; currentStatus: string; extendedSupported: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const next = isOrderStatus(currentStatus) ? ORDER_TRANSITIONS[currentStatus].filter((s) => extendedSupported || !EXTENDED_STATUSES.includes(s)) : [];
  const target = isOrderStatus(status) ? status : null;
  const event = target ? STATUS_EVENT[target] : undefined;
  const info = event ? EVENT_INFO[event] : undefined;

  async function save() {
    if (!target) return;
    if (target === "cancelled" && !window.confirm("Cancelar este pedido e liberar o estoque?")) return;
    if (target === "refunded" && !window.confirm("Marcar como estornado? Faça o estorno do valor no painel do Mercado Pago, se ainda não fez.")) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: target, reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar o pedido.");
      setMessage(`Status alterado para “${statusLabel(target)}”.`);
      setStatus("");
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="font-bold text-white">Alterar status do pedido</h2>
      {next.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Este pedido está em “{statusLabel(currentStatus)}” e não tem próximos passos.</p>
      ) : (
        <>
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <AdminSelect value={status} onValueChange={setStatus} options={[{ value: "", label: `Atual: ${statusLabel(currentStatus)} → escolha o novo status` }, ...next.map((value) => ({ value, label: ORDER_STATUS_LABEL[value] }))]} aria-label="Novo status do pedido" className="w-full min-w-0" />
            <button onClick={save} disabled={saving || !target} className="h-11 whitespace-nowrap rounded-xl bg-dino-red px-5 text-sm font-bold text-white hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Atualizar status"}</button>
          </div>
          {target && NEEDS_REASON.has(target) && (
            <label className="mt-3 block text-sm text-zinc-300">Motivo (aparece no histórico e nos avisos)
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex.: cliente desistiu, produto com defeito" className="mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red" />
            </label>
          )}
          {info && (
            <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-400">
              Ao salvar: {[info.customer && "o cliente recebe um e-mail", info.admin && "a equipe recebe um aviso", "os webhooks assinados deste evento são chamados"].filter(Boolean).join(", ")}.
            </p>
          )}
        </>
      )}
      {!extendedSupported && <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">Os status “Pagamento recusado”, “Pedido de troca” e “Estornado” ainda não existem no banco. Aplique a migração <code>20261123000016_order_status_workflow.sql</code> (precedida da <code>…015</code>) no Supabase para liberá-los.</p>}
      {message && <p className="mt-3 text-xs text-zinc-400" role="status">{message}</p>}
    </div>
  );
}
