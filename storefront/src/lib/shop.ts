import {
  CATEGORY_TABS,
  CONDITION_OPTIONS,
  PRICE_RANGES,
  getListingAttrs,
  slugify,
} from "@/data/catalog";
import { PRODUCTS, type Product } from "@/data/demo";

export type SortKey = "relevancia" | "menor-preco" | "maior-preco" | "maior-desconto" | "mais-vendidos";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "maior-desconto", label: "Maior desconto" },
  { value: "mais-vendidos", label: "Mais vendidos" },
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

const CATEGORY_SLUGS = CATEGORY_TABS.map((name) => slugify(name));

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Valores possíveis de cada filtro, derivados do catálogo. */
function allValues() {
  return {
    plataforma: [...new Set(PRODUCTS.map((p) => getListingAttrs(p).platform))],
    tipo: [...new Set(PRODUCTS.map((p) => getListingAttrs(p).type))],
  };
}

export function parseShopState(sp: RawParams): ShopState {
  const values = allValues();
  const platformSlugs = values.plataforma.map(slugify);
  const typeSlugs = values.tipo.map(slugify);

  const state: ShopState = { ...EMPTY_STATE, condicao: [], plataforma: [], tipo: [], preco: [] };

  state.q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";

  const categoria = list(sp.categoria)[0];
  if (categoria) {
    if (CATEGORY_SLUGS.includes(categoria)) state.categoria = categoria;
    // Links antigos como /loja?categoria=nintendo apontam para uma plataforma.
    else if (platformSlugs.includes(categoria)) state.plataforma.push(categoria);
  }

  state.condicao = list(sp.condicao).filter((v) => CONDITION_OPTIONS.some((o) => o.value === v));
  state.plataforma = [...new Set([...state.plataforma, ...list(sp.plataforma).filter((v) => platformSlugs.includes(v))])];
  state.tipo = list(sp.tipo).filter((v) => typeSlugs.includes(v));
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

function matches(product: Product, state: ShopState, ignore?: FacetId): boolean {
  const attrs = getListingAttrs(product);
  if (state.q && !normalize(`${product.name} ${attrs.platform} ${attrs.type} ${product.category}`).includes(normalize(state.q))) {
    return false;
  }
  if (state.categoria && slugify(product.category) !== state.categoria) return false;
  if (state.promocao && !product.discount) return false;
  if (ignore !== "condicao" && state.condicao.length && !state.condicao.includes(attrs.condition)) return false;
  if (ignore !== "plataforma" && state.plataforma.length && !state.plataforma.includes(slugify(attrs.platform))) return false;
  if (ignore !== "tipo" && state.tipo.length && !state.tipo.includes(slugify(attrs.type))) return false;
  if (ignore !== "preco" && state.preco.length) {
    const inRange = state.preco.some((value) => {
      const range = PRICE_RANGES.find((r) => r.value === value);
      return range ? product.price >= range.min && product.price < range.max : false;
    });
    if (!inRange) return false;
  }
  return true;
}

function sortProducts(items: Product[], ordem: SortKey): Product[] {
  const copy = [...items];
  switch (ordem) {
    case "menor-preco":
      return copy.sort((a, b) => a.price - b.price);
    case "maior-preco":
      return copy.sort((a, b) => b.price - a.price);
    case "maior-desconto":
      return copy.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));
    case "mais-vendidos":
      return copy.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    default:
      return copy;
  }
}

export type FacetOptionView = {
  value: string;
  label: string;
  count: number;
  selected: boolean;
  href: string;
};

export type FacetView = { id: FacetId | "promocao"; title: string; options: FacetOptionView[] };

function toggled(state: ShopState, id: FacetId, value: string): ShopState {
  const current = state[id];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...state, [id]: next };
}

