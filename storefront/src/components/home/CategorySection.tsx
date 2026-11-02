"use client";

import Image from "next/image";
import { useRef } from "react";
import { CATEGORIES } from "@/data/demo";

export function CategorySection() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: number) {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <section className="mb-8 w-full border-y border-gray-100 bg-white py-8 dark:border-zinc-800/80 dark:bg-[#050507] md:py-12">
      <div className="container mx-auto mb-6 flex items-center justify-between px-4 md:mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dino-red text-white shadow-md shadow-dino-red/30">
            ▦
          </span>
          <div>
            <h2 className="font-display text-xl font-black tracking-tight text-gray-900 dark:text-white md:text-2xl">
              Comprar por categoria
            </h2>
            <p className="hidden text-xs font-medium text-gray-400 dark:text-zinc-400 sm:block">
              Consoles, PC Gamer, Retro e Notebooks selecionados pela DinoBlack
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-dino-red hover:bg-dino-red hover:text-white dark:border-zinc-800 dark:text-zinc-400"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => scrollBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-dino-red hover:bg-dino-red hover:text-white dark:border-zinc-800 dark:text-zinc-400"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-none container mx-auto flex gap-4 overflow-x-auto px-4 pb-2"
      >
        {CATEGORIES.map((cat) => (
          <a
            key={cat.id}
            href={cat.href}
            className="group relative block aspect-[4/3] w-48 shrink-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-900 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-dino-red hover:shadow-2xl hover:z-10 sm:w-52 md:w-56 dark:border-zinc-800"
          >
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              className="object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="text-base font-black text-white">{cat.name}</div>
              <div className="mt-1 text-xs font-semibold text-white/80 transition group-hover:text-dino-red">
                Explorar coleção →
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
