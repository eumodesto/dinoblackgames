"use client";

import type { PublicTracking, TrackingEventKey } from "./tracking-config";

/**
 * Envia os eventos da loja ao GA4, Google Ads, Meta e Clarity, conforme o que está ativo no admin.
 * Respeita "Não rastrear" do navegador e nunca roda no painel. Falha em silêncio: medir não pode atrapalhar a compra.
 */
export type TrackItem = { id: string; name?: string; price?: number; quantity?: number };
export type TrackData = { value?: number; items?: TrackItem[]; term?: string; transactionId?: string; email?: string };

type Win = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  clarity?: (...args: unknown[]) => void;
  __dinoTrk?: PublicTracking;
};

const CURRENCY = "BRL";
const queue: (() => boolean)[] = [];
let timer: number | undefined;

export function setTrackingConfig(config: PublicTracking) {
  if (typeof window !== "undefined") (window as Win).__dinoTrk = config;
}

/** Os scripts de terceiros carregam depois da hidratação: tenta de novo por alguns segundos antes de desistir. */
function whenReady(task: () => boolean) {
  if (task()) return;
  queue.push(task);
  if (timer) return;
  let tries = 0;
  timer = window.setInterval(() => {
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i]()) queue.splice(i, 1);
    if (queue.length === 0 || ++tries > 40) {
      window.clearInterval(timer);
      timer = undefined;
      queue.length = 0;
    }
  }, 250);
}

const money = (value?: number) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined);

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const GA4_NAME: Record<TrackingEventKey, string> = { page_view: "page_view", view_item: "view_item", search: "search", add_to_cart: "add_to_cart", begin_checkout: "begin_checkout", add_payment_info: "add_payment_info", purchase: "purchase" };
const META_NAME: Record<TrackingEventKey, string> = { page_view: "PageView", view_item: "ViewContent", search: "Search", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", add_payment_info: "AddPaymentInfo", purchase: "Purchase" };

export function emit(event: TrackingEventKey, data: TrackData = {}) {
  if (typeof window === "undefined") return;
  const w = window as Win;
  const cfg = w.__dinoTrk;
  if (!cfg || !cfg.events[event]) return;
  if (window.location.pathname.startsWith("/admin") || navigator.doNotTrack === "1") return;
  const value = money(data.value);
  const items = (data.items ?? []).map((i) => ({ item_id: i.id, item_name: i.name, price: money(i.price), quantity: i.quantity ?? 1 }));

  if (cfg.ga4Id) {
    whenReady(() => {
      if (!w.gtag) return false;
      w.gtag("event", GA4_NAME[event], {
        ...(event === "page_view" ? { page_path: window.location.pathname, page_location: window.location.href, page_title: document.title } : {}),
        ...(event === "search" ? { search_term: data.term } : {}),
        ...(items.length ? { items } : {}),
        ...(value !== undefined ? { value, currency: CURRENCY } : {}),
        ...(data.transactionId ? { transaction_id: data.transactionId } : {}),
      });
      return true;
    });
  }

  if (cfg.adsId && (event === "add_to_cart" || event === "begin_checkout" || event === "purchase")) {
    const label = cfg.adsLabels[event];
    if (label) {
      whenReady(() => {
        const gtag = w.gtag;
        if (!gtag) return false;
        const send = () => gtag("event", "conversion", { send_to: `${cfg.adsId}/${label}`, ...(value !== undefined ? { value, currency: CURRENCY } : {}), ...(data.transactionId ? { transaction_id: data.transactionId } : {}) });
        if (event === "purchase" && cfg.adsEnhanced && data.email) {
          // As conversões otimizadas recebem o e-mail já em hash (SHA-256), nunca em texto puro.
          sha256Hex(data.email).then((hashed) => { gtag("set", "user_data", { sha256_email_address: hashed }); send(); }).catch(send);
        } else {
          send();
        }
        return true;
      });
    }
  }

  if (cfg.pixelId) {
    whenReady(() => {
      if (!w.fbq) return false;
      const params: Record<string, unknown> = {};
      if (items.length) { params.content_ids = items.map((i) => i.item_id); params.content_type = "product"; params.contents = items.map((i) => ({ id: i.item_id, quantity: i.quantity })); }
      if (value !== undefined) { params.value = value; params.currency = CURRENCY; }
      if (event === "search" && data.term) params.search_string = data.term;
      // O número do pedido é o eventID: a API de Conversões usa o mesmo e a Meta conta a compra uma única vez.
      if (data.transactionId) w.fbq("track", META_NAME[event], params, { eventID: data.transactionId });
      else w.fbq("track", META_NAME[event], params);
      return true;
    });
  }

  if (cfg.clarityId && event !== "page_view") {
    whenReady(() => {
      if (!w.clarity) return false;
      w.clarity("event", event);
      return true;
    });
  }
}
