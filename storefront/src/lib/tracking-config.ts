/**
 * Integrações de medição e anúncios (GA4, Google Ads, Meta e Clarity), editáveis no admin.
 * Os IDs são públicos (aparecem no código da página), mas são validados com regras estritas porque
 * entram em scripts: nada fora do formato oficial de cada serviço é aceito.
 */
export type TrackingEventKey = "page_view" | "view_item" | "search" | "add_to_cart" | "begin_checkout" | "add_payment_info" | "purchase";
export type AdsLabelKey = "purchase" | "begin_checkout" | "add_to_cart";

export const TRACKING_EVENTS: { key: TrackingEventKey; label: string; ga4: string; meta: string; ads: boolean }[] = [
  { key: "page_view", label: "Página vista", ga4: "page_view", meta: "PageView", ads: false },
  { key: "view_item", label: "Produto visto", ga4: "view_item", meta: "ViewContent", ads: false },
  { key: "search", label: "Busca na loja", ga4: "search", meta: "Search", ads: false },
  { key: "add_to_cart", label: "Adicionou ao carrinho", ga4: "add_to_cart", meta: "AddToCart", ads: true },
  { key: "begin_checkout", label: "Iniciou o checkout", ga4: "begin_checkout", meta: "InitiateCheckout", ads: true },
  { key: "add_payment_info", label: "Chegou ao pagamento", ga4: "add_payment_info", meta: "AddPaymentInfo", ads: false },
  { key: "purchase", label: "Compra concluída", ga4: "purchase", meta: "Purchase", ads: true },
];

export type TrackingSettings = {
  ga4: { enabled: boolean; measurementId: string };
  googleAds: { enabled: boolean; conversionId: string; labels: Record<AdsLabelKey, string>; enhancedConversions: boolean };
  meta: { enabled: boolean; pixelId: string; capi: boolean; testEventCode: string };
  clarity: { enabled: boolean; projectId: string };
  events: Record<TrackingEventKey, boolean>;
};

export const TRACKING_DEFAULTS: TrackingSettings = {
  ga4: { enabled: false, measurementId: "" },
  googleAds: { enabled: false, conversionId: "", labels: { purchase: "", begin_checkout: "", add_to_cart: "" }, enhancedConversions: false },
  meta: { enabled: false, pixelId: "", capi: false, testEventCode: "" },
  clarity: { enabled: false, projectId: "" },
  events: { page_view: true, view_item: true, search: true, add_to_cart: true, begin_checkout: true, add_payment_info: true, purchase: true },
};

export const RE = {
  ga4: /^G-[A-Z0-9]{6,14}$/,
  adsId: /^AW-\d{6,14}$/,
  adsLabel: /^[A-Za-z0-9_-]{6,40}$/,
  pixel: /^\d{8,20}$/,
  clarity: /^[a-z0-9]{6,14}$/i,
  testCode: /^[A-Z0-9]{4,20}$/,
} as const;

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/** Lê o que está salvo (ou veio do formulário) sem validar os IDs: formato errado vira vazio. */
export function mergeTrackingSettings(raw: unknown): TrackingSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown> | undefined>;
  const d = TRACKING_DEFAULTS;
  const ok = (value: unknown, re: RegExp) => (re.test(str(value)) ? str(value) : "");
  const labels = (r.googleAds?.labels && typeof r.googleAds.labels === "object" ? r.googleAds.labels : {}) as Record<string, unknown>;
  const ev = (r.events ?? {}) as Record<string, unknown>;
  return {
    ga4: { enabled: bool(r.ga4?.enabled, d.ga4.enabled), measurementId: ok(str(r.ga4?.measurementId).toUpperCase(), RE.ga4) },
    googleAds: {
      enabled: bool(r.googleAds?.enabled, false),
      conversionId: ok(str(r.googleAds?.conversionId).toUpperCase(), RE.adsId),
      labels: { purchase: ok(labels.purchase, RE.adsLabel), begin_checkout: ok(labels.begin_checkout, RE.adsLabel), add_to_cart: ok(labels.add_to_cart, RE.adsLabel) },
      enhancedConversions: bool(r.googleAds?.enhancedConversions, false),
    },
    meta: { enabled: bool(r.meta?.enabled, false), pixelId: ok(r.meta?.pixelId, RE.pixel), capi: bool(r.meta?.capi, false), testEventCode: ok(str(r.meta?.testEventCode).toUpperCase(), RE.testCode) },
    clarity: { enabled: bool(r.clarity?.enabled, false), projectId: ok(r.clarity?.projectId, RE.clarity) },
    events: Object.fromEntries(TRACKING_EVENTS.map((e) => [e.key, bool(ev[e.key], d.events[e.key])])) as Record<TrackingEventKey, boolean>,
  };
}

