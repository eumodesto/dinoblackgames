import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { MAX_IMPORT_BYTES } from "@/lib/product-csv";
import { applyImport, previewImport, templateCsv } from "@/lib/server/product-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Modelo em CSV (cabeçalho + exemplos). */
export const GET = () => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  return new Response(await templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao-produtos.csv"',
      "Cache-Control": "no-store",
    },
  });
});

/**
 * `mode: "preview"` valida o arquivo e mostra o que mudaria, sem gravar nada.
 * `mode: "apply"` valida de novo no servidor e grava só os produtos sem erro.
 */
export const POST = (req: Request) => handle(async () => {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const body = await readJson(req);
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) return json({ error: "Arquivo vazio." }, 400);
  if (csv.length > MAX_IMPORT_BYTES * 2) return json({ error: "Arquivo grande demais." }, 413);
  if (body.mode === "apply") {
    const { result, analysis } = await applyImport(csv);
    return json({ ok: true, result, counts: analysis.counts });
  }
  return json(await previewImport(csv));
});
