"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { SunIcon, type SunIconHandle } from "@/components/icons/sun-icon";
import {
  SunMoonIcon,
  type SunMoonIconHandle,
} from "@/components/icons/sun-moon-icon";
import { TopBar } from "./TopBar";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";
import { CartButton, CartDrawer } from "./CartDrawer";
import { CategoriesNav } from "./CategoriesNav";

export function SiteHeader() {
  const { theme, ready, toggleTheme } = useTheme();
  const isDark = ready && theme === "dark";
  const sunRef = useRef<SunIconHandle>(null);
  const sunMoonRef = useRef<SunMoonIconHandle>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);

  // O sentinela fica logo acima da barra principal. Quando ele sai da tela, a
  // barra "encaixou" no topo. Observar um elemento fora da barra evita o
  // efeito de pisca que uma mudança de altura causaria.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setDocked(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // O <header> usa display: contents para que a barra principal seja filha direta do
  // layout da página (alto), condição para o position: sticky valer na rolagem toda.
  return (
    <header role="banner" className="contents select-none font-sans">
      <TopBar />
      <div ref={sentinelRef} aria-hidden className="-mb-px h-px" />

      <div
        className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-300 dark:bg-[#050507] ${
          docked
            ? "dock-in shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_12px_24px_-14px_rgba(0,0,0,0.45)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08),0_12px_24px_-14px_rgba(0,0,0,0.95)]"
            : ""
        }`}
      >
        <div className="w-full px-3 pb-3 pt-3 lg:px-0 lg:pb-0 lg:pt-5">
          <div className="container mx-auto flex items-center gap-3 lg:gap-6">
            <Link href="/" className="shrink-0">
              <Image
                src="/brand/logo.png"
                alt="DinoBlack Games e Informática"
                width={140}
                height={56}
                className={`h-10 w-auto origin-left object-contain transition-transform duration-300 sm:h-11 lg:h-12 ${
                  docked ? "scale-90" : "scale-100"
                }`}
                priority
              />
            </Link>

            <div className="hidden flex-1 lg:block">
              <SearchBar />
            </div>

            <div className="ml-auto flex items-center gap-2 lg:gap-3">
              <button
                type="button"
                aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                onClick={toggleTheme}
                onMouseEnter={() => {
                  sunRef.current?.startAnimation();
                  sunMoonRef.current?.startAnimation();
                }}
                onMouseLeave={() => {
                  sunRef.current?.stopAnimation();
                  sunMoonRef.current?.stopAnimation();
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-dino-red/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                suppressHydrationWarning
              >
                {/* Escuro: sol (volta ao claro). Claro: sol e lua (vai ao escuro). */}
                {isDark ? (
                  <SunIcon ref={sunRef} size={18} />
                ) : (
                  <SunMoonIcon ref={sunMoonRef} size={18} />
                )}
              </button>
              <div className="hidden h-6 w-px bg-gray-200 dark:bg-zinc-700 sm:block" />
              <UserMenu />
              <CartButton />
            </div>
          </div>
        </div>
      </div>

      {/* No celular a busca fica abaixo da barra fixa e rola com a página. */}
      <div className="relative z-40 bg-white px-3 pb-3 dark:bg-[#050507] lg:hidden">
        <div className="container mx-auto">
          <SearchBar withCategories />
        </div>
      </div>

      <CategoriesNav />
      <CartDrawer />
    </header>
  );
}
