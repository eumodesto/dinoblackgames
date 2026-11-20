"use client";

import { useEffect, useMemo, useState } from "react";

export type StoreCategory = { id: string; name: string; slug: string; href: string; parentId: string | null };
export type StoreCategoryNode = StoreCategory & { children: StoreCategoryNode[] };

// Uma busca compartilhada por todos os componentes do cabeçalho; renova a cada minuto
// (ocultar/mostrar uma categoria no admin aparece na loja em até esse tempo).
let cache: { at: number; items: StoreCategory[] } | null = null;
let pending: Promise<StoreCategory[]> | null = null;
const TTL_MS = 60_000;

async function load(): Promise<StoreCategory[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  pending ??= fetch("/api/categories")
    .then((response) => (response.ok ? response.json() : { categories: [] }))
    .then((data: { categories?: StoreCategory[] }) => {
      const items = Array.isArray(data.categories) ? data.categories : [];
      cache = { at: Date.now(), items };
      return items;
    })
    .catch(() => [] as StoreCategory[])
    .finally(() => { pending = null; });
  return pending;
}

/** Lista plana (já na ordem do admin) → árvore. Categoria cuja mãe não veio (oculta) é descartada. */
export function buildCategoryTree(items: StoreCategory[]): StoreCategoryNode[] {
  const nodes = new Map<string, StoreCategoryNode>(items.map((c) => [c.id, { ...c, children: [] }]));
  const roots: StoreCategoryNode[] = [];
  for (const node of nodes.values()) {
    if (!node.parentId) roots.push(node);
    else nodes.get(node.parentId)?.children.push(node);
  }
  return roots;
}

/**
 * Categorias ativas do admin. `categories` são só as principais (para seletores simples);
 * `tree` traz principais → subcategorias → itens. `ready` indica que a primeira busca terminou.
 */
export function useStoreCategories() {
  const [items, setItems] = useState<StoreCategory[]>(cache?.items ?? []);
  const [ready, setReady] = useState(cache !== null);
  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) { setItems(result); setReady(true); } });
    return () => { alive = false; };
  }, []);
  const tree = useMemo(() => buildCategoryTree(items), [items]);
  return { categories: tree, tree, ready };
}
