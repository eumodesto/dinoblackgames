"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics-client";

/** Registra a navegação: visita, produto visto, busca e início do checkout. */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef("");
  const q = search.get("q") ?? "";

  useEffect(() => {
    const key = `${pathname}?${q}`;
    if (last.current === key) return; // evita duplicar (modo estrito do React em desenvolvimento)
    last.current = key;
    if (pathname.startsWith("/admin")) return;

    track("page_view");
    const product = /^\/produto\/([^/]+)/.exec(pathname);
    if (product) track("product_view", { slug: decodeURIComponent(product[1]) });
    if (pathname === "/loja" && q.trim()) track("search", { q: q.trim() });
    if (pathname === "/checkout") track("checkout_start");
  }, [pathname, q]);

  return null;
}
