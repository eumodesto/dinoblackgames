// Sessão provisória do painel: um cookie httpOnly com HMAC derivado da
// ADMIN_PASSWORD. Trocar a senha invalida todas as sessões. Funciona no
// middleware (Edge) e nas rotas (Node), pois usa só Web Crypto.
// Substituir por login real com papéis na Fase 4.

import { isPermission, isRole, type Access, type AdminRole, type Permission } from "./admin-permissions";

export const ADMIN_COOKIE = "dino_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7;

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function adminSessionToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const user = process.env.ADMIN_USER || "admin";
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`dinoblack-admin-v1:${user}`));
  return toHex(sig);
}

// ---------------------------------------------------------------------------
// Sessão dos usuários cadastrados (Super Admin e Gerente de Loja)
// ---------------------------------------------------------------------------
// Cookie "s1.<dados em base64url>.<assinatura HMAC>". Os dados levam o usuário, o perfil e as permissões;
// "sv" é a versão da sessão: quando o cadastro muda (perfil, permissões, senha, desativação), a versão sobe
// e as sessões antigas deixam de valer (conferido no servidor em requireAdminSession e no layout do painel).

export type StaffSession = { uid: string; role: AdminRole; perms: Permission[]; name: string; sv: number; exp: number };
export type AdminSession = { kind: "root" } | ({ kind: "staff" } & StaffSession);

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signStaff(data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`dinoblack-staff-v1:${sessionSecret()}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

export async function createStaffToken(session: Omit<StaffSession, "exp">, seconds = ADMIN_SESSION_SECONDS): Promise<string | null> {
  if (!sessionSecret()) return null;
  const payload: StaffSession = { ...session, exp: Math.floor(Date.now() / 1000) + seconds };
  const data = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `s1.${data}.${await signStaff(data)}`;
}

/** Quem está logado: o acesso raiz (ADMIN_USER), um usuário cadastrado ou ninguém. Não consulta o banco. */
export async function readSession(cookie: string | undefined | null): Promise<AdminSession | null> {
  if (!cookie) return null;
  const root = await adminSessionToken();
  if (root && safeEqual(cookie, root)) return { kind: "root" };
  const [tag, data, sig] = cookie.split(".");
  if (tag !== "s1" || !data || !sig || !sessionSecret()) return null;
  if (!safeEqual(sig, await signStaff(data))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(fromBase64Url(data))) as StaffSession;
    if (!p.uid || !isRole(p.role) || !Array.isArray(p.perms) || typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return { kind: "staff", ...p, perms: p.perms.filter(isPermission) };
  } catch {
    return null;
  }
}

export function accessOf(session: AdminSession): Access {
  return session.kind === "root" || session.role === "super_admin" ? "all" : session.perms;
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkAdminCredentials(user: string, pass: string) {
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) return false;
  const expectedUser = process.env.ADMIN_USER || "admin";
  return safeEqual(user.trim(), expectedUser) && safeEqual(pass, expectedPass);
}
