import "server-only";
import { getSql } from "./sql";
import type { Range } from "./analytics";

/** Indicadores do período escolhido, com o período anterior de mesma duração para comparar. */
export type PeriodKpis = {
  revenue: number;
  orders: number;
  paidOrders: number;
  /** Receita ÷ pedidos pagos. Nulo sem venda no período. */
  avgTicket: number | null;
  sessions: number;
  /** Pedidos pagos ÷ sessões. Nulo sem sessão no período. */
  conversion: number | null;
};

export type Kpi = { label: string; value: number | null; previous: number | null; kind: "money" | "int" | "percent" };

export type ActionItem = {
  id: string;
  title: string;
  count: number;
  detail: string;
  href: string;
  tone: "danger" | "warn" | "info";
};

export type StockHealth = {
  visibleProducts: number;
  /** Produtos visíveis na loja sem nenhuma unidade disponível. */
  visibleOutOfStock: number;
  /** Produtos publicados mas ocultos (a importação oculta o que está sem estoque). */
  hiddenProducts: number;
  hiddenOutOfStock: number;
};

export type UnsoldView = { slug: string; name: string; views: number };

export type DashboardInsights = {
  range: Range;
  kpis: Kpi[];
  /** Poucas sessões: percentuais do funil e conversão ainda não dizem nada. */
  smallSample: boolean;
  actions: ActionItem[];
  stock: StockHealth;
  viewedNotSold: UnsoldView[];
};

/** Abaixo disto, conversão e funil são ruído estatístico: o painel avisa em vez de sugerir tendência. */
export const MIN_SESSIONS = 100;

const pct = (a: number, b: number) => (b > 0 ? a / b : null);

async function periodKpis(from: Date, to: Date): Promise<PeriodKpis> {
  const sql = await getSql();
  const [o] = await sql.query<{ orders: number; paid: number; revenue: string | number }>(
    `select count(*) filter (where placed_at >= $1::timestamptz and placed_at < $2::timestamptz)::int as orders,
            count(*) filter (where paid_at >= $1::timestamptz and paid_at < $2::timestamptz and status <> 'cancelled')::int as paid,
            coalesce(sum(total) filter (where paid_at >= $1::timestamptz and paid_at < $2::timestamptz and status <> 'cancelled'), 0) as revenue
     from orders`,
    [from.toISOString(), to.toISOString()],
  );
  const [s] = await sql.query<{ sessions: number }>(
    `select count(distinct session_id)::int as sessions from analytics_events
     where event = 'page_view' and created_at >= $1::timestamptz and created_at < $2::timestamptz`,
    [from.toISOString(), to.toISOString()],
  );
  const revenue = Number(o?.revenue ?? 0);
  const paidOrders = o?.paid ?? 0;
  const sessions = s?.sessions ?? 0;
  return {
    revenue,
    orders: o?.orders ?? 0,
    paidOrders,
    avgTicket: paidOrders > 0 ? revenue / paidOrders : null,
    sessions,
    conversion: pct(paidOrders, sessions),
  };
}

async function actionItems(): Promise<ActionItem[]> {
  const sql = await getSql();

  // Pagos que ainda não saíram: pago/preparando sem envio despachado. Mostra há quanto tempo o mais antigo espera.
  const [toShip] = await sql.query<{ n: number; oldest_hours: string | number | null }>(
    `select count(*)::int as n, round(extract(epoch from (now() - min(o.paid_at))) / 3600)::int as oldest_hours
     from orders o
     where o.status in ('paid', 'preparing')
       and not exists (select 1 from shipments s where s.order_id = o.id and s.status in ('shipped', 'delivered'))`,
  );

  // Pix gerado e ainda não pago, vencendo nas próximas 2 horas: dá para recuperar com um aviso ao cliente.
  const [pixExpiring] = await sql.query<{ n: number }>(
    `select count(*)::int as n from payments p
     join orders o on o.id = p.order_id
     where p.method = 'pix' and p.status = 'pending' and o.status = 'pending_payment'
       and p.pix_expires_at > now() and p.pix_expires_at <= now() + interval '2 hours'`,
  );

  // Recusados ou expirados nas últimas 24 horas, em pedidos que ainda não foram pagos nem cancelados.
  const [failed] = await sql.query<{ n: number }>(
    `select count(distinct p.order_id)::int as n from payments p
     join orders o on o.id = p.order_id
     where p.status in ('failed', 'expired') and p.created_at >= now() - interval '24 hours'
       and o.status = 'pending_payment'`,
  );

  // Enviado sem código de rastreio: o cliente não consegue acompanhar.
  const [noTracking] = await sql.query<{ n: number }>(
    `select count(*)::int as n from orders o
     where o.status = 'shipped'
       and not exists (select 1 from shipments s where s.order_id = o.id and coalesce(s.tracking_code, '') <> '')`,
  );

  const hours = Number(toShip?.oldest_hours ?? 0);
  const waiting = hours >= 48 ? `o mais antigo espera há ${Math.floor(hours / 24)} dias` : hours >= 1 ? `o mais antigo espera há ${hours} h` : "recém-pagos";

  return [
    { id: "ship", title: "Pagos aguardando envio", count: toShip?.n ?? 0, detail: (toShip?.n ?? 0) > 0 ? waiting : "Nada pendente", href: "/admin/pedidos?status=paid", tone: hours >= 48 ? "danger" : "warn" },
    { id: "pix", title: "Pix vencendo em 2 h", count: pixExpiring?.n ?? 0, detail: (pixExpiring?.n ?? 0) > 0 ? "chame o cliente antes de expirar" : "Nenhum prestes a expirar", href: "/admin/pedidos?status=pending_payment", tone: "warn" },
    { id: "failed", title: "Pagamentos recusados (24 h)", count: failed?.n ?? 0, detail: (failed?.n ?? 0) > 0 ? "pedidos ainda abertos" : "Nenhum recusado", href: "/admin/pedidos?status=pending_payment", tone: "danger" },
    { id: "tracking", title: "Enviados sem rastreio", count: noTracking?.n ?? 0, detail: (noTracking?.n ?? 0) > 0 ? "cliente sem como acompanhar" : "Todos com código", href: "/admin/pedidos?status=shipped", tone: "info" },
  ];
}

