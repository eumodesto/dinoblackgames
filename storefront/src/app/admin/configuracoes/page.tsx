import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Administração</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Configurações</h1>
        <p className="mt-2 text-sm text-zinc-500">Central de integrações e preferências operacionais da loja.</p>
      </div>
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
    </div>
  );
}
