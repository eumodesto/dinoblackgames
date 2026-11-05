import Image from "next/image";
import {
  FOOTER_ADDRESS,
  FOOTER_BRAND,
  FOOTER_COLUMNS,
  FOOTER_DESCRIPTION,
  FOOTER_MAPS_URL,
  SOCIAL_LINKS,
} from "@/data/footer";
import {
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/icons/social-icons";
import { FooterShader } from "./FooterShader";

const SOCIAL_ICONS = {
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  facebook: FacebookIcon,
} as const;

const linkClass =
  "text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:text-white focus-visible:underline";

export function SiteFooter() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#f1f3f6] antialiased transition-colors duration-300 dark:bg-[#050507]">
      {/* Nome da marca em contorno, atrás do painel */}
      <div
        aria-hidden
        className="relative z-0 flex w-full select-none justify-center pt-16 md:pt-24"
      >
        <span className="-mb-3 font-display text-[64px] font-black leading-[0.75] text-transparent opacity-60 [-webkit-text-stroke:1px_rgba(0,0,0,0.4)] sm:text-[110px] md:-mb-5 md:text-[170px] lg:text-[210px] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.3)]">
          DinoBlack
        </span>
      </div>

      <div className="relative z-10 w-full bg-dino-red text-white">
        <FooterShader />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-20">
          <div className="grid gap-12 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-16">
            {/* Marca */}
            <div className="flex flex-col">
              <Image
                src="/brand/logo.png"
                alt="DinoBlack Games e Informática"
                width={160}
                height={80}
                className="h-auto w-36 object-contain drop-shadow-lg"
              />
              <h2 className="mt-4 font-display text-xl font-black leading-tight md:text-[22px]">
                {FOOTER_BRAND}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                {FOOTER_DESCRIPTION}
              </p>

              <a
                href={FOOTER_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-start gap-3 text-sm font-medium text-white/90 transition-colors hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="underline decoration-white/40 underline-offset-4">
                  {FOOTER_ADDRESS}
                </span>
              </a>

              <div className="mt-8">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                  Redes sociais
                </div>
                <div className="flex items-center gap-3">
                  {SOCIAL_LINKS.map((social) => {
                    const Icon = SOCIAL_ICONS[social.id];
                    return (
                      <a
                        key={social.id}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={social.label}
                        className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white hover:text-dino-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Colunas de links */}
            <nav
              aria-label="Rodapé"
              className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4"
            >
              {FOOTER_COLUMNS.map((column) => (
                <div key={column.title} className="flex flex-col gap-4">
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {column.href ? (
                      <a
                        href={column.href}
                        className="transition-colors hover:text-white/80"
                      >
                        {column.title}
                      </a>
                    ) : (
                      column.title
                    )}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} className={linkClass}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-12 border-t border-white/25 pt-6 text-xs font-light text-white/80 md:text-[13px]">
            © {new Date().getFullYear()} {FOOTER_BRAND}. Todos os direitos
            reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
