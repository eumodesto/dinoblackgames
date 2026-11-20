"use client";

/**
 * Eventos próprios da jornada do cliente. Sem cookies: o id de sessão é aleatório, vive no
 * localStorage e vira outro depois de 30 minutos parado. Nenhum dado pessoal é enviado.
 */

import { emit } from "./tracking-client";

export type TrackEvent = "page_view" | "product_view" | "add_to_cart" | "checkout_start" | "shipping_quoted" | "payment_created" | "search" | "stock_out_view" | "coupon_applied";

const KEY = "dino-session";
const IDLE_MS = 30 * 60 * 1000;

type Session = { id: string; last: number; src: string };

function newId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sourceOfVisit(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    if (utm) return utm.toLowerCase().slice(0, 60);
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname.replace(/^www\./, "")) return host.slice(0, 60);
    }
  } catch { /* referrer inválido */ }
  return "direto";
}

function session(): Session | null {
  try {
    const now = Date.now();
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Session | null;
    const current = saved && now - saved.last < IDLE_MS ? { ...saved, last: now } : { id: newId(), last: now, src: sourceOfVisit() };
    localStorage.setItem(KEY, JSON.stringify(current));
    return current;
  } catch {
    return null; // navegação privada/sem armazenamento: simplesmente não rastreia
  }
}

/** Os mesmos eventos vão também às integrações ativas no admin (GA4, Google Ads, Meta, Clarity). */
function forwardToPlatforms(event: TrackEvent, data: { slug?: string; q?: string; value?: number }) {
  const items = data.slug ? [{ id: data.slug }] : undefined;
  switch (event) {
    case "page_view": return emit("page_view");
    case "product_view": return emit("view_item", { items });
    case "search": return emit("search", { term: data.q });
    case "add_to_cart": return emit("add_to_cart", { value: data.value, items });
    case "checkout_start": return emit("begin_checkout", { value: data.value });
    case "payment_created": return emit("add_payment_info", { value: data.value });
  }
}

export function track(event: TrackEvent, data: { slug?: string; q?: string; value?: number } = {}) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin") || navigator.doNotTrack === "1") return;
  forwardToPlatforms(event, data);
  const s = session();
  if (!s) return;
  const payload = JSON.stringify({ event, sid: s.id, src: s.src, path: window.location.pathname, ...data });
  try {
    // text/plain evita a requisição prévia de CORS; o servidor lê como texto.
    if (!navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "text/plain" }))) {
      void fetch("/api/track", { method: "POST", body: payload, keepalive: true });
    }
  } catch { /* rastreamento nunca atrapalha a navegação */ }
}
