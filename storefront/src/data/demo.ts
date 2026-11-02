export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  badge?: string;
  discount?: number;
  image: string;
  category: string;
  rating?: number;
  sold?: number;
  stockLeft?: number;
};

export type CategoryCard = {
  id: string;
  name: string;
  href: string;
  image: string;
};

export type StoryItem = {
  id: string;
  label: string;
  badge?: "HOT" | "NEW" | "VERIFIED";
  avatar: string;
  media: string;
  caption: string;
  product: Product;
  timeAgo: string;
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

export const CATEGORIES: CategoryCard[] = [
  {
    id: "consoles",
    name: "Consoles",
    href: "/loja?categoria=consoles",
    image:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "pc-gamer",
    name: "PC Gamer",
    href: "/loja?categoria=pc-gamer",
    image:
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "retro",
    name: "Retro",
    href: "/loja?categoria=retro",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "notebooks",
    name: "Notebooks",
    href: "/loja?categoria=notebooks",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "playstation-5-slim-1tb",
    name: "PlayStation 5 Slim · 1 TB",
    price: 3899,
    compareAt: 4299,
    badge: "Flagship",
    discount: 9,
    image:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80",
    category: "Consoles",
    rating: 4.9,
    sold: 120,
    stockLeft: 3,
  },
  {
    id: "2",
    slug: "nintendo-switch-oled",
    name: "Nintendo Switch OLED",
    price: 2149.9,
    compareAt: 2399,
    badge: "Flagship",
    discount: 10,
    image:
      "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80",
    category: "Consoles",
    rating: 4.8,
    sold: 86,
    stockLeft: 5,
  },
  {
    id: "3",
    slug: "dualsense-branco",
    name: "Controle DualSense · Branco",
    price: 449,
    badge: "Premium Gear",
    image:
      "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80",
    category: "Consoles",
  },
  {
    id: "4",
    slug: "notebook-gamer-rtx4060",
    name: "Notebook Gamer RTX 4060 · 16GB",
    price: 5799,
    compareAt: 6499,
    badge: "Flagship",
    discount: 11,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    category: "Notebooks",
  },
  {
    id: "5",
    slug: "pc-gamer-ryzen7",
    name: "PC Gamer Ryzen 7 · RTX 4070",
    price: 7499,
    badge: "Premium Gear",
    image:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80",
    category: "PC Gamer",
  },
  {
    id: "6",
    slug: "console-retro-mini",
    name: "Console Retrô Mini · 10.000 jogos",
    price: 329,
    compareAt: 399,
    badge: "Premium Gear",
    discount: 18,
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
    category: "Retro",
  },
  {
    id: "7",
    slug: "headset-gamer-7-1",
    name: "Headset Gamer 7.1 Surround",
    price: 399,
    compareAt: 499,
    badge: "Premium Gear",
    discount: 20,
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80",
    category: "PC Gamer",
  },
  {
    id: "8",
    slug: "teclado-mecanico-rgb",
    name: "Teclado Mecânico RGB Switch Red",
    price: 349,
    compareAt: 429,
    badge: "Premium Gear",
    discount: 19,
    image:
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80",
    category: "PC Gamer",
  },
];

export const STORIES: StoryItem[] = [
  {
    id: "unboxing",
    label: "Unboxing",
    badge: "HOT",
    avatar:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=200&q=80",
    media:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80",
    caption: "Primeiras impressões do PlayStation 5 Slim na DinoBlack!",
    product: PRODUCTS[0],
    timeAgo: "1h",
  },
  {
    id: "flash",
    label: "Flash Sale",
    badge: "HOT",
    avatar:
      "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=200&q=80",
    media:
      "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1200&q=80",
    caption: "Switch OLED com frete rápido — estoque limitado.",
    product: PRODUCTS[1],
    timeAgo: "3h",
  },
  {
    id: "audio",
    label: "Top Audio",
    badge: "NEW",
    avatar:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=200&q=80",
    media:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80",
    caption: "Headset gamer com som 7.1 para setup competitivo.",
    product: PRODUCTS[6],
    timeAgo: "5h",
  },
  {
    id: "pro-gear",
    label: "Pro Gear",
    avatar:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80",
    media:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
    caption: "Notebook gamer RTX 4060 pronto para AAA em alto FPS.",
    product: PRODUCTS[3],
    timeAgo: "8h",
  },
  {
    id: "guarantees",
    label: "Garantias",
    badge: "VERIFIED",
    avatar:
      "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=200&q=80",
    media:
      "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=80",
    caption: "Seminovos com garantia e fotos reais da unidade.",
    product: PRODUCTS[2],
    timeAgo: "1d",
  },
];

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "ps5",
    eyebrow: "POTÊNCIA. VELOCIDADE. NEXT GEN.",
    title: "PlayStation 5 Slim",
    description:
      "SSD ultrarrápido, DualSense e catálogo exclusivo para uma experiência de console sem igual.",
    cta: "Explorar agora",
    href: "/produto/playstation-5-slim-1tb",
    image:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "notebook",
    eyebrow: "PERFORMANCE PARA JOGO E CRIAÇÃO",
    title: "Notebook Gamer RTX 4060",
    description:
      "Tela de alto refresh, 16 GB de RAM e placa dedicada para AAA e streaming.",
    cta: "Explorar agora",
    href: "/produto/notebook-gamer-rtx4060",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "switch",
    eyebrow: "JOGUE EM CASA OU NA RUA",
    title: "Nintendo Switch OLED",
    description:
      "Tela OLED vibrante, dock inclusa e biblioteca completa de exclusivos Nintendo.",
    cta: "Explorar agora",
    href: "/produto/nintendo-switch-oled",
    image:
      "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1400&q=80",
  },
];

export const TRENDING_SEARCHES = [
  "PlayStation 5",
  "Switch OLED",
  "Notebook Gamer",
  "DualSense",
  "PC Gamer",
  "Retro",
];

export const POPULAR_SEARCH_CATEGORIES = [
  "Consoles",
  "Nintendo",
  "PlayStation",
  "PC Gamer",
  "Notebooks",
  "Retro",
];

export const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Loja", href: "/loja" },
  { label: "Sobre", href: "/sobre" },
  { label: "Contato", href: "/contato" },
];

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
