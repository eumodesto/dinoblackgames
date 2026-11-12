import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAccess } from "@/components/account/AccountAccess";

export const metadata: Metadata = {
  title: "Minha conta · DinoBlack Games",
  description: "Entre ou crie sua conta na DinoBlack para acompanhar pedidos e comprar mais rápido.",
  robots: { index: false, follow: true },
};

export default function MinhaContaPage() {
  return (
    <div className="container mx-auto px-4 pb-20 pt-8 text-gray-800 dark:text-zinc-200 sm:pt-12">
      <Suspense>
        <AccountAccess />
      </Suspense>
    </div>
  );
}
