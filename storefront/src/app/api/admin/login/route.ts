import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminSessionToken, checkAdminCredentials } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const user = String(form.get("user") ?? "");
  const pass = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/admin");
  const next = nextRaw.startsWith("/admin") ? nextRaw : "/admin";

  const token = await adminSessionToken();
  if (!token || !checkAdminCredentials(user, pass)) {
    const url = new URL("/admin-login", req.url);
    url.searchParams.set("erro", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return res;
}
