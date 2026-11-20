import { BackLink } from "@/components/admin/BackLink";
import { IntegrationIcon } from "@/components/admin/IntegrationIcon";
import MercadoPagoIntegrationForm from "@/components/admin/MercadoPagoIntegrationForm";

export const dynamic = "force-dynamic";

export default function MercadoPagoIntegrationPage() {
  return (
    <div className="max-w-6xl space-y-8">
      <BackLink href="/admin/configuracoes">Voltar para configurações</BackLink>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Configurações · Integrações</p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-black text-white"><IntegrationIcon slug="mercadopago" size="lg" />Mercado Pago</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">Receba por Pix, cartão de crédito e cartão de débito. Acompanhe a conexão, o webhook e o desempenho dos pagamentos.</p>
      </div>
      <MercadoPagoIntegrationForm />
    </div>
  );
}
