"use client";

import { useEffect, useRef, useState } from "react";
import { UserIcon, type UserIconHandle } from "@/components/icons/user-icon";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const userIconRef = useRef<UserIconHandle>(null);
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
        <span className="hidden sm:inline">Cliente DinoBlack</span>
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
          <div className="flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-dino-red text-sm font-black text-white">
              DB
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">
                Cliente DinoBlack
              </div>
              <div className="text-xs text-gray-500">(61) 99292-6551</div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-zinc-800">
            <a
              href="/conta"
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <span aria-hidden>👤</span> Configurações da conta
            </a>
            <a
              href="/pedidos"
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <span aria-hidden>🛍</span> Meus pedidos
            </a>
          </div>
          <div className="border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <span aria-hidden>↪</span> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
