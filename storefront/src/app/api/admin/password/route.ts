import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createStaffToken } from "@/lib/admin-auth";
import { handle, json, readJson } from "@/lib/server/api";
import { UsersError, changeOwnPassword, currentAdmin } from "@/lib/server/admin-users";
import { passwordProblem } from "@/lib/server/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O usuário cadastrado troca a própria senha. As outras sessões dele caem e esta continua com um cookie novo. */
export async function POST(req: Request) {
  return handle(async () => {
    const admin = await currentAdmin();
    if (!admin) return json({ error: "Não autorizado." }, 401);
    if (!admin.uid) return json({ error: "O acesso principal troca a senha na variável ADMIN_PASSWORD da Vercel." }, 400);
    const body = await readJson(req);
    const current = typeof body.current === "string" ? body.current : "";
    const next = typeof body.next === "string" ? body.next : "";
    const problem = passwordProblem(next);
    if (problem) return json({ error: problem }, 400);
    if (next === current) return json({ error: "A nova senha precisa ser diferente da atual." }, 400);
    try {
      const user = await changeOwnPassword(admin.uid, current, next);
      const token = await createStaffToken({ uid: user.id, role: user.role, perms: user.permissions, name: user.name, sv: user.sessionVersion, mc: false });
      const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      if (token) res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_SECONDS });
      return res;
    } catch (e) {
      if (e instanceof UsersError) return json({ error: e.message }, e.status);
      throw e;
    }
  });
}
