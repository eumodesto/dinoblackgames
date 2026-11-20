import { BackLink } from "@/components/admin/BackLink";
import { IntegrationIcon } from "@/components/admin/IntegrationIcon";
import ResendIntegrationForm from "@/components/admin/ResendIntegrationForm";

export const dynamic = "force-dynamic";

export default function ResendIntegrationPage() {
  return (
    <div className="max-w-6xl space-y-8">
      <BackLink href="/admin/configuracoes">Voltar para configurações</BackLink>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Configurações · Integrações</p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-black text-white"><IntegrationIcon slug="resend" size="lg" />Resend</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">Serviço que envia os e-mails da loja. Defina o remetente e confira se a chave está ativa.</p>
      </div>
      <ResendIntegrationForm />
    </div>
  );
}
