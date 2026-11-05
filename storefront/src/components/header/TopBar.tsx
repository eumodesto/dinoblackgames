import { WHATSAPP_DISPLAY, waLink } from "@/lib/whatsapp";
import {
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/icons/social-icons";
import { SellUsedLink } from "./SellUsedLink";

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
