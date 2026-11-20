"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "./AdminSelect";

type Shipment = { status?: unknown; carrier?: unknown; service?: unknown; tracking_code?: unknown } | null;

export function ShipmentActions({ orderId, shipment }: { orderId: string; shipment: Shipment }) {
  const router = useRouter();
  const [status, setStatus] = useState(String(shipment?.status ?? "pending"));
  const [carrier, setCarrier] = useState(String(shipment?.carrier ?? ""));
  const [service, setService] = useState(String(shipment?.service ?? ""));
  const [trackingCode, setTrackingCode] = useState(String(shipment?.tracking_code ?? ""));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/shipment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, carrier, service, trackingCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a remessa.");
      setMessage("Remessa salva.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a remessa.");
    } finally { setSaving(false); }
  }

  async function notify() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/notify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: status === "delivered" ? "order_delivered" : "order_shipped" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar a notificação.");
      setMessage("Notificação enviada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a notificação.");
    } finally { setSaving(false); }
  }

  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-white">Expedição</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><AdminSelect value={status} onValueChange={setStatus} options={[{ value: "pending", label: "Pendente" }, { value: "ready", label: "Pronto para envio" }, { value: "shipped", label: "Enviado" }, { value: "delivered", label: "Entregue" }, { value: "failed", label: "Falhou" }]} aria-label="Status da expedição" /><input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Transportadora" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /><input value={service} onChange={(event) => setService(event.target.value)} placeholder="Serviço" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /><input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Código de rastreio" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={save} disabled={saving} className="rounded-xl bg-dino-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Salvando…" : "Salvar remessa"}</button><button onClick={notify} disabled={saving} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:text-white disabled:opacity-50">Reenviar notificação</button></div>{message && <p className="mt-3 text-xs text-zinc-400" role="status">{message}</p>}</div>;
}
