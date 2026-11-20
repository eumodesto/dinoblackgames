"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronButton } from "@/components/ui/ChevronButton";
type GalleryImage = { src: string; alt: string; position?: string };

export function ProductGallery({ images, badge }: { images: GalleryImage[]; badge?: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLUListElement>(null);
  const current = images[index];
  const total = images.length;

  // Mantém a miniatura ativa visível no slider.
  useEffect(() => {
    const el = strip.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  // Produto cadastrado sem imagem: mostra um espaço reservado em vez de quebrar a página.
  if (!current) {
    return (
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 text-sm font-semibold text-zinc-500 lg:aspect-square xl:aspect-[4/3]">
        {badge && <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-dino-red to-rose-600 px-3 py-1 text-[11px] font-black text-white">{badge}</span>}
        Sem imagem
      </div>
    );
  }

  const go = (dir: number) => setIndex((i) => (i + dir + total) % total);
  const scrollStrip = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: "smooth" });

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="flex flex-col gap-3" onKeyDown={onKey}>
      {/* Fotos de produto vêm em fundo claro: a imagem inteira aparece (sem cortes) sobre um fundo neutro. */}
      <div
        className="group relative aspect-square overflow-hidden rounded-[28px] border border-gray-200 bg-white sm:aspect-[4/3] lg:aspect-square xl:aspect-[4/3] dark:border-zinc-800"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          key={current.src + index}
          src={current.src}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-contain p-4 transition-transform duration-300 ease-out sm:p-6"
          style={{
            objectPosition: current.position ?? "center",
            transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
            transform: zoom ? "scale(1.8)" : "scale(1)",
          }}
        />

        {badge && (
          <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-dino-red to-rose-600 px-3 py-1 text-[11px] font-black text-white shadow-lg shadow-dino-red/40">
            {badge}
          </span>
        )}

        {total > 1 && (
          <>
            <div className="absolute inset-y-0 left-3 flex items-center">
              <ChevronButton direction="left" label="Foto anterior" onClick={() => go(-1)} />
            </div>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <ChevronButton direction="right" label="Próxima foto" onClick={() => go(1)} />
            </div>
            <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 font-mono text-xs font-bold text-white backdrop-blur">
              {index + 1} / {total}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="relative">
          <ul
            ref={strip}
            aria-label="Fotos do produto"
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img, i) => (
              <li key={`${img.src}-${i}`} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ver foto ${i + 1}: ${img.alt}`}
                  aria-current={i === index}
                  className={`relative block h-20 w-20 overflow-hidden rounded-2xl border-2 bg-white transition sm:h-24 sm:w-24 ${
                    i === index
                      ? "border-dino-red"
                      : "border-gray-200 opacity-75 hover:border-gray-400 hover:opacity-100 dark:border-zinc-800"
                  }`}
                >
                  <Image src={img.src} alt="" fill sizes="96px" className="object-contain p-1.5" />
                </button>
              </li>
            ))}
          </ul>
          {total > 4 && (
            <>
              <button type="button" aria-label="Rolar fotos para a esquerda" onClick={() => scrollStrip(-1)} className="absolute left-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-dino-red hover:text-white sm:grid">‹</button>
              <button type="button" aria-label="Rolar fotos para a direita" onClick={() => scrollStrip(1)} className="absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-dino-red hover:text-white sm:grid">›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
