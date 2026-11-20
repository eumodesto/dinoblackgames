import { PERMISSIONS, ROLE_HINT, ROLE_LABEL } from "@/lib/admin-permissions";
import { handle, json, readJson, requireSuperAdmin } from "@/lib/server/api";
import { UsersError, createAdminUser, currentAdmin, listAdminUsers, usersTableReady } from "@/lib/server/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_READY = "O cadastro de usuários ainda não está disponível no banco: aplique a migração 20261124000017_admin_users.sql no Supabase.";

export const GET = () => handle(async () => {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const ready = await usersTableReady();
  return json({
    ready,
    users: ready ? await listAdminUsers() : [],
    me: guard.uid,
    sessionSecretSet: Boolean(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD),
    roles: Object.entries(ROLE_LABEL).map(([key, label]) => ({ key, label, hint: ROLE_HINT[key as keyof typeof ROLE_HINT] })),
    permissions: PERMISSIONS,
  });
});

export const POST = (req: Request) => handle(async () => {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  if (!(await usersTableReady())) return json({ error: NOT_READY }, 503);
  const admin = await currentAdmin();
  try {
    const created = await createAdminUser(await readJson(req), admin?.email ?? admin?.name ?? "acesso principal");
    return json({ user: created.user, tempPassword: created.tempPassword, email: created.email }, 201);
  } catch (e) {
    if (e instanceof UsersError) return json({ error: e.message }, e.status);
    throw e;
  }
});
