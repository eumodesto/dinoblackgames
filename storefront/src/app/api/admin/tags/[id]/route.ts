import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { return handle(async () => { const unauthorized = await requireAdminSession(); if (unauthorized) return unauthorized; const { id } = await params; const body = await readJson(req); const sql = await getSql(); await sql.query("update tags set name = coalesce($1, name), slug = coalesce($2, slug), color = $3, is_active = $4::boolean, updated_at = now() where id = $5::uuid", [text(body.name) || null, text(body.slug) ? slugify(text(body.slug)) : null, text(body.color) || null, Boolean(body.isActive), id]); return json({ ok: true }); }); }

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) { return handle(async () => { const unauthorized = await requireAdminSession(); if (unauthorized) return unauthorized; const { id } = await params; const sql = await getSql(); await sql.query("delete from tags where id = $1::uuid", [id]); return json({ ok: true }); }); }
