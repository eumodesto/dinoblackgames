import { PRODUCTS, type Product } from "@/data/demo";

/**
 * Atributos usados na listagem e nos filtros. DADOS DE DEMONSTRAÇÃO: em produção
 * vêm do catálogo (ver docs/Plano_Pagina_Produto.md, seções 7 e 8).
 */

export type Condition = "novo" | "seminovo" | "raridade" | "pre-venda";

export type ListingAttrs = {
  brand: string;
  platform: string;
  type: string;
  condition: Condition;
};

export const LISTING_ATTRS: Record<string, ListingAttrs> = {
  "playstation-5-slim-1tb": { brand: "Sony", platform: "PlayStation", type: "Console", condition: "novo" },
  "nintendo-switch-oled": { brand: "Nintendo", platform: "Nintendo", type: "Console", condition: "novo" },
  "dualsense-branco": { brand: "Sony", platform: "PlayStation", type: "Acessório", condition: "seminovo" },
  "notebook-gamer-rtx4060": { brand: "Gamer", platform: "Windows", type: "Notebook", condition: "novo" },
  "pc-gamer-ryzen7": { brand: "Gamer", platform: "Windows", type: "PC completo", condition: "novo" },
  "console-retro-mini": { brand: "Retrô", platform: "Retro", type: "Console", condition: "novo" },
  "headset-gamer-7-1": { brand: "Gamer", platform: "Multiplataforma", type: "Periférico", condition: "novo" },
  "teclado-mecanico-rgb": { brand: "Gamer", platform: "Windows", type: "Periférico", condition: "novo" },
};

const FALLBACK: ListingAttrs = { brand: "DinoBlack", platform: "Multiplataforma", type: "Outros", condition: "novo" };

export function getListingAttrs(product: Product): ListingAttrs {
  return LISTING_ATTRS[product.slug] ?? FALLBACK;
}

export const CONDITION_OPTIONS: { value: Condition; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "seminovo", label: "Seminovo · unidade única" },
  { value: "raridade", label: "Raridade" },
];

export const PRICE_RANGES: { value: string; label: string; min: number; max: number }[] = [
  { value: "ate-500", label: "Até R$ 500", min: 0, max: 500 },
  { value: "500-2000", label: "R$ 500 a R$ 2.000", min: 500, max: 2000 },
  { value: "2000-5000", label: "R$ 2.000 a R$ 5.000", min: 2000, max: 5000 },
  { value: "acima-5000", label: "Acima de R$ 5.000", min: 5000, max: Infinity },
];

export const CATEGORY_TABS = ["Consoles", "PC Gamer", "Retro", "Notebooks"] as const;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const ALL_PRODUCTS = PRODUCTS;
