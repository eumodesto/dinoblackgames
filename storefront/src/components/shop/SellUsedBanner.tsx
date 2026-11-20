import { WA_SELL_USED } from "@/lib/whatsapp";

const POINTS = ["Avaliação sem compromisso", "Resposta com a próxima etapa", "Sem promessa de valor"];

/** Chamada para vender usado, no mesmo visual escuro com brilho vermelho do banner da loja. */
export function SellUsedBanner() {
  return (
    <aside aria-label="Vender meu usado" className="relative isolate mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_20%,rgba(218,34,48,0.38),transparent_55%),radial-gradient(ellipse_at_0%_100%,rgba(218,34,48,0.16),transparent_50%)]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_right,transparent,black_70%)]"
      />

      <div className="flex flex-col gap-4 p-5 sm:p-7 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="max-w-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">Projeto Drop</p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight sm:text-3xl">Tem um usado parado?</h2>
          <p className="mt-2 font-display text-sm font-bold leading-snug text-white/90 sm:text-base">
            Envie as informações e fotos pelo Projeto Drop. Avaliamos e respondemos com a próxima etapa.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-white/85">
            {POINTS.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-dino-red" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12 5 5L20 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <a
          href={WA_SELL_USED}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-dino-red px-6 text-sm font-black max-md:w-full md:h-10 text-white shadow-lg shadow-dino-red/30 transition hover:bg-dino-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Vender meu usado →
        </a>
      </div>
    </aside>
  );
}
