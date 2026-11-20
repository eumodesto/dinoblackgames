import "server-only";
import { getSql } from "./sql";

export type PeriodKey = "hoje" | "ontem" | "7d" | "30d" | "90d" | "custom";
export const PERIODS: { key: Exclude<PeriodKey, "custom">; label: string }[] = [
  { key: "hoje", label: "Hoje" }, { key: "ontem", label: "Ontem" }, { key: "7d", label: "7 dias" }, { key: "30d", label: "30 dias" }, { key: "90d", label: "90 dias" },
];

// Horário de Brasília (UTC-3, sem horário de verão desde 2019): "dia" = 00:00 a 24:00 de Brasília.
const BRT = 3 * 3600_000;
const DAY = 86_400_000;
const startOfDay = (ms: number) => Math.floor((ms - BRT) / DAY) * DAY + BRT;
const isDate = (v?: string) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
const fromDate = (v: string) => Date.parse(`${v}T00:00:00-03:00`);

export type Range = { key: PeriodKey; from: Date; to: Date; label: string; de: string; ate: string };

/** Período escolhido → intervalo [from, to). `custom` usa `de` e `ate` (inclusive), no máximo 366 dias. */
export function resolveRange(input: { periodo?: string; de?: string; ate?: string }, now = Date.now()): Range {
  const today = startOfDay(now);
  const fmt = (ms: number) => new Date(ms - BRT).toISOString().slice(0, 10);
  if (input.periodo === "custom" && isDate(input.de) && isDate(input.ate)) {
    let a = fromDate(input.de!), b = fromDate(input.ate!);
    if (b < a) [a, b] = [b, a];
    b = Math.min(b, today);
    a = Math.max(a, b - 365 * DAY);
    return { key: "custom", from: new Date(a), to: new Date(b + DAY), label: `${fmt(a).split("-").reverse().join("/")} a ${fmt(b).split("-").reverse().join("/")}`, de: fmt(a), ate: fmt(b) };
  }
  const key = (PERIODS.some((p) => p.key === input.periodo) ? input.periodo : "7d") as Exclude<PeriodKey, "custom">;
  const days = { hoje: 1, ontem: 1, "7d": 7, "30d": 30, "90d": 90 }[key];
  const from = key === "ontem" ? today - DAY : today - (days - 1) * DAY;
  const to = key === "ontem" ? today : today + DAY;
  return { key, from: new Date(from), to: new Date(to), label: PERIODS.find((p) => p.key === key)!.label, de: fmt(from), ate: fmt(to - DAY) };
}

export type FunnelSegment = { dispositivo: string; origem: string };
export type FunnelStep = { id: string; label: string; short: string; hint: string; count: number };
export type SegmentOption = { name: string; sessions: number };
export type Funnel = {
  range: Range;
  segment: FunnelSegment;
  /** Pedidos não guardam o dispositivo/origem da sessão: com segmento ativo a última etapa (compra paga) não é exibida. */
  segmented: boolean;
  steps: FunnelStep[];
  paidOrders: number;
  revenue: number;
  side: { searched: number; stockOut: number; coupon: number };
  deviceOptions: SegmentOption[];
  sourceOptions: SegmentOption[];
  daily: { day: string; sessions: number }[];
};

const DEVICES = ["mobile", "tablet", "desktop"];

/**
 * Funil por SESSÃO: cada sessão conta até a etapa mais avançada que alcançou (quem chega ao checkout
 * por link direto ou com o carrinho guardado também conta nas etapas anteriores). A última etapa
 * vem dos pedidos pagos no banco — a fonte confiável de venda. `segment` restringe o funil a um
 * dispositivo e/ou origem de visita.
 */
