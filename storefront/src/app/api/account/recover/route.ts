import { handle, json, readJson } from "@/lib/server/api";
import { authRequest } from "@/lib/server/supabase-auth";
import { env } from "@/lib/server/env";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return json({ error: "Informe um e-mail válido." }, 400);
    await authRequest("recover", { email, redirect_to: `${env.siteUrl || "http://localhost:3110"}/minhaconta?aba=recuperar` });
    return json({ ok: true });
  });
}
