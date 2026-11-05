import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SectionNav } from "@/components/product/SectionNav";
import { PRODUCTS } from "@/data/demo";
import {
  CONDITION_LABEL,
  getProductBySlug,
  getProductDetail,
  getRelatedProducts,
} from "@/data/product-details";
import { WA_SELL_USED } from "@/lib/whatsapp";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado · DinoBlack Games" };
  const detail = getProductDetail(product);
  return {
    title: `${product.name} · DinoBlack Games`,
    description: detail.tagline,
    openGraph: { title: product.name, description: detail.tagline, images: [product.image] },
    // Dados de demonstração: não indexar até o catálogo real alimentar a página.
    robots: { index: false, follow: false },
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
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const detail = getProductDetail(product);
  const related = getRelatedProducts(product);
  const isUnique = detail.condition === "seminovo";

  const nav = [
    { id: "visao-geral", label: "Visão geral" },
    ...(detail.unit ? [{ id: "laudo", label: "Laudo da unidade" }] : []),
    { id: "especificacoes", label: "Especificações" },
    { id: "na-caixa", label: "Na caixa" },
    { id: "entrega-garantia", label: "Entrega e garantia" },
    { id: "perguntas", label: "Perguntas" },
    { id: "relacionados", label: "Relacionados" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.image],
    description: detail.tagline,
    sku: detail.sku,
    brand: { "@type": "Brand", name: detail.brand },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      availability: product.stockLeft === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
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
          <li>
            <a href={`/loja?categoria=${product.category.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-dino-red">
              {product.category}
            </a>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="font-semibold text-gray-800 dark:text-zinc-200">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
        <div className="self-start lg:sticky lg:top-24">
          <ProductGallery
            images={detail.gallery}
            badge={isUnique ? CONDITION_LABEL.seminovo : product.badge ? `★ ${product.badge}` : undefined}
          />
        </div>
        <BuyBox product={product} detail={detail} />
      </div>

      {/* Sem wrapper: o sticky só funciona dentro de um pai mais alto que ele. */}
      <SectionNav items={nav} className="mt-10" />

      <Block id="visao-geral" title="Visão geral">
        <div className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 text-white">
          <Image src={product.image} alt="" fill sizes="100vw" className="object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="relative z-10 p-6 sm:p-10">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">{detail.brand}</p>
            <p className="mt-3 max-w-xl font-display text-2xl font-black leading-tight sm:text-4xl">{detail.tagline}</p>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {detail.highlights.map((h) => (
                <li key={h.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <h3 className="text-base font-black">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{h.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Block>

      {detail.unit && (
        <Block
          id="laudo"
          title="Laudo da unidade"
          lead="Seminovo é uma unidade específica. Este laudo descreve o estado exato do item que você vai receber."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Condição</div>
              <div className="mt-1 font-display text-2xl font-black text-gray-900 dark:text-white">{detail.unit.grade}</div>
              <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{detail.unit.summary}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Marcas e observações</div>
              <ul className="mt-2 space-y-2 text-sm">
                {detail.unit.knownMarks.map((m) => (
                  <li key={m} className="flex gap-2"><span aria-hidden className="text-amber-500">◆</span>{m}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">O que testamos</div>
              <ul className="mt-2 space-y-2 text-sm">
                {detail.unit.tested.map((t) => (
                  <li key={t} className="flex gap-2"><Check />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Itens incluídos</div>
              <ul className="mt-2 space-y-2 text-sm">
                {detail.unit.included.map((i) => (
                  <li key={i} className="flex gap-2"><Check />{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </Block>
      )}

      <Block id="especificacoes" title="Especificações">
        <div className="grid gap-4 md:grid-cols-2">
          {detail.specs.map((group) => (
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

      <Block id="na-caixa" title="O que vem na caixa">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detail.inBox.map((item) => (
            <li key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-950">
              <Check />
              {item}
            </li>
          ))}
        </ul>
      </Block>

      <Block id="entrega-garantia" title="Entrega, garantia e troca">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Entrega", "Enviamos para todo o Brasil. Informe o CEP no quadro de compra para ver prazo e valor. Em Brasília, retire na loja em Santa Maria."],
            ["Garantia", detail.warranty.text],
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
          className="mt-4 flex flex-col gap-1 rounded-2xl border border-dino-red/40 bg-dino-red/10 p-5 transition hover:border-dino-red sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <span className="block font-black text-gray-900 dark:text-white">Tem um usado parado?</span>
            <span className="block text-sm text-gray-600 dark:text-zinc-400">
              Envie as informações e fotos pelo Projeto Drop. Avaliamos e respondemos com a próxima etapa, sem promessa de valor.
            </span>
          </span>
          <span className="mt-2 text-sm font-black text-dino-red sm:mt-0">Vender meu usado →</span>
        </a>
      </Block>

      <Block id="perguntas" title="Perguntas frequentes">
        <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {detail.faq.map((item) => (
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

      <section id="relacionados" className="scroll-mt-36 pt-4">
        <ProductCarousel title="Quem viu este produto também viu" products={related} />
      </section>

      <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
        Modelo de página de produto. Fotos, especificações, prazos e garantia são dados de demonstração e serão
        substituídos pelo catálogo real.
      </p>
    </div>
  );
}
