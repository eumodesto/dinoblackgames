import { BackLink } from "@/components/admin/BackLink";
import TrackingIntegrationForm from "@/components/admin/TrackingIntegrationForm";

export const dynamic = "force-dynamic";

export default function TrackingIntegrationPage() {
  return (
    <div className="max-w-6xl space-y-8">
      <BackLink href="/admin/configuracoes">Voltar para configurações</BackLink>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Configurações · Integrações</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Analytics e conversões</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">Google Analytics, Google Ads, Meta (Pixel e API de Conversões) e Microsoft Clarity para medir visitas, carrinho e vendas.</p>
      </div>
      <TrackingIntegrationForm />
    </div>
  );
}
