"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  ["pending_payment", "Aguardando pagamento"],
  ["paid", "Pago"],
  ["preparing", "Preparando"],
  ["shipped", "Enviado"],
  ["delivered", "Entregue"],
  ["cancelled", "Cancelado"],
  ["returned", "Devolvido"],
] as const;

export function OrderStatusActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (status === "cancelled" && !window.confirm("Cancelar este pedido e liberar o estoque?")) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar o pedido.");
      setMessage("Status atualizado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Ação do pedido</h2><div className="mt-4 flex flex-col gap-3 sm:flex-row"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"><option disabled value="">Selecione o status</option>{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={save} disabled={saving || status === currentStatus} className="h-11 rounded-xl bg-dino-red px-4 text-sm font-bold text-white hover:bg-dino-red-hover disabled:opacity-50">{saving ? "Salvando…" : "Atualizar status"}</button></div>{message && <p className="mt-3 text-xs text-zinc-400" role="status">{message}</p>}<p className="mt-3 text-xs leading-5 text-zinc-500">Cancelamentos usam a rotina transacional do banco para liberar estoque e registrar o evento.</p></div>;
}
