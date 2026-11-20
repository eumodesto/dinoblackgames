"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Value = { image: string | null; setImage: (src: string | null) => void };
const Ctx = createContext<Value>({ image: null, setImage: () => undefined });

/**
 * Liga a escolha de variação (caixa de compra) à galeria: a variação escolhida define a foto principal.
 * Fora do provedor, galeria e caixa de compra continuam funcionando sozinhas.
 */
export function VariantImageProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<string | null>(null);
  const value = useMemo(() => ({ image, setImage }), [image]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useVariantImage = () => useContext(Ctx);