async function stockHealth(): Promise<StockHealth> {
  const sql = await getSql();
  const [row] = await sql.query<{ vis: number; vis_out: number; hid: number; hid_out: number }>(
    `with st as (
       select p.id, p.visibility,
              coalesce(sum(il.on_hand - il.reserved), 0) as available
       from products p
       left join product_variants v on v.product_id = p.id and v.is_active
       left join inventory_levels il on il.variant_id = v.id
       where p.status = 'published'
       group by p.id, p.visibility
     )
     select count(*) filter (where visibility <> 'hidden')::int as vis,
            count(*) filter (where visibility <> 'hidden' and available <= 0)::int as vis_out,
            count(*) filter (where visibility = 'hidden')::int as hid,
            count(*) filter (where visibility = 'hidden' and available <= 0)::int as hid_out
     from st`,
  );
  return {
    visibleProducts: row?.vis ?? 0,
    visibleOutOfStock: row?.vis_out ?? 0,
    hiddenProducts: row?.hid ?? 0,
    hiddenOutOfStock: row?.hid_out ?? 0,
  };
}

/** Produtos mais visitados no período que não venderam nenhuma unidade: preço, foto ou descrição a revisar. */
async function viewedNotSold(range: Range): Promise<UnsoldView[]> {
  const sql = await getSql();
  const rows = await sql.query<{ slug: string; name: string; views: number }>(
    `select p.slug, p.name, v.views::int as views
     from (
       select product_slug, count(*) as views from analytics_events
       where event = 'product_view' and product_slug is not null
         and created_at >= $1::timestamptz and created_at < $2::timestamptz
       group by product_slug
     ) v
     join products p on p.slug = v.product_slug
     where not exists (
       select 1 from order_items oi join orders o on o.id = oi.order_id
       where oi.product_id = p.id and o.paid_at >= $1::timestamptz and o.paid_at < $2::timestamptz and o.status <> 'cancelled'
     )
     order by v.views desc, p.name
     limit 5`,
    [range.from.toISOString(), range.to.toISOString()],
  );
  return rows;
}

export async function getDashboardInsights(range: Range): Promise<DashboardInsights> {
  const span = range.to.getTime() - range.from.getTime();
  const prevFrom = new Date(range.from.getTime() - span);
  const [cur, prev, actions, stock, unsold] = await Promise.all([
    periodKpis(range.from, range.to),
    periodKpis(prevFrom, range.from),
    actionItems(),
    stockHealth(),
    viewedNotSold(range),
  ]);

  const kpis: Kpi[] = [
    { label: "Receita", value: cur.revenue, previous: prev.revenue, kind: "money" },
    { label: "Pedidos pagos", value: cur.paidOrders, previous: prev.paidOrders, kind: "int" },
    { label: "Ticket médio", value: cur.avgTicket, previous: prev.avgTicket, kind: "money" },
    { label: "Sessões", value: cur.sessions, previous: prev.sessions, kind: "int" },
    { label: "Conversão", value: cur.conversion, previous: prev.conversion, kind: "percent" },
  ];

  return { range, kpis, smallSample: cur.sessions < MIN_SESSIONS, actions, stock, viewedNotSold: unsold };
}
