// Sessão provisória do painel: um cookie httpOnly com HMAC derivado da
// ADMIN_PASSWORD. Trocar a senha invalida todas as sessões. Funciona no
// middleware (Edge) e nas rotas (Node), pois usa só Web Crypto.
// Substituir por login real com papéis na Fase 4.

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
