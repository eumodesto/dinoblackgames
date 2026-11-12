import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminSessionToken, safeEqual } from "@/lib/admin-auth";

// Protege /admin: sem sessão válida, manda para a página de login.
export async function middleware(req: NextRequest) {
  const expected = await adminSessionToken();
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? "";

  if (expected && cookie && safeEqual(cookie, expected)) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
