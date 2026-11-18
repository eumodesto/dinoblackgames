import { handle, json, readJson } from "@/lib/server/api";
import { authRequest, saveSession } from "@/lib/server/supabase-auth";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const session = await authRequest("token?grant_type=password", { email: String(body.email ?? "").trim().toLowerCase(), password: String(body.password ?? "") });
    await saveSession(session);
    return json({ ok: true, user: session.user ? { id: session.user.id, email: session.user.email } : null });
  });
}
