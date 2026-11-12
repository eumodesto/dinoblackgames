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

export type CartLine = {
  key: string;
  product: ProductCard;
  qty: number;
  color?: string;
  storage?: string;
};

type CartContextValue = {
  items: CartLine[];
  ready: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  subtotal: number;
  addItem: (product: ProductCard, extras?: { color?: string; storage?: string; qty?: number }) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "dinoblack-cart-v2";
const MAX_QTY = 20;

export const lineKey = (slug: string, color?: string, storage?: string) => `${slug}|${color ?? ""}|${storage ?? ""}`;

type SavedLine = {
  slug: string;
  qty: number;
  color?: string;
  storage?: string;
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
        key: lineKey(s.slug, s.color, s.storage),
        product: s.product,
        qty: Math.min(MAX_QTY, s.qty),
        color: s.color,
        storage: s.storage,
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

  const addItem = useCallback((product: ProductCard, extras?: { color?: string; storage?: string; qty?: number }) => {
    const key = lineKey(product.slug, extras?.color, extras?.storage);
    const add = Math.max(1, Math.min(MAX_QTY, extras?.qty ?? 1));
    setItems((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + add) } : l));
      }
      return [...prev, { key, product, qty: add, color: extras?.color, storage: extras?.storage }];
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
