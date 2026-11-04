"use client";

import { useRef } from "react";
import {
  PackagePlusIcon,
  type PackagePlusIconHandle,
} from "@/components/icons/package-plus-icon";
import { WA_SELL_USED } from "@/lib/whatsapp";

export function SellUsedLink() {
  const iconRef = useRef<PackagePlusIconHandle>(null);

  return (
    <a
      href={WA_SELL_USED}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className="inline-flex items-center gap-1.5 rounded-full bg-dino-red px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-dino-red-hover"
    >
      <PackagePlusIcon ref={iconRef} size={13} aria-hidden />
      Venda seu usado
    </a>
  );
}
