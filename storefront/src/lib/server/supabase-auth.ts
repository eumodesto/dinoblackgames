import "server-only";
import { cookies } from "next/headers";
import { env } from "./env";

const ACCESS = "dino_sb_access";
const REFRESH = "dino_sb_refresh";

type AuthSession = { access_token?: string; refresh_token?: string; user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } };

function headers() { return { apikey: env.supabaseAnonKey, "Content-Type": "application/json" }; }

export async function authRequest(path: string, body: Record<string, unknown>) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) throw new Error("Autenticação Supabase não configurada.");
  const response = await fetch(`${env.supabaseUrl}/auth/v1/${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body), cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.msg === "string" ? data.msg : typeof data.error_description === "string" ? data.error_description : "Não foi possível concluir a operação.";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data as AuthSession & Record<string, unknown>;
}

export async function saveSession(session: AuthSession) {
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };
  if (session.access_token) jar.set(ACCESS, session.access_token, options);
  if (session.refresh_token) jar.set(REFRESH, session.refresh_token, options);
}

export async function clearSession() { const jar = await cookies(); jar.delete(ACCESS); jar.delete(REFRESH); }
export async function currentAccessToken() { return (await cookies()).get(ACCESS)?.value ?? ""; }

export async function currentUser() {
  const token = await currentAccessToken();
  if (!token || !env.supabaseUrl || !env.supabaseAnonKey) return null;
  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, { headers: { ...headers(), Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string; user_metadata?: Record<string, unknown> }>;
}
