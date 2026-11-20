import Image from "next/image";
import Link from "next/link";
import { getProductListings } from "@/lib/server/catalog";
import { WA_SELL_USED } from "@/lib/whatsapp";

const COLLAGE_SLUGS = ["playstation-5-slim-1tb", "notebook-gamer-rtx4060", "console-retro-mini"];
const COLLAGE_META = [
  { className: "right-[24%] top-4 h-36 w-28 -rotate-6", z: "z-10" },
  { className: "right-[5%] top-8 h-40 w-32 rotate-3", z: "z-20" },
  { className: "right-[42%] top-14 h-28 w-24 rotate-[8deg]", z: "z-0" },
] as const;

const TRUST = ["Novos e seminovos", "Garantia DinoBlack", "Envio para todo o Brasil", "Compramos seu usado"];

export async function ShopBanner() {
  const products = await getProductListings({ limit: 50 });
  const heroProduct = products.find((p) => p.slug === "playstation-5-slim-1tb") ?? products[0];
  const heroImage = heroProduct?.image ?? "";
  // Colagem: os produtos de vitrine, se existirem; senão os primeiros do catálogo que tenham foto.
  const withImage = products.filter((p) => p.image);
  const collage = COLLAGE_SLUGS.map((slug) => products.find((p) => p.slug === slug && p.image)).map(
    (found, i) => found ?? withImage.filter((p) => !COLLAGE_SLUGS.includes(p.slug))[i],
  );

  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white">
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
        {collage.map((product, i) => {
          if (!product) return null;
          const meta = COLLAGE_META[i];
          return (
            <div
              key={product.id}
              className={`absolute ${meta.z} ${meta.className} overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)]`}
            >
              {product.image && <Image src={product.image} alt="" fill sizes="130px" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide backdrop-blur">
                {product.categoryName || "Loja"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative z-30 flex min-h-[170px] max-w-2xl flex-col justify-center gap-3 p-5 sm:p-7 md:min-h-[210px] md:max-w-[52%]">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">Potência. Preço bom. Garantia.</p>
        <div>
          <h1 className="font-display text-3xl font-black leading-none sm:text-4xl">Loja</h1>
          <p className="mt-2 font-display text-base font-extrabold leading-snug sm:text-lg">
            Tudo para o seu setup, do console ao notebook. Novos e seminovos, com envio para todo o Brasil.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/loja?promocao=1"
            prefetch={false}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-dino-red px-5 text-sm font-black text-white shadow-lg shadow-dino-red/30 transition hover:bg-dino-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver promoções →
          </Link>
          <a
            href={WA_SELL_USED}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-full border border-white/30 bg-white/5 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Vender meu usado
          </a>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-white/85">
          {TRUST.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-dino-red" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
