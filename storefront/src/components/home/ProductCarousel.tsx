"use client";

import Image from "next/image";
import { useRef } from "react";
import { ChevronButton } from "@/components/ui/ChevronButton";
import { formatBRL, type ProductCard } from "@/lib/types";

type ProductCarouselProps = {
  title: string;
  products: ProductCard[];
  viewAllHref?: string;
};

export function ProductCarousel({
  title,
  products,
  viewAllHref = "/loja",
}: ProductCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: number) {
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  return (
    <section className="group/section relative mb-4 select-none px-0 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-black tracking-tight text-gray-900 dark:text-white md:text-2xl">
          {title} <span className="text-dino-red" />
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={viewAllHref}
            className="text-xs font-bold text-gray-500 transition hover:text-dino-red dark:text-zinc-400"
          >
            Ver todos
          </a>
          <div className="hidden items-center gap-2 sm:flex">
            <ChevronButton
              direction="left"
              label="Rolar para a esquerda"
              variant="surface"
              onClick={() => scrollBy(-1)}
            />
            <ChevronButton
              direction="right"
              label="Rolar para a direita"
              variant="surface"
              onClick={() => scrollBy(1)}
            />
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-none -mx-4 -mb-12 -mt-4 flex snap-x scroll-pl-4 gap-4 overflow-x-auto px-4 pb-14 pt-4"
      >
        {products.map((product) => (
          <a
            key={product.id}
            href={`/produto/${product.slug}`}
            className="group relative flex h-[375px] w-[240px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[28px] border border-zinc-800/80 bg-zinc-950 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.14)] transition-all duration-300 hover:z-10 hover:-translate-y-2 hover:border-dino-red/80 hover:shadow-[0_24px_50px_rgba(218,34,48,0.22)] sm:h-[395px] sm:w-[260px] sm:p-5 md:w-[275px]"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover opacity-75 transition duration-700 group-hover:scale-110 group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/25 transition-colors duration-500 group-hover:via-black/50" />
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-dino-red/10 blur-2xl transition-all duration-500 group-hover:bg-dino-red/20" />
            </div>

            <div className="relative z-10 flex items-center justify-between pointer-events-none">
              {product.badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-dino-red to-rose-600 px-3 py-1 text-[10px] font-black text-white shadow-lg shadow-dino-red/40 backdrop-blur-md sm:text-[11px]">
                  ★ {product.badge}
                </span>
              )}
              {product.discount != null && product.discount > 0 && (
                <span className="rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-md sm:text-[11px]">
                  −{product.discount}%
                </span>
              )}
            </div>

            <div className="relative z-10 mt-auto flex flex-col pt-20 text-left pointer-events-none">
              <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-md transition-colors group-hover:text-dino-red sm:text-base">
                {product.name}
              </h3>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-mono text-lg font-black tracking-tight text-white drop-shadow-md sm:text-xl">
                  {formatBRL(product.price)}
                </span>
                {product.compareAt != null && (
                  <span className="font-mono text-xs text-zinc-400 line-through">
                    {formatBRL(product.compareAt)}
                  </span>
                )}
              </div>
              <div className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-white text-xs font-black text-zinc-950 shadow-md transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-dino-red group-hover:to-rose-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-dino-red/40">
                <span>Explorar produto</span>
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