export async function getFunnel(range: Range, segment: Partial<FunnelSegment> = {}): Promise<Funnel> {
  const sql = await getSql();
  const dispositivo = DEVICES.includes(segment.dispositivo ?? "") ? segment.dispositivo! : "";
  const origem = (segment.origem ?? "").trim().slice(0, 60);
  const segmented = Boolean(dispositivo || origem);
  const p = [range.from.toISOString(), range.to.toISOString()];
  const segParams = [...p, dispositivo, origem];

  const sessions = `with s as (
      select session_id,
             max(case event when 'page_view' then 1 when 'product_view' then 2 when 'add_to_cart' then 3 when 'checkout_start' then 4 when 'shipping_quoted' then 5 when 'payment_created' then 6 else 0 end) as stage,
             coalesce((array_agg(device order by created_at) filter (where device is not null))[1], 'desktop') as device,
             coalesce((array_agg(source order by created_at) filter (where source is not null))[1], 'direto') as source,
             bool_or(event = 'search') as searched, bool_or(event = 'stock_out_view') as stock_out, bool_or(event = 'coupon_applied') as coupon,
             min(created_at) as first_at
      from analytics_events
      where created_at >= $1::timestamptz and created_at < $2::timestamptz and session_id is not null
      group by session_id)`;
  const pick = "(\$3 = '' or device = \$3) and (\$4 = '' or source = \$4)";

  const [[funnel], daily, devices, sources, [orders]] = await Promise.all([
    sql.query<Record<string, number>>(`${sessions}
      select count(*)::int as s1, count(*) filter (where stage >= 2)::int as s2, count(*) filter (where stage >= 3)::int as s3,
             count(*) filter (where stage >= 4)::int as s4, count(*) filter (where stage >= 5)::int as s5, count(*) filter (where stage >= 6)::int as s6,
             count(*) filter (where searched)::int as searched, count(*) filter (where stock_out)::int as stock_out, count(*) filter (where coupon)::int as coupon
      from s where ${pick}`, segParams),
    sql.query<{ day: string; sessions: number }>(`${sessions}
      select to_char(first_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as day, count(*)::int as sessions from s where ${pick} group by 1 order by 1`, segParams),
    // opções dos filtros: sempre sobre todas as sessões do período (senão o filtro esconderia as outras escolhas)
    sql.query<SegmentOption>(`${sessions} select device as name, count(*)::int as sessions from s group by device order by sessions desc`, p),
    sql.query<SegmentOption>(`${sessions} select source as name, count(*)::int as sessions from s group by source order by sessions desc limit 20`, p),
    sql.query<{ n: number; revenue: string | number }>(
      "select count(*)::int as n, coalesce(sum(total), 0) as revenue from orders where paid_at >= $1::timestamptz and paid_at < $2::timestamptz and status <> 'cancelled'", p),
  ]);

  const f = funnel ?? {};
  const g = (k: string) => Number(f[k] ?? 0);
  const steps: FunnelStep[] = [
    { id: "sessions", label: "Sessões (visitantes)", short: "Sessões", hint: "Visitas ao site, sem bots nem o painel admin", count: g("s1") },
    { id: "product", label: "Viram um produto", short: "Viram produto", hint: "Abriram ao menos uma página de produto", count: g("s2") },
    { id: "cart", label: "Adicionaram ao carrinho", short: "Carrinho", hint: "Clicaram em adicionar ao carrinho", count: g("s3") },
    { id: "checkout", label: "Iniciaram o checkout", short: "Checkout", hint: "Abriram a página de checkout", count: g("s4") },
    { id: "shipping", label: "Frete e endereço informados", short: "Frete", hint: "Frete calculado no checkout", count: g("s5") },
    { id: "payment", label: "Pagamento gerado", short: "Pagamento", hint: "Pedido criado (Pix gerado ou cartão enviado)", count: g("s6") },
  ];
  if (!segmented) steps.push({ id: "paid", label: "Compra paga", short: "Paga", hint: "Pedidos pagos no período (do banco de pedidos)", count: Number(orders?.n ?? 0) });

  return {
    range,
    segment: { dispositivo, origem },
    segmented,
    steps,
    paidOrders: Number(orders?.n ?? 0),
    revenue: Number(orders?.revenue ?? 0),
    side: { searched: g("searched"), stockOut: g("stock_out"), coupon: g("coupon") },
    deviceOptions: devices.map((d) => ({ name: d.name, sessions: Number(d.sessions) })),
    sourceOptions: sources.map((d) => ({ name: d.name, sessions: Number(d.sessions) })),
    daily: daily.map((d) => ({ day: d.day, sessions: Number(d.sessions) })),
  };
}
