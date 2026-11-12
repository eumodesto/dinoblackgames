import Image from "next/image";
import Link from "next/link";
import { getProductListings } from "@/lib/server/catalog";
import { WA_SELL_USED } from "@/lib/whatsapp";

const COLLAGE_SLUGS = ["playstation-5-slim-1tb", "notebook-gamer-rtx4060", "console-retro-mini"];
const COLLAGE_META = [
  { tag: "Novo", className: "right-[22%] top-6 h-56 w-44 -rotate-6", z: "z-10" },
  { tag: "Notebooks", className: "right-[5%] top-14 h-60 w-48 rotate-3", z: "z-20" },
  { tag: "Retro", className: "right-[40%] top-28 h-44 w-36 rotate-[8deg]", z: "z-0" },
] as const;

const TRUST = ["Novos e seminovos", "Garantia DinoBlack", "Envio para todo o Brasil", "Compramos seu usado"];

export async function ShopBanner() {
  const products = await getProductListings({ limit: 50 });
  const heroProduct = products.find((p) => p.slug === "playstation-5-slim-1tb") ?? products[0];
  const heroImage = heroProduct?.image ?? "";

  return (
    <header className="relative isolate overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 text-white">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_20%,rgba(218,34,48,0.38),transparent_55%),radial-gradient(ellipse_at_0%_100%,rgba(218,34,48,0.16),transparent_50%)]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_right,transparent,black_70%)]"
      />

      {heroImage && (
        <div aria-hidden className="absolute inset-0 -z-10 md:hidden">
          <Image src={heroImage} alt="" fill sizes="100vw" className="object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/30" />
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] md:block">
        {COLLAGE_SLUGS.map((slug, i) => {
          const product = products.find((p) => p.slug === slug);
          if (!product) return null;
          const meta = COLLAGE_META[i];
          return (
            <div
              key={slug}
              className={`absolute ${meta.z} ${meta.className} overflow-hidden rounded-3xl border border-white/15 bg-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)]`}
            >
              <Image src={product.image} alt="" fill sizes="200px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide backdrop-blur">
                {meta.tag}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative z-30 flex min-h-[300px] max-w-2xl flex-col justify-center gap-5 p-6 sm:p-10 md:min-h-[360px] md:max-w-[50%]">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">Potência. Preço bom. Garantia.</p>
        <div>
          <h1 className="font-display text-5xl font-black leading-none sm:text-6xl">Loja</h1>
          <p className="mt-3 font-display text-xl font-extrabold leading-snug sm:text-2xl">
            Tudo para o seu setup, do console ao notebook. Novos e seminovos, com envio para todo o Brasil.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/loja?promocao=1"
            prefetch={false}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-dino-red px-6 text-sm font-black text-white shadow-lg shadow-dino-red/30 transition hover:bg-dino-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver promoções →
          </Link>
          <a
            href={WA_SELL_USED}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center rounded-full border border-white/30 bg-white/5 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Vender meu usado
          </a>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/85">
          {TRUST.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-dino-red" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m5 12 5 5L20 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
