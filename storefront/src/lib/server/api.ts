import "server-only";
import { NextResponse } from "next/server";
import { CheckoutError } from "./checkout";
import { DbNotConfiguredError } from "./sql";

export const noStore = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

/** Padroniza erros das rotas: mensagem segura para o cliente, detalhes só no log do servidor. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CheckoutError) return json({ error: e.message }, e.status);
    if (e instanceof DbNotConfiguredError) {
      return json({ error: "O checkout ainda não está ativo neste ambiente.", code: "not_configured" }, 503);
    }
    console.error("[api] erro inesperado:", e instanceof Error ? e.stack ?? e.message : e);
    return json({ error: "Erro inesperado. Tente novamente em instantes." }, 500);
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    throw new CheckoutError("Requisição inválida.");
  }
}
