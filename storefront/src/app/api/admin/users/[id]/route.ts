import { handle, json, readJson, requireSuperAdmin } from "@/lib/server/api";
import { UsersError, updateAdminUser, usersTableReady } from "@/lib/server/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Muda nome, perfil, permissões, ativação ou redefine a senha (gera uma nova provisória e avisa por e-mail). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireSuperAdmin();
    if ("response" in guard) return guard.response;
    if (!(await usersTableReady())) return json({ error: "Cadastro de usuários indisponível: aplique a migração do Supabase." }, 503);
    const { id } = await params;
    try {
      const result = await updateAdminUser(id, await readJson(req), guard.uid);
      return json({ user: result.user, tempPassword: result.tempPassword ?? null, email: result.email });
    } catch (e) {
      if (e instanceof UsersError) return json({ error: e.message }, e.status);
      throw e;
    }
  });
}
