import Link from "next/link";

const TABS = [
  { id: "integracoes", label: "Integrações" },
  { id: "emails", label: "Emails" },
  { id: "webhook", label: "Webhook" },
  { id: "api", label: "API" },
  { id: "evolution", label: "Evolution" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Conteúdo de cada aba. As que ainda não têm página própria mostram o espaço onde a configuração vai entrar.
const SOON: Record<Exclude<TabId, "integracoes" | "emails">, { title: string; text: string }> = {
  webhook: { title: "Webhooks", text: "Endereços que recebem avisos da loja (pedido pago, envio, estoque) e a chave de assinatura de cada um." },
  api: { title: "API", text: "Chaves de acesso, permissões e limites de uso para integrar sistemas externos à loja." },
  evolution: { title: "Evolution", text: "Conexão com a Evolution API para enviar mensagens de WhatsApp, com instância, chave e modelos de mensagem." },
};

function SoonPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white">{title}</h2>
        <span className="gd-status" data-state="ochre"><i aria-hidden="true" />Em configuração</span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">{text}</p>
      <p className="mt-4 rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">Os campos desta configuração serão adicionados aqui.</p>
    </section>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ aba?: string }> }) {
  const requested = (await searchParams)?.aba;
  const tab: TabId = TABS.some((item) => item.id === requested) ? (requested as TabId) : "integracoes";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Administração</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Configurações</h1>
        <p className="mt-2 text-sm text-zinc-500">Central de integrações e preferências operacionais da loja.</p>
      </div>

      <nav className="gd-tabs" aria-label="Seções de configuração">
        {TABS.map((item) => (
          <Link key={item.id} href={item.id === "integracoes" ? "/admin/configuracoes" : `/admin/configuracoes?aba=${item.id}`} aria-current={item.id === tab ? "page" : undefined} scroll={false}>
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "integracoes" && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Integrações</p>
          <Link href="/admin/configuracoes/integracoes/email" className="mt-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-dino-red">
            <div>
              <h2 className="font-bold text-white">E-mail transacional</h2>
              <p className="mt-1 text-sm text-zinc-500">Resend, remetente e templates de mensagens da loja.</p>
            </div>
            <span className="text-xl text-zinc-500">→</span>
          </Link>
        </section>
      )}

      {tab === "emails" && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Emails</p>
          <Link href="/admin/configuracoes/integracoes/email" className="mt-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-dino-red">
            <div>
              <h2 className="font-bold text-white">Remetente e templates</h2>
              <p className="mt-1 text-sm text-zinc-500">Configure o remetente, as mensagens enviadas aos clientes e faça envios de teste.</p>
            </div>
            <span className="text-xl text-zinc-500">→</span>
          </Link>
        </section>
      )}

      {tab !== "integracoes" && tab !== "emails" && <SoonPanel {...SOON[tab]} />}
    </div>
  );
}
