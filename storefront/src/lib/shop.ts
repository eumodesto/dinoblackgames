import "server-only";
import {
  getProductListings,
  getCategories,
  getFacetValues,
  type ProductListing,
  type ShopFilters,
} from "@/lib/server/catalog";

export type SortKey = "relevancia" | "menor-preco" | "maior-preco" | "maior-desconto" | "mais-vendidos";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "maior-desconto", label: "Maior desconto" },
  { value: "mais-vendidos", label: "Mais vendidos" },
];

export const CONDITION_OPTIONS: { value: string; label: string }[] = [
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

export type FacetId = "condicao" | "plataforma" | "tipo" | "preco";

export type ShopState = {
  q: string;
  categoria?: string;
  condicao: string[];
  plataforma: string[];
  tipo: string[];
  preco: string[];
  promocao: boolean;
  ordem: SortKey;
};

export const EMPTY_STATE: ShopState = {
  q: "",
  condicao: [],
  plataforma: [],
  tipo: [],
  preco: [],
  promocao: false,
  ordem: "relevancia",
};

type RawParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseShopState(sp: RawParams): ShopState {
  const state: ShopState = { ...EMPTY_STATE, condicao: [], plataforma: [], tipo: [], preco: [] };

  state.q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";

  const categoria = list(sp.categoria)[0];
  if (categoria) state.categoria = categoria;

  state.condicao = list(sp.condicao).filter((v) => CONDITION_OPTIONS.some((o) => o.value === v));
  state.plataforma = list(sp.plataforma);
  state.tipo = list(sp.tipo);
  state.preco = list(sp.preco).filter((v) => PRICE_RANGES.some((r) => r.value === v));
  state.promocao = list(sp.promocao)[0] === "1";

  const ordem = list(sp.ordem)[0] as SortKey | undefined;
  if (ordem && SORT_OPTIONS.some((o) => o.value === ordem)) state.ordem = ordem;

  return state;
}

export function toQuery(state: ShopState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.categoria) params.set("categoria", state.categoria);
  if (state.condicao.length) params.set("condicao", state.condicao.join(","));
  if (state.plataforma.length) params.set("plataforma", state.plataforma.join(","));
  if (state.tipo.length) params.set("tipo", state.tipo.join(","));
  if (state.preco.length) params.set("preco", state.preco.join(","));
  if (state.promocao) params.set("promocao", "1");
  if (state.ordem !== "relevancia") params.set("ordem", state.ordem);
  const qs = params.toString();
  return qs ? `/loja?${qs}` : "/loja";
}

export type FacetOptionView = {
  value: string;
  label: string;
  count: number;
  selected: boolean;
  href: string;
};

export type FacetView = { id: FacetId | "promocao"; title: string; options: FacetOptionView[] };

export type ActiveChip = { key: string; label: string; href: string };

function toggled(state: ShopState, id: FacetId, value: string): ShopState {
  const current = state[id];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...state, [id]: next };
}

function buildFacets(state: ShopState, items: ProductListing[], allItems: ProductListing[], facetValues: { platforms: string[]; types: string[]; conditions: string[] }): FacetView[] {
  const countFor = (facetId: FacetId, test: (p: ProductListing) => boolean) =>
    allItems.filter(test).length;

  const makeFacet = (id: FacetId, title: string, options: { value: string; label: string; test: (p: ProductListing) => boolean }[]): FacetView => ({
    id,
    title,
    options: options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      count: countFor(id, opt.test),
      selected: state[id].includes(opt.value),
      href: toQuery(toggled(state, id, opt.value)),
    })),
  });

  return [
    makeFacet("condicao", "Condição", facetValues.conditions.map((c) => ({
      value: c,
      label: CONDITION_OPTIONS.find((o) => o.value === c)?.label ?? c,
      test: (p) => p.condition === c,
    }))),
    makeFacet("plataforma", "Plataforma", facetValues.platforms.map((label) => ({
      value: slugify(label),
      label,
      test: (p) => p.facets.platform?.some((v: string) => slugify(v) === slugify(label)) ?? false,
    }))),
    makeFacet("tipo", "Tipo", facetValues.types.map((label) => ({
      value: slugify(label),
      label,
      test: (p) => p.facets.type?.some((v: string) => slugify(v) === slugify(label)) ?? false,
    }))),
    makeFacet("preco", "Faixa de preço", PRICE_RANGES.map((r) => ({
      value: r.value,
      label: r.label,
      test: (p) => p.price >= r.min && p.price < r.max,
    }))),
  ];
}

