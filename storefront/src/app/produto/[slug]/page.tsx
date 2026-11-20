import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { BuyBox, type BuyBoxProduct } from "@/components/product/BuyBox";
import { ProductAbout } from "@/components/product/ProductAbout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductVideo } from "@/components/product/ProductVideo";
import { SectionNav } from "@/components/product/SectionNav";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/server/catalog";
import { WA_SELL_USED } from "@/lib/whatsapp";
import { groupParagraphs } from "@/lib/catalog-normalize";

const CONDITION_LABEL: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo · unidade única",
  raridade: "Raridade",
  pre_venda: "Pré-venda",
};

type PageProps = { params: Promise<{ slug: string }> };

// Product data is served from the runtime database. Keeping this route dynamic
// prevents a production build from requiring DATABASE_URL just to enumerate
// every SKU during `next build`.
export const dynamic = "force-dynamic";

export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado · DinoBlack Games" };
  return {
    title: `${product.name} · DinoBlack Games`,
    description: product.tagline,
    openGraph: {
      title: product.name,
      description: product.tagline,
      images: product.gallery[0] ? [product.gallery[0].src] : [],
    },
  };
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-dino-red" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function Block({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 py-10">
      <h2 className="font-display text-2xl font-black tracking-tight text-gray-900 dark:text-white md:text-3xl">{title}</h2>
      {lead && <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-zinc-400">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categorySlug);
  const isUnique = product.condition === "seminovo" || product.condition === "raridade";
  const mainImage = product.gallery[0]?.src ?? "";
  // A visão geral usa a 2ª foto (a capa já aparece na galeria); com uma foto só, repete a capa.
  const overviewImage = product.gallery[1]?.src ?? mainImage;

  const relatedCards = related.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compareAt: p.compareAt,
    badge: p.badge,
    discount: p.discount,
    image: p.image,
  }));

  const nav = [
    { id: "visao-geral", label: "Visão geral" },
    ...(product.description ? [{ id: "sobre", label: "Sobre o produto" }] : []),
    ...(product.unit ? [{ id: "laudo", label: "Laudo da unidade" }] : []),
    ...(product.specs.length > 0 ? [{ id: "especificacoes", label: "Especificações" }] : []),
    ...(product.inBox.length > 0 ? [{ id: "na-caixa", label: "O que vem na caixa" }] : []),
    { id: "entrega-garantia", label: "Entrega e garantia" },
    ...(product.faq.length > 0 ? [{ id: "perguntas", label: "Perguntas" }] : []),
    ...(relatedCards.length > 0 ? [{ id: "relacionados", label: "Relacionados" }] : []),
  ];

  const warrantyLabel = product.warrantyMonths >= 12
    ? `${product.warrantyMonths} meses`
    : `${product.warrantyMonths * 30} dias`;
  const warrantyText = product.warrantyText ?? `Garantia de ${warrantyLabel} DinoBlack.`;

  const buyBoxProduct: BuyBoxProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    condition: product.condition,
    tagline: product.tagline,
    price: product.price,
    compareAt: product.compareAt,
    discount: product.discount,
    rating: product.rating,
    soldCount: product.soldCount,
    available: product.available,
    inStock: product.inStock,
    image: mainImage,
    warrantyMonths: product.warrantyMonths,
    warrantyText: product.warrantyText,
    maxInstallments: product.maxInstallments,
    options: product.options,
    variants: product.variants,
  };


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: mainImage ? [mainImage] : [],
    description: product.tagline,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: isUnique ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="container mx-auto px-4 pb-20 pt-5 text-gray-800 dark:text-zinc-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Você está em" className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-dino-red">Início</Link></li>
          <li aria-hidden>›</li>
          {product.categoryName && (
            <>
              <li>
                <a href={`/loja?categoria=${product.categorySlug}`} className="hover:text-dino-red">
                  {product.categoryName}
                </a>
              </li>
              <li aria-hidden>›</li>
            </>
          )}
          <li aria-current="page" className="font-semibold text-gray-800 dark:text-zinc-200">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
        <div className="self-start lg:sticky lg:top-24">
          <ProductGallery
            images={product.gallery}
            badge={isUnique ? (CONDITION_LABEL[product.condition] ?? product.condition) : product.badge ? `★ ${product.badge}` : undefined}
          />
          {product.videoUrl && <ProductVideo url={product.videoUrl} title={product.name} />}
        </div>
        <BuyBox product={buyBoxProduct} />
      </div>

      <SectionNav items={nav} className="mt-10" />

      <Block id="visao-geral" title="Visão geral">
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className={`grid ${overviewImage ? "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" : ""}`}>
            <div className="flex flex-col justify-center p-6 sm:p-10">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">{product.brand}</p>
              <h3 className="mt-2 font-display text-2xl font-black leading-tight text-gray-900 sm:text-3xl dark:text-white">{product.name}</h3>
              {product.tagline && <p className="mt-3 line-clamp-4 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base dark:text-zinc-400">{product.tagline}</p>}
            </div>
            {overviewImage && (
              <div className="relative aspect-[4/3] bg-gray-50 md:aspect-auto md:min-h-[260px] dark:bg-zinc-900">
                <Image src={overviewImage} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-contain p-6" />
              </div>
            )}
          </div>
          {product.highlights.length > 0 && (
            <ul className="grid gap-3 border-t border-gray-100 p-4 sm:p-6 md:grid-cols-3 dark:border-zinc-800">
              {product.highlights.map((h) => (
                <li key={h.title} className="rounded-2xl bg-gray-50 p-5 dark:bg-zinc-900">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">{h.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{h.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Block>

      {product.description && <ProductAbout paragraphs={groupParagraphs(product.description)} />}

      {product.unit && (
        <Block
          id="laudo"
          title="Laudo da unidade"
          lead="Seminovo é uma unidade específica. Este laudo descreve o estado exato do item que você vai receber."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Condição</div>
              <div className="mt-1 font-display text-2xl font-black text-gray-900 dark:text-white">{product.unit.grade}</div>
              <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{product.unit.summary}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Marcas e observações</div>
              <ul className="mt-2 space-y-2 text-sm">
                {product.unit.knownMarks.map((m) => (
                  <li key={m} className="flex gap-2"><span aria-hidden className="text-amber-500">◆</span>{m}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">O que testamos</div>
              <ul className="mt-2 space-y-2 text-sm">
                {product.unit.tested.map((t) => (
                  <li key={t} className="flex gap-2"><Check />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Itens incluídos</div>
              <ul className="mt-2 space-y-2 text-sm">
                {product.unit.included.map((i) => (
                  <li key={i} className="flex gap-2"><Check />{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </Block>
      )}

      {product.specs.length > 0 && (
        <Block id="especificacoes" title="Especificações">
          <div className="grid gap-4 md:grid-cols-2">
            {product.specs.map((group) => (
              <div key={group.group} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="border-b border-gray-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
                  {group.group}
                </h3>
                <dl className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {group.rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-3 px-5 py-3 text-sm">
                      <dt className="text-gray-500 dark:text-zinc-400">{label}</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Block>
      )}

      {product.inBox.length > 0 && (
        <Block id="na-caixa" title="O que vem na caixa">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.inBox.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-950">
                <Check />
                {item}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block id="entrega-garantia" title="Entrega, garantia e troca">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Entrega", "Enviamos para todo o Brasil. Informe o CEP no quadro de compra para ver prazo e valor. Em Brasília, retire na loja em Santa Maria."],
            ["Garantia", warrantyText],
            ["Troca e devolução", "Se o produto não for o esperado, você tem política clara de troca e devolução, para novos e seminovos."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="font-black text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{text}</p>
            </div>
          ))}
        </div>
        <a
          href={WA_SELL_USED}
          target="_blank"
          rel="noreferrer"
          className="group relative mt-8 flex min-h-[240px] items-center overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-white transition hover:border-dino-red/70 xl:min-h-0 xl:aspect-[5.2/1]"
        >
          {/* Foto de fundo: objetos à direita; o texto fica na área escura da esquerda */}
          {/* eslint-disable-next-line @next/next/no-img-element -- arte local já otimizada (WebP 2000x384) */}
          <img src="/brand/vender-usado.webp" alt="" width={2000} height={384} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right transition duration-700 group-hover:scale-[1.03]" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/20 to-transparent max-sm:from-zinc-950/90 max-sm:via-zinc-950/70 max-sm:to-zinc-950/40" />
          <span className="relative z-10 flex max-w-lg flex-col gap-1.5 px-6 py-8 sm:px-10 xl:py-5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-dino-red">Projeto Drop</span>
            <span className="font-display text-xl font-black leading-tight sm:text-2xl">Tem um usado parado? Transforme em crédito.</span>
            <span className="text-xs text-white/70 sm:text-sm">Envie as informações e fotos pelo WhatsApp. Avaliamos e respondemos, sem promessa de valor.</span>
            <span className="mt-1.5 inline-flex w-fit items-center gap-2 rounded-full bg-dino-red px-4 py-2 text-xs font-black shadow-lg shadow-dino-red/30 transition group-hover:bg-dino-red-hover sm:text-sm">
              Vender meu usado <span aria-hidden>→</span>
            </span>
          </span>
        </a>
      </Block>

      {product.faq.length > 0 && (
        <Block id="perguntas" title="Perguntas frequentes">
          <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {product.faq.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-gray-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="text-xl text-dino-red transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{item.a}</p>
              </details>
            ))}
          </div>
        </Block>
      )}

      {relatedCards.length > 0 && (
        <section id="relacionados" className="scroll-mt-36 pt-4">
          <ProductCarousel title="Quem viu este produto também viu" products={relatedCards} />
        </section>
      )}
    </div>
  );
}