/** Validação do formulário: rejeita formato errado em vez de apagar o campo em silêncio. */
export function cleanTrackingSettings(input: unknown): { ok: true; value: TrackingSettings } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Configuração inválida." };
  const r = input as Record<string, Record<string, unknown> | undefined>;
  const checks: [string, unknown, RegExp, string][] = [
    ["ID de métricas do GA4", str(r.ga4?.measurementId).toUpperCase(), RE.ga4, "G-XXXXXXXXXX"],
    ["ID de conversão do Google Ads", str(r.googleAds?.conversionId).toUpperCase(), RE.adsId, "AW-123456789"],
    ["Rótulo de compra", (r.googleAds?.labels as Record<string, unknown> | undefined)?.purchase, RE.adsLabel, "o rótulo mostrado pelo Google Ads"],
    ["Rótulo de início de checkout", (r.googleAds?.labels as Record<string, unknown> | undefined)?.begin_checkout, RE.adsLabel, "o rótulo mostrado pelo Google Ads"],
    ["Rótulo de adicionar ao carrinho", (r.googleAds?.labels as Record<string, unknown> | undefined)?.add_to_cart, RE.adsLabel, "o rótulo mostrado pelo Google Ads"],
    ["ID do Pixel da Meta", str(r.meta?.pixelId), RE.pixel, "só números, como 123456789012345"],
    ["Código de teste da Meta", str(r.meta?.testEventCode).toUpperCase(), RE.testCode, "como TEST12345"],
    ["ID do projeto do Clarity", str(r.clarity?.projectId), RE.clarity, "letras e números, como abc1defg2h"],
  ];
  for (const [label, value, re, example] of checks) {
    const text = str(value);
    if (text && !re.test(text)) return { ok: false, error: `${label} em formato inválido (${example}).` };
  }
  const value = mergeTrackingSettings(input);
  if (value.ga4.enabled && !value.ga4.measurementId) return { ok: false, error: "Informe o ID de métricas do GA4 para ativá-lo." };
  if (value.googleAds.enabled && !value.googleAds.conversionId) return { ok: false, error: "Informe o ID de conversão do Google Ads para ativá-lo." };
  if (value.meta.enabled && !value.meta.pixelId) return { ok: false, error: "Informe o ID do Pixel da Meta para ativá-lo." };
  if (value.meta.capi && !value.meta.pixelId) return { ok: false, error: "A API de Conversões usa o mesmo ID do Pixel: informe-o." };
  if (value.clarity.enabled && !value.clarity.projectId) return { ok: false, error: "Informe o ID do projeto do Clarity para ativá-lo." };
  return { ok: true, value };
}

/** O que o navegador recebe: só as integrações realmente ativas e com ID válido. */
export type PublicTracking = {
  ga4Id: string | null;
  adsId: string | null;
  adsLabels: Record<AdsLabelKey, string>;
  adsEnhanced: boolean;
  pixelId: string | null;
  clarityId: string | null;
  events: Record<TrackingEventKey, boolean>;
};

export function toPublicTracking(s: TrackingSettings): PublicTracking {
  return {
    ga4Id: s.ga4.enabled && s.ga4.measurementId ? s.ga4.measurementId : null,
    adsId: s.googleAds.enabled && s.googleAds.conversionId ? s.googleAds.conversionId : null,
    adsLabels: s.googleAds.labels,
    adsEnhanced: s.googleAds.enhancedConversions,
    pixelId: s.meta.enabled && s.meta.pixelId ? s.meta.pixelId : null,
    clarityId: s.clarity.enabled && s.clarity.projectId ? s.clarity.projectId : null,
    events: s.events,
  };
}
