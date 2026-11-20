import { handle, requireAdminSession } from "@/lib/server/api";
import { exportProductsCsv } from "@/lib/server/product-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Baixa todos os produtos (qualquer status) em CSV, no mesmo formato aceito pela importação. */
export const GET = () => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const { csv } = await exportProductsCsv();
  const stamp = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produtos-dinoblack-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
