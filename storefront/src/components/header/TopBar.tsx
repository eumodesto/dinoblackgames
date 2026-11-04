import { WHATSAPP_DISPLAY, waLink } from "@/lib/whatsapp";
import { SellUsedLink } from "./SellUsedLink";

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.8 15.5v-7l6.2 3.5-6.2 3.5Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M19.6 8.4a6.7 6.7 0 0 1-3.9-1.2v7.1a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.8a2.9 2.9 0 1 0 2 2.8V2.5h2.8a3.9 3.9 0 0 0 3.9 3.9v2Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1Z" />
    </svg>
  );
}

export function TopBar() {
  return (
    <div className="hidden border-b border-gray-100 bg-gray-50 py-2 text-gray-500 dark:border-zinc-800/80 dark:bg-[#050507] dark:text-zinc-400 lg:block">
      <div className="container mx-auto flex items-center justify-between px-4 text-[11px] font-medium">
        <div className="flex items-center gap-4">
          <a href="/sobre" className="transition hover:text-dino-red">
            Sobre nós
          </a>
          <span className="h-3 w-px bg-gray-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2.5">
            <a
              href="https://www.youtube.com/@DinoBlackGames"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube DinoBlack Games"
              className="transition hover:text-dino-red"
            >
              <YouTubeIcon />
            </a>
            <a
              href="https://www.tiktok.com/@dinoblack.games"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok DinoBlack Games"
              className="transition hover:text-dino-red"
            >
              <TikTokIcon />
            </a>
            <a
              href="https://www.facebook.com/dinoblackgames"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook DinoBlack Games"
              className="transition hover:text-dino-red"
            >
              <FacebookIcon />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={waLink()}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-gray-700 transition hover:text-dino-red dark:text-zinc-200"
          >
            {WHATSAPP_DISPLAY}
          </a>
          <SellUsedLink />
        </div>
      </div>
    </div>
  );
}
