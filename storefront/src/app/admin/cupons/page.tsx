import { AdminCoupons } from "@/components/admin/AdminCoupons";

export const dynamic = "force-dynamic";

export default function CouponsPage() {
  return <div className="max-w-7xl space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Catálogo</p><h1 className="mt-2 font-display text-3xl font-black text-white">Cupons</h1><p className="mt-1 text-sm text-zinc-500">Crie campanhas de desconto com limites, validade e acompanhamento de usos.</p></div><AdminCoupons /></div>;
}
