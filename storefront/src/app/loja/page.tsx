import type { Metadata } from "next";
import Link from "next/link";
import { FilterPanel } from "@/components/shop/FilterPanel";
import { MobileFilters } from "@/components/shop/MobileFilters";
import { ShopBanner } from "@/components/shop/ShopBanner";
import { PageSizeSelect } from "@/components/shop/PageSizeSelect";
import { Pagination } from "@/components/shop/Pagination";
import { SellUsedBanner } from "@/components/shop/SellUsedBanner";
import { ShopProductCard } from "@/components/shop/ProductCard";
import { SortSelect } from "@/components/shop/SortSelect";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { getShop, parseShopState } from "@/lib/shop";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Loja · DinoBlack Games",
  description: "Consoles, PC Gamer, Retro e Notebooks. Produtos novos e seminovos com garantia e envio para todo o Brasil.",
  // Catálogo de demonstração: não indexar até os produtos reais entrarem.
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Lê o catálogo do banco em tempo de execução. Sem isto o Next tenta pré-renderizar a página
// durante `next build`, quando não há banco (a Vercel não tem DATABASE_URL no build).
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: PageProps) {
  const state = parseShopState(await searchParams);
  const shop = await getShop(state);
  const activeCount = shop.chips.length;

  const filters = (
    <FilterPanel facets={shop.facets} promo={shop.promo} clearHref={shop.clearHref} activeCount={activeCount} />
  );

  return (
    <div className="container mx-auto px-4 pb-20 pt-5 text-gray-800 dark:text-zinc-200">
      <nav aria-label="Você está em" className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-dino-red">Início</Link></li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="font-semibold text-gray-800 dark:text-zinc-200">Loja</li>
        </ol>
      </nav>

      <ShopBanner />

      {/* Abas de categoria fixas sob o cabeçalho, no mesmo vidro da navegação do produto. */}
      <nav aria-label="Categorias" className="sticky top-16 z-40 mt-4 py-2 lg:top-[68px]">
        <div className="relative mx-auto max-w-fit overflow-hidden rounded-full border border-white/70 bg-gradient-to-b from-white/85 via-white/55 to-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.04),0_10px_34px_-8px_rgba(15,23,42,0.22)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 max-sm:max-w-full dark:border-white/10 dark:from-white/[0.14] dark:via-white/[0.07] dark:to-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_34px_-8px_rgba(0,0,0,0.7)] dark:ring-white/5">
          <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-b-[40%] bg-gradient-to-b from-white/70 to-transparent dark:from-white/15" />
          <ul className="scrollbar-none relative flex gap-1 overflow-x-auto p-1.5">
            {shop.categoryTabs.map((tab) => (
              <li key={tab.label} className="shrink-0">
                <Link
                  href={tab.href}
                  prefetch={false}
                  scroll={false}
                  aria-current={tab.active ? "true" : undefined}
                  className={`relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${
                    tab.active
                      ? "bg-gradient-to-b from-[#ff5360] to-dino-red text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_16px_-2px_rgba(218,34,48,0.55)]"
                      : "text-gray-700 hover:bg-white/70 hover:text-gray-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  {tab.active && <span aria-hidden className="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-b-full bg-gradient-to-b from-white/45 to-transparent" />}
                  <span className="relative">{tab.label}</span>
                  <span className={`relative font-mono text-xs ${tab.active ? "text-white/80" : "text-gray-500 dark:text-zinc-500"}`}>{tab.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="scrollbar-none sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            {filters}
          </div>
        </aside>

        <section aria-label="Produtos">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-zinc-400" aria-live="polite">
              <strong className="text-gray-900 dark:text-white">{shop.total}</strong>{" "}
              {shop.total === 1 ? "produto encontrado" : "produtos encontrados"}
              {shop.totalPages > 1 && <span> · página {shop.pagina} de {shop.totalPages}</span>}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters activeCount={activeCount} total={shop.total}>
                {filters}
              </MobileFilters>
              <SortSelect options={shop.sortOptions} value={state.ordem} />
              <PageSizeSelect options={shop.pageSizes} value={shop.pageSize} />
            </div>
          </div>

          {shop.chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
              {shop.chips.map((chip) => (
                <li key={chip.key}>
                  <Link
                    href={chip.href}
                    prefetch={false}
                    scroll={false}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full bg-dino-red/10 px-3 text-xs font-bold text-gray-900 transition hover:bg-dino-red/20 dark:text-white"
                  >
                    {chip.label}
                    <span aria-hidden className="text-dino-red">✕</span>
                    <span className="sr-only">Remover filtro</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={shop.clearHref} prefetch={false} scroll={false} className="text-xs font-bold text-dino-red hover:underline">
                  Limpar tudo
                </Link>
              </li>
            </ul>
          )}

          {shop.total > 0 ? (
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {shop.items.map((product, i) => (
                <li key={product.id}>
                  <ShopProductCard product={product} priority={i < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-[28px] border border-dashed border-gray-300 p-8 text-center dark:border-zinc-700 sm:p-12">
              <p className="font-display text-2xl font-black text-gray-900 dark:text-white">Nenhum produto encontrado</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-zinc-400">
                Nenhum item combina com os filtros escolhidos. Remova algum filtro ou fale com a gente: se não temos, podemos buscar para você.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={shop.clearHref}
                  prefetch={false}
                  className="inline-flex h-12 items-center rounded-2xl bg-dino-red px-6 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-dino-red/30 hover:bg-dino-red-hover"
                >
                  Limpar filtros
                </Link>
                <a
                  href={waLink(`Olá! Procurei na loja${state.q ? ` por "${state.q}"` : ""} e não encontrei. Podem me ajudar?`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-[#25D366] px-6 text-sm font-black text-[#052e16] hover:bg-[#1fbd5b]"
                >
                  <WhatsAppIcon className="h-6 w-6" />
                  Pedir no WhatsApp
                </a>
              </div>
            </div>
          )}

          <Pagination current={shop.pagina} total={shop.totalPages} links={shop.pageLinks} />

          <SellUsedBanner />

          <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
            Catálogo DinoBlack Games. Preços e disponibilidade sujeitos a alteração sem aviso.
          </p>
        </section>
      </div>
    </div>
  );
}
