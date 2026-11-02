"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { STORIES, formatBRL, type StoryItem } from "@/data/demo";

export function StoriesBar() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      <section className="container mx-auto px-4 pb-0 pt-3">
        <div className="group/bar relative w-full select-none py-2">
          <div className="scrollbar-none flex items-center gap-4 overflow-x-auto scroll-smooth px-1 py-1 sm:gap-6">
            {STORIES.map((story, index) => (
              <button
                key={story.id}
                type="button"
                onClick={() => setActive(index)}
                className="flex w-[72px] shrink-0 flex-col items-center gap-2 sm:w-[84px]"
              >
                <span className="relative grid place-items-center rounded-full bg-gradient-to-tr from-dino-red via-rose-500 to-amber-400 p-[2.5px]">
                  <span className="rounded-full bg-white p-[2px] dark:bg-[#050507]">
                    <span className="relative block h-14 w-14 overflow-hidden rounded-full sm:h-16 sm:w-16">
                      <Image
                        src={story.avatar}
                        alt={story.label}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </span>
                  </span>
                  {story.badge && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-dino-red px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow">
                      {story.badge}
                    </span>
                  )}
                </span>
                <span className="line-clamp-1 text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                  {story.badge ? `${story.badge} ` : ""}
                  {story.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {active !== null && (
        <StoryViewer
          stories={STORIES}
          index={active}
          onClose={() => setActive(null)}
          onChange={setActive}
        />
      )}
    </>
  );
}

function StoryViewer({
  stories,
  index,
  onClose,
  onChange,
}: {
  stories: StoryItem[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const story = stories[index];
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((k) => k + 1);
    const timer = window.setTimeout(() => {
      if (index < stories.length - 1) onChange(index + 1);
      else onClose();
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [index, stories.length, onChange, onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-0 sm:p-6">
      <div className="relative h-full w-full max-w-md overflow-hidden bg-zinc-950 sm:h-[85vh] sm:rounded-3xl">
        <Image
          src={story.media}
          alt={story.label}
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

        <div className="absolute inset-x-0 top-0 z-10 space-y-3 p-3">
          <div className="flex gap-1">
            {stories.map((item, i) => (
              <div
                key={item.id}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  key={`${item.id}-${key}-${i === index}`}
                  className={`h-full bg-white ${
                    i < index
                      ? "w-full"
                      : i === index
                        ? "story-progress-fill"
                        : "w-0"
                  }`}
                  style={i === index ? { animationDuration: "5.5s" } : undefined}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <span className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-dino-red">
                <Image src={story.avatar} alt="" fill className="object-cover" />
              </span>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  {story.label}
                  {story.badge && (
                    <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-black">
                      {story.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/70">{story.timeAgo}</div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar stories"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-4">
          <p className="text-sm font-medium text-white">{story.caption}</p>
          <a
            href={`/produto/${story.product.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-black/45 p-3 backdrop-blur-md"
          >
            <span className="relative h-12 w-12 overflow-hidden rounded-xl">
              <Image
                src={story.product.image}
                alt={story.product.name}
                fill
                className="object-cover"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {story.product.name}
              </span>
              <span className="text-sm font-black text-dino-red">
                {formatBRL(story.product.price)}
                {story.product.compareAt && (
                  <span className="ml-2 text-xs font-medium text-white/50 line-through">
                    {formatBRL(story.product.compareAt)}
                  </span>
                )}
              </span>
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-dino-red text-white">
              →
            </span>
          </a>
          <a
            href={`/produto/${story.product.slug}`}
            className="flex h-12 items-center justify-center rounded-2xl bg-dino-red text-sm font-black text-white"
          >
            Pedir o seu →
          </a>
        </div>

        <button
          type="button"
          aria-label="Anterior"
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={() => onChange(Math.max(0, index - 1))}
        />
        <button
          type="button"
          aria-label="Próximo"
          className="absolute inset-y-0 right-0 w-1/3"
          onClick={() =>
            onChange(Math.min(stories.length - 1, index + 1))
          }
        />
      </div>
    </div>
  );
}
