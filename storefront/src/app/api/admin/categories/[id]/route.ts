import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "-"); }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { return handle(async () => { const unauthorized = await requireAdminSession(); if (unauthorized) return unauthorized; const { id } = await params; const body = await readJson(req); const fields: Array<[string, unknown, string]> = [["name", text(body.name), ""], ["slug", slugify(text(body.slug) || text(body.name)), ""], ["position", Number(body.position) || 0, ""], ["image_url", text(body.imageUrl) || null, ""], ["seo_title", text(body.seoTitle) || null, ""], ["seo_description", text(body.seoDescription) || null, ""], ["is_active", Boolean(body.isActive), "::boolean"]]; const sql = await getSql(); for (const [column, value, cast] of fields) { if (value === "") continue; await sql.query(`update categories set ${column} = $1${cast} where id = $2::uuid`, [value, id]); }
    if (body.parentId !== undefined) {
      const parentId = text(body.parentId);
      if (parentId) {
        if (parentId === id) return json({ error: "Uma categoria não pode ser mãe de si mesma." }, 400);
        const [loop] = await sql.query<{ n: number }>("with recursive branch as (select id from categories where id = $1::uuid union all select c.id from categories c join branch b on c.parent_id = b.id) select count(*)::int as n from branch where id = $2::uuid", [id, parentId]);
        if (Number(loop?.n ?? 0) > 0) return json({ error: "A categoria-mãe não pode ser uma subcategoria desta mesma categoria." }, 400);
      }
      await sql.query("update categories set parent_id = nullif($1, '')::uuid where id = $2::uuid", [parentId, id]);
    } return json({ ok: true }); }); }

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) { return handle(async () => { const unauthorized = await requireAdminSession(); if (unauthorized) return unauthorized; const { id } = await params; const sql = await getSql(); const [used] = await sql.query<{ n: number }>("select count(*)::int as n from products where category_id = $1::uuid", [id]); if (Number(used?.n ?? 0) > 0) return json({ error: "A categoria possui produtos. Desative-a em vez de excluir." }, 409); await sql.query("delete from categories where id = $1::uuid", [id]); return json({ ok: true }); }); }
