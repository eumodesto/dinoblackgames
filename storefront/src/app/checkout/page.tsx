import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Finalizar compra · DinoBlack Games",
  description: "Dados, entrega e pagamento da sua compra na DinoBlack Games.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
