"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { TopBar } from "./TopBar";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";
import { CartButton, CartDrawer } from "./CartDrawer";
import { CategoriesNav } from "./CategoriesNav";

export function SiteHeader() {
  const { theme, ready, toggleTheme } = useTheme();
  const isDark = ready && theme === "dark";

  return (
    <header className="z-50 w-full select-none font-sans">
      <TopBar />
      <div className="relative z-40 bg-white dark:bg-[#050507]">
        <div className="relative z-40 w-full px-3 pb-3 pt-3 transition-all duration-300 lg:px-0 lg:pb-0 lg:pt-5">
          <div className="container mx-auto flex items-center gap-3 lg:gap-6">
            <Link href="/" className="shrink-0">
              <Image
                src="/brand/logo.png"
                alt="DinoBlack Games e Informática"
                width={140}
                height={56}
                className="h-10 w-auto object-contain sm:h-11 lg:h-12"
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
                className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-dino-red/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                suppressHydrationWarning
              >
                <span suppressHydrationWarning>{isDark ? "☾" : "☀"}</span>
              </button>
              <div className="hidden h-6 w-px bg-gray-200 dark:bg-zinc-700 sm:block" />
              <UserMenu />
              <CartButton />
            </div>
          </div>

          <div className="container mx-auto mt-3 lg:hidden">
            <SearchBar withCategories />
          </div>
        </div>
      </div>
      <CategoriesNav />
      <CartDrawer />
    </header>
  );
}
