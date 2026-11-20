import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminSessionToken, checkAdminCredentials, createStaffToken } from "@/lib/admin-auth";
import { authenticateStaff } from "@/lib/server/admin-users";

export const runtime = "nodejs";

// Freio simples contra tentativa de senha em sequência (por IP + usuário). Vale por instância do servidor.
const attempts = new Map<string, { n: number; until: number }>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60_000;

function blocked(key: string) {
  const a = attempts.get(key);
  return Boolean(a && a.n >= MAX_ATTEMPTS && a.until > Date.now());
}
function fail(key: string) {
  const a = attempts.get(key);
  attempts.set(key, a && a.until > Date.now() ? { n: a.n + 1, until: a.until } : { n: 1, until: Date.now() + WINDOW_MS });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const user = String(form.get("user") ?? "").trim();
  const pass = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/admin");
  const next = nextRaw.startsWith("/admin") ? nextRaw : "/admin";
  const key = `${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}|${user.toLowerCase()}`;

  const back = (reason = "1") => {
    const url = new URL("/admin-login", req.url);
    url.searchParams.set("erro", reason);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  };
  if (blocked(key)) return back("2");

  let token: string | null = null;
  let target = next;
  const root = await adminSessionToken();
  if (root && checkAdminCredentials(user, pass)) {
    token = root; // acesso principal (ADMIN_USER / ADMIN_PASSWORD)
  } else {
    const staff = await authenticateStaff(user, pass).catch(() => null);
    if (staff) {
      token = await createStaffToken({ uid: staff.id, role: staff.role, perms: staff.permissions, name: staff.name, sv: staff.sessionVersion, mc: staff.mustChangePassword });
      if (staff.mustChangePassword) target = "/admin/minha-conta";
    }
  }
  if (!token) {
    fail(key);
    return back();
  }
  attempts.delete(key);

  const res = NextResponse.redirect(new URL(target, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_SECONDS });
  return res;
}
