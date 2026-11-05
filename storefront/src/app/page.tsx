import { CategorySection } from "@/components/home/CategorySection";
import { HeroBanners } from "@/components/home/HeroBanners";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { PRODUCTS } from "@/data/demo";

export default function HomePage() {
  const latest = PRODUCTS;
  const onSale = PRODUCTS.filter((product) => product.discount);

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f3f6] transition-colors duration-300 dark:bg-[#050507]">
      <HeroBanners />
      <CategorySection />
      <section className="container mx-auto space-y-6 px-4 py-4">
        <div>
          <ProductCarousel
            title="Produtos em Destaques"
            products={latest}
            viewAllHref="/loja"
          />
        </div>
        <div>
          <ProductCarousel
            title="Produtos em Promoção"
            products={onSale}
            viewAllHref="/loja?promocao=1"
          />
        </div>
      </section>
    </div>
  );
}
