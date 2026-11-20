import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { handle, json, requireAdminSession } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { slugify } from "@/lib/catalog-normalize";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // o limite de corpo das funções da Vercel é 4,5 MB
const BUCKET = "produtos";

/**
 * Upload de imagens de produto: reduz (máx. 1600 px), converte para WebP e grava no bucket público
 * com nome SEO `<produto>-<código>.webp`. Devolve a URL pública, as dimensões e o tamanho final.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    if (!env.supabaseUrl || !env.supabaseServiceKey) return json({ error: "Armazenamento de imagens não configurado neste ambiente." }, 503);

    const form = await req.formData();
    const productName = String(form.get("name") ?? "").trim();
    const slug = slugify(productName).slice(0, 80).replace(/-+$/, "") || "produto";
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return json({ error: "Nenhuma imagem enviada." }, 400);
    if (files.length > 10) return json({ error: "Envie até 10 imagens por vez." }, 400);

    const uploaded: { url: string; alt: string; width: number; height: number; bytes: number }[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) return json({ error: `"${file.name}" não é uma imagem.` }, 400);
      if (file.size > MAX_BYTES) return json({ error: `"${file.name}" passa de 4 MB.` }, 400);
      let out;
      try {
        out = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" })
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80, effort: 5 })
          .toBuffer({ resolveWithObject: true });
      } catch {
        return json({ error: `Não foi possível ler "${file.name}".` }, 400);
      }
      const path = `${slug}/${slug}-${randomBytes(3).toString("hex")}.webp`;
      const res = await fetch(`${env.supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.supabaseServiceKey}`, apikey: env.supabaseServiceKey, "Content-Type": "image/webp", "cache-control": "max-age=31536000" },
        body: new Uint8Array(out.data),
      });
      if (!res.ok) {
        console.error("[upload] storage:", res.status, (await res.text()).slice(0, 200));
        return json({ error: "Falha ao salvar a imagem no armazenamento." }, 502);
      }
      uploaded.push({ url: `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`, alt: productName, width: out.info.width, height: out.info.height, bytes: out.info.size });
    }
    return json({ files: uploaded });
  });
}
