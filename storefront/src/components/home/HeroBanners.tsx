"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatBRL, type FlashDeal, type HeroSlide } from "@/lib/types";
import { ChevronButton } from "@/components/ui/ChevronButton";

type Props = {
  slides: HeroSlide[];
  deals: FlashDeal[];
};

/**
 * Banner da home: slider à esquerda (até 10 produtos) e Flash Drop à direita (até 5), ambos escolhidos
 * no cadastro de cada produto no admin. Sem Flash Drop, o slider ocupa a largura toda (e vice-versa).
 */
export function HeroBanners({ slides, deals }: Props) {
  const [slide, setSlide] = useState(0);
  const [deal, setDeal] = useState(0);
  const current = slides[slide % Math.max(slides.length, 1)];
  const currentDeal = deals[deal % Math.max(deals.length, 1)];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!current && !currentDeal) return null;

  const layout = current && currentDeal ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]" : "";

  return (
    <section className="container mx-auto px-4 py-5">
      <div className={`grid grid-cols-1 gap-4 ${layout}`}>
        {current && (
          <div className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-zinc-950 sm:min-h-[420px]">
            {current.image && (
              <Image src={current.image} alt={current.title} fill className="object-cover opacity-70" priority />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-center p-6 sm:p-10">
              {current.eyebrow && (
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">{current.eyebrow}</p>
              )}
              <h1 className="font-display text-3xl font-black text-white sm:text-5xl">{current.title}</h1>
              {current.description && <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">{current.description}</p>}
              <a
                href={current.href}
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-dino-red px-5 py-3 text-sm font-black text-white transition hover:bg-dino-red-hover"
              >
                {current.cta} →
              </a>
            </div>
            {slides.length > 1 && (
              <>
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <ChevronButton direction="left" label="Banner anterior" size="lg" onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)} />
                </div>
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <ChevronButton direction="right" label="Próximo banner" size="lg" onClick={() => setSlide((s) => (s + 1) % slides.length)} />
                </div>
              </>
            )}
          </div>
        )}

        {currentDeal && (
          <div className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 p-4 text-white">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-sm font-black text-dino-red">🔥 FLASH DROP</div>
                <div className="text-xs text-white/70">Oferta do dia</div>
              </div>
              {currentDeal.endsAt && <Countdown key={currentDeal.id} endsAt={currentDeal.endsAt} />}
            </div>

            <a href={`/produto/${currentDeal.slug}`} className="block">
              <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900">
                {currentDeal.image && <Image src={currentDeal.image} alt={currentDeal.name} fill className="object-cover opacity-80" />}
                <div className="absolute left-3 top-3 rounded-full bg-zinc-700/80 px-2 py-1 text-[10px] font-bold">{currentDeal.flashBadge}</div>
                {currentDeal.discount != null && currentDeal.discount > 0 && (
                  <div className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-black">−{currentDeal.discount}%</div>
                )}
              </div>
              <h3 className="line-clamp-2 text-sm font-bold">{currentDeal.name}</h3>
              {(currentDeal.rating != null || (currentDeal.sold ?? 0) > 0) && (
                <div className="mt-1 text-xs text-amber-400">
                  ★★★★★{" "}
                  <span className="text-white/50">
                    {currentDeal.rating != null ? `${currentDeal.rating.toFixed(1)} ` : ""}
                    {(currentDeal.sold ?? 0) > 0 ? `(${currentDeal.sold}+ vendidos)` : ""}
                  </span>
                </div>
              )}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="font-semibold text-dino-red">
                    {(currentDeal.available ?? 0) > 0 ? `Só ${currentDeal.available} no estoque` : "Esgotado"}
                  </span>
                  {(currentDeal.available ?? 0) > 0 && (currentDeal.available ?? 0) <= 5 && <span className="text-white/40">Quase esgotando</span>}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-dino-red" style={{ width: `${currentDeal.soldPercent}%` }} />
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  {currentDeal.compareAt != null && <div className="text-xs text-white/40 line-through">{formatBRL(currentDeal.compareAt)}</div>}
                  <div className="text-2xl font-black">{formatBRL(currentDeal.price)}</div>
                </div>
                <span className="inline-flex h-10 items-center gap-1 rounded-xl bg-dino-red px-4 text-sm font-black">Pegar →</span>
              </div>
            </a>

            {deals.length > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <ChevronButton direction="left" label="Oferta anterior" onClick={() => setDeal((d) => (d - 1 + deals.length) % deals.length)} />
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
                      <span className={`block h-2 rounded-full transition-all duration-300 ${i === deal ? "w-5 bg-dino-red" : "w-2 bg-white/25 group-hover:bg-white/50"}`} />
                    </button>
                  ))}
                </div>
                <ChevronButton direction="right" label="Próxima oferta" onClick={() => setDeal((d) => (d + 1) % deals.length)} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Contagem regressiva até `endsAt` (ISO). Ao zerar, mostra 00:00:00 até a página ser recarregada. */
function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const total = now === null ? 0 : Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600) + days * 24; // acima de 24h, as horas continuam somando
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return (
    <div className="flex items-center gap-1 font-mono text-xs font-bold" suppressHydrationWarning aria-label="Tempo restante da oferta">
      <span className="rounded-md bg-zinc-800 px-1.5 py-1">{pad(h)}</span>:
      <span className="rounded-md bg-zinc-800 px-1.5 py-1">{pad(m)}</span>:
      <span className="rounded-md bg-dino-red px-1.5 py-1">{pad(s)}</span>
    </div>
  );
}
