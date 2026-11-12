"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatBRL, type ProductCard, type HeroSlide } from "@/lib/types";
import { ChevronButton } from "@/components/ui/ChevronButton";

type Props = {
  slides: HeroSlide[];
  deals: ProductCard[];
};

export function HeroBanners({ slides, deals }: Props) {
  const [slide, setSlide] = useState(0);
  const [deal, setDeal] = useState(0);
  const current = slides[slide];
  const currentDeal = deals[deal] ?? deals[0];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!current || !currentDeal) return null;

  return (
    <section className="container mx-auto px-4 py-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-zinc-950 sm:min-h-[420px]">
          <Image
            src={current.image}
            alt={current.title}
            fill
            className="object-cover opacity-70"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-center p-6 sm:p-10">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">
              {current.eyebrow}
            </p>
            <h1 className="font-display text-3xl font-black text-white sm:text-5xl">
              {current.title}
            </h1>
            <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">
              {current.description}
            </p>
            <a
              href={current.href}
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-dino-red px-5 py-3 text-sm font-black text-white transition hover:bg-dino-red-hover"
            >
              {current.cta} →
            </a>
          </div>
          <div className="absolute inset-y-0 left-3 flex items-center">
            <ChevronButton
              direction="left"
              label="Banner anterior"
              size="lg"
              onClick={() =>
                setSlide((s) => (s - 1 + slides.length) % slides.length)
              }
            />
          </div>
          <div className="absolute inset-y-0 right-3 flex items-center">
            <ChevronButton
              direction="right"
              label="Próximo banner"
              size="lg"
              onClick={() => setSlide((s) => (s + 1) % slides.length)}
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 p-4 text-white">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1 text-sm font-black text-dino-red">
                🔥 FLASH DROP
              </div>
              <div className="text-xs text-white/70">Oferta do dia</div>
            </div>
            <Countdown />
          </div>

          <a href={`/produto/${currentDeal.slug}`} className="block">
            <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900">
              <Image
                src={currentDeal.image}
                alt={currentDeal.name}
                fill
                className="object-cover opacity-80"
              />
              <div className="absolute left-3 top-3 rounded-full bg-zinc-700/80 px-2 py-1 text-[10px] font-bold">
                Oferta exclusiva
              </div>
              {currentDeal.discount != null && currentDeal.discount > 0 && (
                <div className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-black">
                  −{currentDeal.discount}%
                </div>
              )}
            </div>
            <h3 className="line-clamp-2 text-sm font-bold">{currentDeal.name}</h3>
            <div className="mt-1 text-xs text-amber-400">
              ★★★★★{" "}
              <span className="text-white/50">
                {currentDeal.rating ?? 4.9} ({currentDeal.sold ?? 40}+ vendidos)
              </span>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="font-semibold text-dino-red">
                  Só {currentDeal.available ?? 3} no estoque
                </span>
                <span className="text-white/40">Quase esgotando</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[78%] rounded-full bg-dino-red" />
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                {currentDeal.compareAt != null && (
                  <div className="text-xs text-white/40 line-through">
                    {formatBRL(currentDeal.compareAt)}
                  </div>
                )}
                <div className="text-2xl font-black">
                  {formatBRL(currentDeal.price)}
                </div>
              </div>
              <span className="inline-flex h-10 items-center gap-1 rounded-xl bg-dino-red px-4 text-sm font-black">
                Pegar →
              </span>
            </div>
          </a>

          <div className="mt-4 flex items-center justify-between gap-2">
            <ChevronButton
              direction="left"
              label="Oferta anterior"
              onClick={() => setDeal((d) => (d - 1 + deals.length) % deals.length)}
            />
            <div className="flex items-center">
              {deals.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Ir para oferta ${i + 1}`}
                  aria-current={i === deal}
                  onClick={() => setDeal(i)}
                  className="group grid h-6 place-items-center px-1"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      i === deal
                        ? "w-5 bg-dino-red"
                        : "w-2 bg-white/25 group-hover:bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>
            <ChevronButton
              direction="right"
              label="Próxima oferta"
              onClick={() => setDeal((d) => (d + 1) % deals.length)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Countdown() {
  const initial = { h: 5, m: 42, s: 19 };
  const [left, setLeft] = useState(initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = window.setInterval(() => {
      setLeft((prev) => {
        let { h, m, s } = prev;
        if (s > 0) s -= 1;
        else if (m > 0) {
          m -= 1;
          s = 59;
        } else if (h > 0) {
          h -= 1;
          m = 59;
          s = 59;
        }
        return { h, m, s };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const value = mounted ? left : initial;

  return (
    <div
      className="flex items-center gap-1 font-mono text-xs font-bold"
      suppressHydrationWarning
    >
      <span className="rounded-md bg-zinc-800 px-1.5 py-1">{pad(value.h)}</span>:
      <span className="rounded-md bg-zinc-800 px-1.5 py-1">{pad(value.m)}</span>:
      <span className="rounded-md bg-dino-red px-1.5 py-1">{pad(value.s)}</span>
    </div>
  );
}
