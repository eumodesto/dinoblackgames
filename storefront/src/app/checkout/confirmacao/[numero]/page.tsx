import type { Metadata } from "next";
import { OrderStatusView } from "@/components/checkout/OrderStatusView";

export const metadata: Metadata = {
  title: "Seu pedido · DinoBlack Games",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function ConfirmationPage({ params, searchParams }: PageProps) {
  const { numero } = await params;
  const { t } = await searchParams;
  return <OrderStatusView number={numero} token={t ?? ""} />;
}
