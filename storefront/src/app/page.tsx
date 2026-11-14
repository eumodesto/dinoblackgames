import { CategorySection } from "@/components/home/CategorySection";
import { HeroBanners } from "@/components/home/HeroBanners";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { getBanners, getCategories, getProductListings } from "@/lib/server/catalog";

// Lê o catálogo do banco em tempo de execução. Sem isto o Next tenta pré-renderizar a página
// durante `next build`, quando não há banco (a Vercel não tem DATABASE_URL no build).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [banners, categories, featured, onSale] = await Promise.all([
    getBanners("home_hero"),
    getCategories(),
    getProductListings({ limit: 12 }),
    getProductListings({ promocao: true, limit: 12 }),
  ]);

  const deals = onSale.slice(0, 6).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compareAt: p.compareAt,
    badge: p.badge,
    discount: p.discount,
    image: p.image,
    rating: p.rating,
    sold: p.soldCount,
    available: p.available,
  }));

  const toCard = (p: (typeof featured)[number]) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compareAt: p.compareAt,
    badge: p.badge,
    discount: p.discount,
    image: p.image,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f3f6] transition-colors duration-300 dark:bg-[#050507]">
      <HeroBanners slides={banners} deals={deals} />
      <CategorySection categories={categories} />
      <section className="container mx-auto space-y-6 px-4 py-4">
        <div>
          <ProductCarousel
            title="Produtos em Destaques"
            products={featured.map(toCard)}
            viewAllHref="/loja"
          />
        </div>
        <div>
          <ProductCarousel
            title="Produtos em Promoção"
            products={onSale.map(toCard)}
            viewAllHref="/loja?promocao=1"
          />
        </div>
      </section>
    </div>
  );
}
