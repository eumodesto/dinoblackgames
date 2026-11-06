"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { brl, type OrderDto } from "@/lib/checkout-types";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { waLink } from "@/lib/whatsapp";

const STATUS_COPY: Record<string, { title: string; text: string; tone: "ok" | "wait" | "bad" }> = {
  pending_payment: { title: "Aguardando o pagamento", text: "Assim que o pagamento for confirmado, começamos a separar o seu pedido.", tone: "wait" },
  paid: { title: "Pagamento aprovado!", text: "Recebemos o seu pagamento. Vamos separar e enviar o pedido e avisar você por e-mail.", tone: "ok" },
  preparing: { title: "Preparando o seu pedido", text: "Estamos separando e embalando os itens.", tone: "ok" },
  shipped: { title: "Pedido enviado", text: "O seu pedido está a caminho.", tone: "ok" },
  delivered: { title: "Pedido entregue", text: "Esperamos que você curta! Qualquer problema, fale com a gente.", tone: "ok" },
  cancelled: { title: "Pedido cancelado", text: "O pedido foi cancelado e os itens voltaram ao estoque. Você pode fazer um novo pedido quando quiser.", tone: "bad" },
  returned: { title: "Pedido devolvido", text: "Este pedido foi devolvido.", tone: "bad" },
};

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [until]);
  if (!until) return null;
  const ms = Math.max(0, new Date(until).getTime() - now);
  return { ms, label: `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}` };
}

