import { json } from "@/lib/server/api";
import { checkoutReady, env, mpMode } from "@/lib/server/env";
import { getMpSettings } from "@/lib/server/mp-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O que o navegador precisa saber para montar o checkout. Nunca devolve segredos. */
export async function GET() {
  const ready = checkoutReady();
  const settings = await getMpSettings();
  return json({
    ready: ready.ok,
    db: ready.db,
    payments: ready.payments,
    shipping: ready.shipping,
    mode: mpMode(),
    publicKey: env.mpPublicKey,
    maxInstallments: settings.maxInstallments,
    methods: settings.methods,
  });
}
