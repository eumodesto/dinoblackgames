import { NextResponse, type NextRequest } from "next/server";

// Proteção provisória do painel: HTTP Basic Auth com usuário/senha das
// variáveis ADMIN_USER e ADMIN_PASSWORD. Sem a senha configurada, o painel
// fica fechado (falha segura). Substituir por login real com papéis na Fase 4.

function unauthorized(message = "Autenticação necessária") {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="DinoBlack Admin", charset="UTF-8"' },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) {
    return new NextResponse("Painel desativado: ADMIN_PASSWORD não configurada.", { status: 503 });
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(":");
  const user = sep >= 0 ? decoded.slice(0, sep) : "";
  const pass = sep >= 0 ? decoded.slice(sep + 1) : "";

  if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  return unauthorized("Usuário ou senha incorretos");
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
