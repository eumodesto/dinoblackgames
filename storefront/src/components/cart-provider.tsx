"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { PRODUCTS, type Product } from "@/data/demo";

export type CartLine = {
  product: Product;
  qty: number;
  color?: string;
  storage?: string;
};

type CartContextValue = {
  items: CartLine[];
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  subtotal: number;
  addItem: (product: Product, extras?: Partial<CartLine>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const DEMO_ITEMS: CartLine[] = [
  {
    product: PRODUCTS[0],
    qty: 1,
    color: "Preto",
    storage: "1 TB",
  },
  {
    product: PRODUCTS[1],
    qty: 1,
    color: "Branco",
  },
];

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(DEMO_ITEMS);
  const [open, setOpen] = useState(false);

  const addItem = useCallback((product: Product, extras?: Partial<CartLine>) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line,
        );
      }
      return [
        ...prev,
        {
          product,
          qty: 1,
          color: extras?.color,
          storage: extras?.storage,
        },
      ];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((line) => line.product.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev.map((line) =>
        line.product.id === id ? { ...line, qty: Math.max(1, qty) } : line,
      ),
    );
  }, []);

  const count = items.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = items.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0,
  );

  const value = useMemo(
    () => ({
      items,
      open,
      setOpen,
      count,
      subtotal,
      addItem,
      removeItem,
      updateQty,
    }),
    [items, open, count, subtotal, addItem, removeItem, updateQty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
