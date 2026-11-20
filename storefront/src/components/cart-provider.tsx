"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProductCard } from "@/lib/types";
import { track } from "@/lib/analytics-client";

export type CartLine = {
  key: string;
  product: ProductCard;
  qty: number;
  color?: string;
  storage?: string;
  condition?: string;
  /** Demais opções escolhidas (Memória RAM, Edição, Voltagem…). Cor, armazenamento e condição ficam nos campos acima. */
  options?: Record<string, string>;
};

type CartContextValue = {
  items: CartLine[];
  ready: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  subtotal: number;
  addItem: (product: ProductCard, extras?: { color?: string; storage?: string; condition?: string; options?: Record<string, string>; qty?: number }) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "dinoblack-cart-v2";
const MAX_QTY = 20;

const optionsKey = (options?: Record<string, string>) => (options && Object.keys(options).length ? `|${JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)))}` : "");
export const lineKey = (slug: string, color?: string, storage?: string, condition?: string, options?: Record<string, string>) => `${slug}|${color ?? ""}|${storage ?? ""}|${condition ?? ""}${optionsKey(options)}`;

type SavedLine = {
  slug: string;
  qty: number;
  color?: string;
  storage?: string;
  condition?: string;
  options?: Record<string, string>;
  product: ProductCard;
};

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as SavedLine[];
    return saved.flatMap((s) => {
      if (!s.product || !s.product.slug || !Number.isInteger(s.qty) || s.qty < 1) return [];
      return [{
        key: lineKey(s.slug, s.color, s.storage, s.condition, s.options),
        product: s.product,
        qty: Math.min(MAX_QTY, s.qty),
        color: s.color,
        storage: s.storage,
        condition: s.condition,
        options: s.options,
      }];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items.map((l) => ({
          slug: l.product.slug,
          qty: l.qty,
          color: l.color,
          storage: l.storage,
          condition: l.condition,
          options: l.options,
          product: {
            id: l.product.id,
            slug: l.product.slug,
            name: l.product.name,
            price: l.product.price,
            compareAt: l.product.compareAt,
            image: l.product.image,
          },
        }))),
      );
    } catch {}
  }, [items, ready]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback((product: ProductCard, extras?: { color?: string; storage?: string; condition?: string; options?: Record<string, string>; qty?: number }) => {
    const key = lineKey(product.slug, extras?.color, extras?.storage, extras?.condition, extras?.options);
    const add = Math.max(1, Math.min(MAX_QTY, extras?.qty ?? 1));
    track("add_to_cart", { slug: product.slug, value: product.price * add });
    setItems((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + add) } : l));
      }
      return [...prev, { key, product, qty: add, color: extras?.color, storage: extras?.storage, condition: extras?.condition, options: extras?.options }];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, l) => sum + l.qty, 0);
  const subtotal = items.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  const value = useMemo(
    () => ({ items, ready, open, setOpen, count, subtotal, addItem, removeItem, updateQty, clear }),
    [items, ready, open, count, subtotal, addItem, removeItem, updateQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
