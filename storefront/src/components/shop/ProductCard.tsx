import Image from "next/image";
import Link from "next/link";
import { formatBRL } from "@/lib/types";
import type { ShopItem } from "@/lib/shop";

const MAX_INSTALLMENTS = 10;

function installmentValue(price: number) {
  return Math.ceil((price / MAX_INSTALLMENTS) * 100) / 100;
}

export function ShopProductCard({ product, priority = false }: { product: ShopItem; priority?: boolean }) {
  const isUnique = product.condition === "seminovo" || product.condition === "raridade";
  const lowStock = product.stockLeft != null && product.stockLeft > 0;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-[24px] border border-zinc-800/80 bg-zinc-950 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.14)] transition-all duration-300 hover:-translate-y-1.5 hover:border-dino-red/80 hover:shadow-[0_24px_50px_rgba(218,34,48,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dino-red sm:rounded-[28px] sm:p-4"
    >
      <div className="absolute inset-0 z-0">
        <Image
          src={product.image}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
          className="object-cover opacity-75 transition duration-700 group-hover:scale-110 group-hover:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/25 transition-colors duration-500 group-hover:via-black/50" />
      </div>

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${
            isUnique ? "bg-amber-400 text-zinc-950" : "bg-black/60 text-white backdrop-blur"
          }`}
        >
          <span aria-hidden>{isUnique ? "◆" : "●"}</span>
          {isUnique ? "Seminovo" : "Novo"}
        </span>
        {product.discount != null && product.discount > 0 && (
          <span className="rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-2.5 py-1 text-[10px] font-black text-white shadow-md sm:text-[11px]">
            −{product.discount}%
          </span>
        )}
      </div>

      <div className="pointer-events-none relative z-10 mt-auto flex flex-col text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{product.category}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-md transition-colors group-hover:text-dino-red sm:text-base">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-base font-black tracking-tight text-white sm:text-xl">
            {formatBRL(product.price)}
          </span>
          {product.compareAt != null && (
            <span className="font-mono text-[11px] text-zinc-400 line-through">{formatBRL(product.compareAt)}</span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-white/75">
          ou {MAX_INSTALLMENTS}x de {formatBRL(installmentValue(product.price))} sem juros
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-dino-red">
            {isUnique ? "Unidade única" : lowStock ? `Só ${product.stockLeft} no estoque` : "Em estoque"}
          </span>
          <span className="text-xs font-black text-white transition-transform duration-300 group-hover:translate-x-0.5">
            Ver produto →
          </span>
        </div>
      </div>
    </Link>
  );
}
