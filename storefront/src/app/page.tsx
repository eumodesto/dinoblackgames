import { CategorySection } from "@/components/home/CategorySection";
import { HeroBanners } from "@/components/home/HeroBanners";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { PRODUCTS } from "@/data/demo";

export default function HomePage() {
  const latest = PRODUCTS;
  const flagship = PRODUCTS.filter(
    (product) =>
      product.category === "Consoles" || product.badge === "Flagship",
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f3f6] transition-colors duration-300 dark:bg-[#050507]">
      <HeroBanners />
      <CategorySection />
      <section className="container mx-auto space-y-6 px-4 py-4">
        <div>
          <ProductCarousel
            title="Lançamentos e destaques"
            products={latest}
            viewAllHref="/loja"
          />
        </div>
        <div>
          <ProductCarousel
            title="Consoles em destaque"
            products={flagship}
            viewAllHref="/loja?categoria=consoles"
          />
        </div>
      </section>
    </div>
  );
}
