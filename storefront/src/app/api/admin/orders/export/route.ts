import { getOrders } from "@/lib/server/catalog";
import { requireAdminSession } from "@/lib/server/api";

export const dynamic = "force-dynamic";

function first(value: string | null) {
  return value?.trim() || undefined;
}

/** Evita que valores vindos do banco sejam interpretados como fórmulas ao abrir no Excel. */
function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const orders = await getOrders({
    query: first(url.searchParams.get("q")),
    status: first(url.searchParams.get("status")),
    paymentStatus: first(url.searchParams.get("payment")),
    carrier: first(url.searchParams.get("carrier")),
    from: first(url.searchParams.get("from")),
    to: first(url.searchParams.get("to")),
    limit: 100,
    offset: 0,
  });

  const header = ["Pedido", "Cliente", "E-mail", "Total", "Itens", "Data", "Status"];
  const rows = orders.map((order) => [
    order.number,
    order.customerName,
    order.customerEmail,
    order.total.toFixed(2).replace(".", ","),
    order.itemCount,
    new Date(order.placedAt).toLocaleString("pt-BR"),
    order.status,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
