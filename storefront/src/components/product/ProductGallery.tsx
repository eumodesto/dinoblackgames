"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronButton } from "@/components/ui/ChevronButton";
import type { GalleryImage } from "@/data/product-details";

export function ProductGallery({ images, badge }: { images: GalleryImage[]; badge?: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const current = images[index];
  const total = images.length;

  const go = (dir: number) => setIndex((i) => (i + dir + total) % total);

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
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 lg:aspect-square xl:aspect-[4/3]"
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
          className="object-cover transition-transform duration-300 ease-out"
          style={{
            objectPosition: current.position ?? "center",
            transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
            transform: zoom ? "scale(1.8)" : "scale(1)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

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
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Fotos do produto">
          {images.map((img, i) => (
            <li key={`${img.src}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}: ${img.alt}`}
                aria-current={i === index}
                className={`relative block aspect-square w-full overflow-hidden rounded-2xl border-2 bg-zinc-950 transition ${
                  i === index
                    ? "border-dino-red"
                    : "border-zinc-800 opacity-70 hover:border-zinc-600 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                  style={{ objectPosition: img.position ?? "center" }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
