export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt?: number | null;
  badge?: string | null;
  discount?: number | null;
  image: string;
  category?: string;
  rating?: number | null;
  sold?: number;
  available?: number;
};

export type CategoryCard = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  href: string;
};

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  image: string;
};

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