export function buildFacets(state: ShopState): FacetView[] {
  const values = allValues();

  const make = (
    id: FacetId,
    title: string,
    options: { value: string; label: string; test: (p: Product) => boolean }[],
  ): FacetView => ({
    id,
    title,
    options: options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      // Contagem disjuntiva: considera os outros filtros, mas não o do próprio grupo.
      count: PRODUCTS.filter((p) => matches(p, state, id) && opt.test(p)).length,
      selected: state[id].includes(opt.value),
      href: toQuery(toggled(state, id, opt.value)),
    })),
  });

  return [
    make(
      "condicao",
      "Condição",
      CONDITION_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        test: (p) => getListingAttrs(p).condition === o.value,
      })),
    ),
    make(
      "plataforma",
      "Plataforma",
      values.plataforma.map((label) => ({
        value: slugify(label),
        label,
        test: (p) => getListingAttrs(p).platform === label,
      })),
    ),
    make(
      "tipo",
      "Tipo",
      values.tipo.map((label) => ({
        value: slugify(label),
        label,
        test: (p) => getListingAttrs(p).type === label,
      })),
    ),
    make(
      "preco",
      "Faixa de preço",
      PRICE_RANGES.map((r) => ({
        value: r.value,
        label: r.label,
        test: (p) => p.price >= r.min && p.price < r.max,
      })),
    ),
  ];
}

export type ActiveChip = { key: string; label: string; href: string };

export function buildChips(state: ShopState): ActiveChip[] {
  const values = allValues();
  const chips: ActiveChip[] = [];
  if (state.q) chips.push({ key: "q", label: `Busca: ${state.q}`, href: toQuery({ ...state, q: "" }) });
  if (state.categoria) {
    const name = CATEGORY_TABS.find((n) => slugify(n) === state.categoria) ?? state.categoria;
    chips.push({ key: "categoria", label: name, href: toQuery({ ...state, categoria: undefined }) });
  }
  if (state.promocao) chips.push({ key: "promocao", label: "Em promoção", href: toQuery({ ...state, promocao: false }) });
  for (const v of state.condicao) {
    chips.push({
      key: `condicao-${v}`,
      label: CONDITION_OPTIONS.find((o) => o.value === v)?.label ?? v,
      href: toQuery(toggled(state, "condicao", v)),
    });
  }
  for (const v of state.plataforma) {
    chips.push({
      key: `plataforma-${v}`,
      label: values.plataforma.find((l) => slugify(l) === v) ?? v,
      href: toQuery(toggled(state, "plataforma", v)),
    });
  }
  for (const v of state.tipo) {
    chips.push({
      key: `tipo-${v}`,
      label: values.tipo.find((l) => slugify(l) === v) ?? v,
      href: toQuery(toggled(state, "tipo", v)),
    });
  }
  for (const v of state.preco) {
    chips.push({
      key: `preco-${v}`,
      label: PRICE_RANGES.find((r) => r.value === v)?.label ?? v,
      href: toQuery(toggled(state, "preco", v)),
    });
  }
  return chips;
}

export function getShop(state: ShopState) {
  const items = sortProducts(PRODUCTS.filter((p) => matches(p, state)), state.ordem);
  const promoCount = PRODUCTS.filter((p) => matches(p, { ...state, promocao: false }) && p.discount).length;
  return {
    items,
    total: items.length,
    facets: buildFacets(state),
    chips: buildChips(state),
    promo: {
      count: promoCount,
      selected: state.promocao,
      href: toQuery({ ...state, promocao: !state.promocao }),
    },
    categoryTabs: [
      { label: "Todas", slug: undefined as string | undefined, count: PRODUCTS.filter((p) => matches(p, { ...state, categoria: undefined })).length },
      ...CATEGORY_TABS.map((name) => ({
        label: name,
        slug: slugify(name) as string | undefined,
        count: PRODUCTS.filter((p) => matches(p, { ...state, categoria: slugify(name) })).length,
      })),
    ].map((tab) => ({ ...tab, href: toQuery({ ...state, categoria: tab.slug }), active: state.categoria === tab.slug })),
    sortOptions: SORT_OPTIONS.map((o) => ({ ...o, href: toQuery({ ...state, ordem: o.value }) })),
    clearHref: toQuery({ ...EMPTY_STATE, ordem: state.ordem, condicao: [], plataforma: [], tipo: [], preco: [] }),
  };
}
