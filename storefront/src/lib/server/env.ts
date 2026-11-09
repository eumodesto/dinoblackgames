import "server-only";

/**
 * Configuração do checkout, lida só no servidor.
 *
 * MP_MODE:
 *   simulated (padrão)  nenhuma chamada ao Mercado Pago; cartão aprova, Pix e boleto ficam pendentes. Sem cobrança real.
 *   live                cria pagamentos REAIS no Mercado Pago com MP_ACCESS_TOKEN. Só ligue de propósito.
 *
 * Banco: DATABASE_URL (Postgres do Supabase) ou CHECKOUT_DB=local (Postgres em memória com o seed fictício, só para desenvolvimento).
 */
export type MpMode = "simulated" | "live";

export function mpMode(): MpMode {
  return process.env.MP_MODE === "live" ? "live" : "simulated";
}

export const env = {
  get mpAccessToken() {
    return process.env.MP_ACCESS_TOKEN ?? "";
  },
  get mpPublicKey() {
    return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";
  },
  get mpApiBase() {
    return process.env.MP_API_BASE ?? "https://api.mercadopago.com";
  },
  get mpWebhookSecret() {
    return process.env.MP_WEBHOOK_SECRET ?? "";
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get localDb() {
    return process.env.CHECKOUT_DB === "local";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get superfreteToken() {
    return process.env.SUPERFRETE_TOKEN ?? "";
  },
  get superfreteApiBase() {
    return (process.env.SUPERFRETE_API_BASE ?? "https://api.superfrete.com").replace(/\/$/, "");
  },
  get melhorEnvioToken() {
    return process.env.MELHOR_ENVIO_TOKEN ?? "";
  },
  get melhorEnvioApiBase() {
    return (process.env.MELHOR_ENVIO_API_BASE ?? "https://www.melhorenvio.com.br").replace(/\/$/, "");
  },
  /** Preferência: superfrete | melhor_envio | auto (SuperFrete primeiro, Melhor Envio se falhar). */
  get shippingProvider() {
    const v = (process.env.SHIPPING_PROVIDER ?? "auto").toLowerCase();
    if (v === "superfrete" || v === "melhor_envio") return v;
    return "auto" as const;
  },
  get shippingOriginCep() {
    return (process.env.SHIPPING_ORIGIN_CEP ?? "").replace(/\D/g, "");
  },
  get shippingUserAgent() {
    return process.env.SHIPPING_USER_AGENT ?? "DinoBlack Games (dinoblackgamesbrasil@gmail.com)";
  },
};

export function checkoutReady() {
  const db = Boolean(env.databaseUrl) || env.localDb;
  const payments = mpMode() === "simulated" || Boolean(env.mpAccessToken);
  const shipping = Boolean(env.superfreteToken || env.melhorEnvioToken);
  return { db, payments, shipping, ok: db && payments };
}