export function OrderStatusView({ number, token }: { number: string; token: string }) {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [simBusy, setSimBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/checkout/order/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { order?: OrderDto; error?: string };
    if (res.ok && data.order) {
      setOrder(data.order);
      setError("");
    } else {
      setError(data.error ?? "Não foi possível carregar o pedido.");
    }
  }, [number, token]);

  useEffect(() => {
    load();
  }, [load]);

  // Enquanto aguarda pagamento, confere a cada 5 s (o servidor consulta o Mercado Pago).
  useEffect(() => {
    if (order?.status !== "pending_payment") return;
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [order?.status, load]);

  const countdown = useCountdown(order?.status === "pending_payment" ? order.expiresAt : null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: o campo continua selecionável
    }
  }

  async function simulate() {
    setSimBusy(true);
    await fetch(`/api/checkout/simulate/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`, { method: "POST" });
    await load();
    setSimBusy(false);
  }

  if (error && !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-lg rounded-[28px] border border-dashed border-gray-300 p-10 text-center dark:border-zinc-700">
          <h1 className="font-display text-3xl font-black text-gray-900 dark:text-white">Pedido não encontrado</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">{error} Confira o link que enviamos ou fale com a gente.</p>
          <Link href="/loja" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-dino-red px-6 text-sm font-black text-white hover:bg-dino-red-hover">Voltar à loja</Link>
        </div>
      </div>
    );
  }
  if (!order) {
    return <div className="container mx-auto px-4 py-16 text-center text-sm text-gray-500 dark:text-zinc-400" aria-busy="true">Carregando seu pedido…</div>;
  }

  const copy_ = STATUS_COPY[order.status] ?? STATUS_COPY.pending_payment;
  const pix = order.payment?.pix;
  const waitingPix = order.status === "pending_payment" && order.payment?.method === "pix" && pix;
  const toneClass =
    copy_.tone === "ok" ? "border-emerald-500/50 bg-emerald-500/10" : copy_.tone === "bad" ? "border-dino-red/50 bg-dino-red/10" : "border-amber-400/50 bg-amber-400/10";

  return (
    <div className="container mx-auto px-4 pb-24 pt-8 text-gray-800 dark:text-zinc-200">
      <div className={`rounded-[28px] border p-6 sm:p-8 ${toneClass}`} role="status" aria-live="polite">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-600 dark:text-zinc-400">Pedido <span className="font-mono">{order.number}</span></p>
        <h1 className="mt-1 font-display text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">{copy_.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-700 dark:text-zinc-300">{copy_.text}</p>
        {order.customer.email && <p className="mt-2 text-xs text-gray-600 dark:text-zinc-400">Enviaremos as novidades para {order.customer.email}.</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {waitingPix && pix && (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950" aria-labelledby="pix-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="pix-title" className="font-display text-xl font-black text-gray-900 dark:text-white">Pague com Pix</h2>
                {countdown && <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-sm font-black dark:bg-zinc-900" role="timer" aria-label="Tempo restante para pagar">{countdown.label}</span>}
              </div>
              <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
                <div className="grid aspect-square w-full max-w-[200px] place-items-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 dark:border-zinc-700">
                  {pix.qrCodeBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code do Pix" className="h-full w-full object-contain" />
                  ) : (
                    <span className="p-3 text-center text-xs font-bold text-gray-500">QR Code de demonstração (modo simulado)</span>
                  )}
                </div>
                <div className="min-w-0">
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-zinc-300">
                    <li>Abra o app do seu banco e escolha pagar com Pix.</li>
                    <li>Escaneie o QR Code ou use o Pix copia e cola.</li>
                    <li>Confirme o valor de <strong>{brl(order.total)}</strong>.</li>
                  </ol>
                  <label htmlFor="pix-code" className="mt-4 block text-xs font-bold text-gray-600 dark:text-zinc-400">Pix copia e cola</label>
                  <div className="mt-1 flex gap-2">
                    <input id="pix-code" readOnly value={pix.qrCode} onFocus={(e) => e.currentTarget.select()} className="h-12 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900" />
                    <button type="button" onClick={() => copy(pix.qrCode)} className="h-12 shrink-0 rounded-xl bg-dino-red px-4 text-sm font-black text-white hover:bg-dino-red-hover">
                      {copied ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400">Esta página confirma sozinha quando o pagamento cair. Não precisa recarregar.</p>
                </div>
              </div>
              {order.simulated && (
                <div className="mt-5 rounded-xl border border-sky-400/50 bg-sky-400/10 p-4">
                  <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Modo de demonstração: nenhum dinheiro é cobrado.</p>
                  <button type="button" onClick={simulate} disabled={simBusy} className="mt-2 h-11 rounded-xl bg-sky-600 px-4 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60">
                    {simBusy ? "Simulando…" : "Simular pagamento do Pix"}
                  </button>
                </div>
              )}
            </section>
          )}

          {order.payment?.status === "failed" && order.status === "pending_payment" && (
            <p role="alert" className="rounded-2xl border border-dino-red/40 bg-dino-red/10 p-4 text-sm font-semibold text-dino-red">O último pagamento não foi aprovado. Volte ao checkout para tentar outro meio de pagamento.</p>
          )}

          <section className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950" aria-labelledby="items-title">
            <h2 id="items-title" className="mb-4 font-display text-xl font-black text-gray-900 dark:text-white">Itens</h2>
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
              {order.items.map((i, n) => (
                <li key={n} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                    {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{i.name}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{[...Object.values(i.options), i.condition === "seminovo" ? "Seminovo · unidade única" : ""].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Qtd. {i.qty}</p>
                  </div>
                  <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{brl(i.unitPrice * i.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/loja" className="inline-flex h-12 items-center rounded-2xl border border-gray-200 px-6 text-sm font-black text-gray-900 hover:border-dino-red hover:text-dino-red dark:border-zinc-700 dark:text-white">Continuar comprando</Link>
            {order.status === "pending_payment" && order.payment?.status === "failed" && (
              <Link href="/checkout" className="inline-flex h-12 items-center rounded-2xl bg-dino-red px-6 text-sm font-black text-white hover:bg-dino-red-hover">Voltar ao checkout</Link>
            )}
            <a href={waLink(`Olá! Preciso de ajuda com o pedido ${order.number}.`)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-[#25D366] px-6 text-sm font-black text-[#052e16] hover:bg-[#1fbd5b]">
              <WhatsAppIcon className="h-6 w-6" />
              Falar sobre este pedido
            </a>
          </div>
        </div>

        <aside className="space-y-4" aria-label="Resumo e entrega">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 font-display text-xl font-black text-gray-900 dark:text-white">Resumo</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600 dark:text-zinc-400">Subtotal</dt><dd className="font-mono font-bold">{brl(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><dt>Desconto</dt><dd className="font-mono font-bold">− {brl(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-600 dark:text-zinc-400">Entrega</dt><dd className="font-mono font-bold">{order.shipping === 0 ? "Grátis" : brl(order.shipping)}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-base dark:border-zinc-800"><dt className="font-black">Total</dt><dd className="font-mono text-xl font-black">{brl(order.total)}</dd></div>
            </dl>
            {order.payment && (
              <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400">
                Pagamento: {order.payment.method === "pix" ? "Pix" : order.payment.method === "boleto" ? "Boleto" : `Cartão em ${order.payment.installments}x`}
              </p>
            )}
          </div>
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 font-display text-xl font-black text-gray-900 dark:text-white">Entrega</h2>
            <p className="font-bold">{order.shippingMethod}{order.etaDays ? ` · até ${order.etaDays} dias úteis` : ""}</p>
            {order.address && (
              <address className="mt-2 not-italic text-gray-600 dark:text-zinc-400">
                {order.address.recipient}<br />
                {order.address.street}, {order.address.number}{order.address.complement ? ` · ${order.address.complement}` : ""}<br />
                {order.address.district} · {order.address.city}/{order.address.state}<br />
                CEP {order.address.cep}
              </address>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
