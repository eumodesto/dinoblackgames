import { BackLink } from "@/components/admin/BackLink";
import EmailIntegrationForm from "@/components/admin/EmailIntegrationForm";

export const dynamic = "force-dynamic";

export default function EmailIntegrationPage() {
  return (
    <div className="max-w-6xl space-y-8">
      <BackLink href="/admin/configuracoes">Voltar para configurações</BackLink>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Configurações · Integrações</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">E-mail transacional</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">Configure o Resend e personalize as mensagens enviadas em eventos da conta, pedidos e solicitações de troca.</p>
      </div>
      <EmailIntegrationForm />
    </div>
  );
}