function buildChips(state: ShopState, categoryTabs: { label: string; slug?: string }[], facetValues: { platforms: string[]; types: string[] }): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (state.q) chips.push({ key: "q", label: `Busca: ${state.q}`, href: toQuery({ ...state, q: "" }) });
  if (state.categoria) {
    const tab = categoryTabs.find((t) => t.slug === state.categoria);
    chips.push({ key: "categoria", label: tab?.label ?? state.categoria, href: toQuery({ ...state, categoria: undefined }) });
  }
  if (state.promocao) chips.push({ key: "promocao", label: "Em promoção", href: toQuery({ ...state, promocao: false }) });
  for (const v of state.condicao) {
    chips.push({ key: `condicao-${v}`, label: CONDITION_OPTIONS.find((o) => o.value === v)?.label ?? v, href: toQuery(toggled(state, "condicao", v)) });
  }
  for (const v of state.plataforma) {
    chips.push({ key: `plataforma-${v}`, label: facetValues.platforms.find((l) => slugify(l) === v) ?? v, href: toQuery(toggled(state, "plataforma", v)) });
  }
  for (const v of state.tipo) {
    chips.push({ key: `tipo-${v}`, label: facetValues.types.find((l) => slugify(l) === v) ?? v, href: toQuery(toggled(state, "tipo", v)) });
  }
  for (const v of state.preco) {
    chips.push({ key: `preco-${v}`, label: PRICE_RANGES.find((r) => r.value === v)?.label ?? v, href: toQuery(toggled(state, "preco", v)) });
  }
  return chips;
}

export type ShopItem = ProductListing & {
  stockLeft: number | null;
  category: string;
};

export async function getShop(state: ShopState) {
  const precoMin = state.preco.length
    ? Math.min(...state.preco.map((v) => PRICE_RANGES.find((r) => r.value === v)?.min ?? 0))
    : undefined;
  const precoMax = state.preco.length
    ? Math.max(...state.preco.map((v) => PRICE_RANGES.find((r) => r.value === v)?.max ?? Infinity))
    : undefined;

  const filters: ShopFilters = {
    q: state.q || undefined,
    categoria: state.categoria,
    condicao: state.condicao.length ? state.condicao : undefined,
    plataforma: state.plataforma.length ? state.plataforma : undefined,
    tipo: state.tipo.length ? state.tipo : undefined,
    precoMin,
    precoMax,
    promocao: state.promocao || undefined,
    ordem: state.ordem === "relevancia" ? undefined : state.ordem,
    limit: 100,
  };

  const [items, allUnfiltered, categories, facetValues] = await Promise.all([
    getProductListings(filters),
    getProductListings({ limit: 200 }),
    getCategories(),
    getFacetValues(),
  ]);

  const shopItems: ShopItem[] = items.map((p) => ({
    ...p,
    stockLeft: p.available > 0 && p.available <= 5 ? p.available : null,
    category: p.categoryName,
  }));

  const allItems = allUnfiltered;

  const categoryTabs = [
    { label: "Todas", slug: undefined as string | undefined, count: allItems.length },
    ...categories.map((c) => ({
      label: c.name,
      slug: c.slug,
      count: allItems.filter((p) => p.categorySlug === c.slug).length,
    })),
  ].map((tab) => ({
    ...tab,
    href: toQuery({ ...state, categoria: tab.slug }),
    active: state.categoria === tab.slug,
  }));

  const promoCount = allItems.filter((p) => p.discount != null && p.discount > 0).length;

  return {
    items: shopItems,
    total: items.length,
    facets: buildFacets(state, items, allItems, facetValues),
    chips: buildChips(state, categoryTabs, facetValues),
    promo: {
      count: promoCount,
      selected: state.promocao,
      href: toQuery({ ...state, promocao: !state.promocao }),
    },
    categoryTabs,
    sortOptions: SORT_OPTIONS.map((o) => ({ ...o, href: toQuery({ ...state, ordem: o.value }) })),
    clearHref: toQuery({ ...EMPTY_STATE, ordem: state.ordem, condicao: [], plataforma: [], tipo: [], preco: [] }),
  };
}
