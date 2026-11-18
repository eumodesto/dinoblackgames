import { handle, json } from "@/lib/server/api";
import { clearSession, currentAccessToken } from "@/lib/server/supabase-auth";
import { env } from "@/lib/server/env";

export async function POST() {
  return handle(async () => {
    const token = await currentAccessToken();
    if (token && env.supabaseUrl) await fetch(`${env.supabaseUrl}/auth/v1/logout`, { method: "POST", headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${token}` } }).catch(() => undefined);
    await clearSession();
    return json({ ok: true });
  });
}
