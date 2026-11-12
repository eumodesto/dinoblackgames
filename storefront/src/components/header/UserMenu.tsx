"use client";

import { useEffect, useRef, useState } from "react";
import { UserIcon, type UserIconHandle } from "@/components/icons/user-icon";
import {
  PackageCheckIcon,
  type PackageCheckIconHandle,
} from "@/components/icons/package-check-icon";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const userIconRef = useRef<UserIconHandle>(null);
  const ordersIconRef = useRef<PackageCheckIconHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Conta do usuário"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => userIconRef.current?.startAnimation()}
        onMouseLeave={() => userIconRef.current?.stopAnimation()}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-dino-red/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <UserIcon ref={userIconRef} size={16} />
        <span className="hidden sm:inline">Entrar</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-4">
            <div className="font-bold text-gray-900 dark:text-white">Olá, visitante</div>
            <div className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
              Entre para acompanhar seus pedidos.
            </div>
            <a
              href="/minhaconta"
              className="mb-2 flex h-10 items-center justify-center rounded-xl bg-dino-red text-sm font-bold text-white transition hover:bg-dino-red-hover"
            >
              Entrar
            </a>
            <a
              href="/minhaconta?aba=criar"
              className="flex h-10 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-800 transition hover:border-dino-red/40 dark:border-zinc-700 dark:text-zinc-100"
            >
              Criar conta
            </a>
          </div>
          <div className="border-t border-gray-100 dark:border-zinc-800">
            <a
              href="/minhaconta"
              onMouseEnter={() => ordersIconRef.current?.startAnimation()}
              onMouseLeave={() => ordersIconRef.current?.stopAnimation()}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <PackageCheckIcon ref={ordersIconRef} size={16} aria-hidden />
              Meus pedidos
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
