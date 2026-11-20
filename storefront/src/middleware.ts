import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, accessOf, readSession } from "@/lib/admin-auth";
import { canAccess } from "@/lib/admin-permissions";

// Protege /admin e /api/admin: sem sessão válida vai para o login; com sessão, só entra no que o perfil permite.
const OPEN = new Set(["/api/admin/login", "/api/admin/logout"]);

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (OPEN.has(path)) return NextResponse.next();
  const isApi = path.startsWith("/api/");
  const session = await readSession(req.cookies.get(ADMIN_COOKIE)?.value);

  const deny = (status: 401 | 403, message: string, redirect: string) => {
    if (isApi) return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
    const url = req.nextUrl.clone();
    url.pathname = redirect;
    url.search = redirect === "/admin-login" ? `?next=${encodeURIComponent(path)}` : redirect === "/admin" ? "?negado=1" : "";
    return NextResponse.redirect(url);
  };

  if (!session) return deny(401, "Não autorizado.", "/admin-login");
  // Primeiro acesso com senha provisória: só a troca de senha está liberada.
  if (session.kind === "staff" && session.mc && path !== "/admin/minha-conta" && path !== "/api/admin/password") {
    return deny(403, "Troque a senha provisória para continuar.", "/admin/minha-conta");
  }
  if (!canAccess(accessOf(session), path)) return deny(403, "Seu perfil não tem acesso a esta área.", "/admin");

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
