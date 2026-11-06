import { json } from "@/lib/server/api";
import { checkoutReady, env, mpMode } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O que o navegador precisa saber para montar o checkout. Nunca devolve segredos. */
export async function GET() {
  const ready = checkoutReady();
  return json({
    ready: ready.ok,
    db: ready.db,
    payments: ready.payments,
    mode: mpMode(),
    publicKey: env.mpPublicKey,
    maxInstallments: 10,
  });
}
