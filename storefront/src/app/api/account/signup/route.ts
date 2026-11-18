import { handle, json, readJson } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";
import { authRequest, saveSession } from "@/lib/server/supabase-auth";
import { sendTransactionalEmail } from "@/lib/server/email";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!name || !email || password.length < 8) return json({ error: "Informe nome, e-mail e uma senha de pelo menos 8 caracteres." }, 400);
    const session = await authRequest("signup", { email, password, data: { full_name: name, phone } });
    if (session.user?.id) {
      const sql = await getSql();
      await sql.query("update profiles set full_name = $1, phone = $2 where id = $3::uuid", [name, phone || null, session.user.id]);
      if (body.marketing === true) await sql.query("insert into consents (user_id, email, channel, purpose, granted, source) values ($1::uuid, $2, 'email'::consent_channel, 'marketing'::consent_purpose, true, 'cadastro')", [session.user.id, email]);
      // O cadastro não deve falhar se o provedor de e-mail estiver pendente ou indisponível.
      void sendTransactionalEmail({ to: email, template: "account_created", variables: { name } }).catch((error) => {
        console.error("[account] cadastro criado, mas e-mail de boas-vindas não foi enviado:", error instanceof Error ? error.message : error);
      });
    }
    await saveSession(session);
    return json({ ok: true, needsConfirmation: !session.access_token, email });
  });
}
