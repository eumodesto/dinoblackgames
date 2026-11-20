"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AdminSelect, type SelectOption } from "./AdminSelect";

export type OrdersFilterValues = { q: string; status: string; payment: string; carrier: string; from: string; to: string };

type Props = {
  initial: OrdersFilterValues;
  statusOptions: SelectOption[];
  paymentOptions: SelectOption[];
};

const KEYS: (keyof OrdersFilterValues)[] = ["q", "status", "payment", "carrier", "from", "to"];

function toQuery(values: OrdersFilterValues) {
  const params = new URLSearchParams();
  for (const key of KEYS) if (values[key]) params.set(key, values[key]);
  return params.toString();
}

/**
 * Filtros de pedidos sem botão "Filtrar": a lista se atualiza sozinha enquanto os campos são preenchidos
 * (texto com pequena espera para não consultar a cada tecla; selects e datas na hora).
 */
export function OrdersFilters({ initial, statusOptions, paymentOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = toQuery(values);
  const set = (key: keyof OrdersFilterValues) => (value: string) => setValues((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    // O que já está na URL (sem a página) não precisa ser buscado de novo.
    const shown = new URLSearchParams(current.toString());
    shown.delete("page");
    if (shown.toString() === query) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, current, pathname, router]);

  const text = "rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none";

  return (
    <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-2 xl:grid-cols-6" role="search" aria-busy={pending}>
      <input name="q" value={values.q} onChange={(event) => set("q")(event.target.value)} placeholder="Pedido, cliente, e-mail ou SKU" aria-label="Buscar pedido" className={`${text} xl:col-span-2`} />
      <AdminSelect options={statusOptions} value={values.status} onValueChange={set("status")} aria-label="Filtrar por status" />
      <AdminSelect options={paymentOptions} value={values.payment} onValueChange={set("payment")} aria-label="Filtrar por pagamento" />
      <input name="carrier" value={values.carrier} onChange={(event) => set("carrier")(event.target.value)} placeholder="Transportadora" aria-label="Transportadora" className={text} />
      <div className="flex gap-2 xl:col-span-2">
        <input type="date" name="from" value={values.from} onChange={(event) => set("from")(event.target.value)} aria-label="De" className={`${text} min-w-0 flex-1`} />
        <input type="date" name="to" value={values.to} onChange={(event) => set("to")(event.target.value)} aria-label="Até" className={`${text} min-w-0 flex-1`} />
      </div>
      <Link href="/admin/pedidos" onClick={() => setValues({ q: "", status: "", payment: "", carrier: "", from: "", to: "" })} className="rounded-xl border border-zinc-700 px-4 py-2 text-center text-sm font-bold text-zinc-300 hover:border-zinc-500 hover:text-white xl:col-span-2">Limpar</Link>
      <a href={`/api/admin/orders/export${query ? `?${query}` : ""}`} className="rounded-xl border border-emerald-700/60 px-4 py-2 text-center text-sm font-bold text-emerald-300 hover:border-emerald-500 hover:text-emerald-200 xl:col-span-2">Exportar CSV</a>
      <p className="gd-filter-status xl:col-span-2" role="status" aria-live="polite">{pending ? "Atualizando…" : ""}</p>
    </div>
  );
}
