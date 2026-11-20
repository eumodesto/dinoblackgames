import { BackLink } from "@/components/admin/BackLink";
import { env } from "@/lib/server/env";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL = { auto: "Automático (SuperFrete primeiro; Melhor Envio se falhar)", superfrete: "Só SuperFrete", melhor_envio: "Só Melhor Envio" } as const;

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className="gd-status" data-state={ok ? "teal" : "ochre"}><i aria-hidden="true" />{children}</span>;
}

/** Situação do cálculo de frete. As chaves ficam nas variáveis de ambiente da Vercel (nunca aparecem aqui). */
export default function ShippingIntegrationPage() {
  const superfrete = Boolean(env.superfreteToken);
  const melhorEnvio = Boolean(env.melhorEnvioToken);
  const origin = env.shippingOriginCep;
  const originOk = origin.length === 8;
  const ready = superfrete || melhorEnvio;
  const rows: { name: string; text: string; ok: boolean; variable: string }[] = [
    { name: "SuperFrete", text: superfrete ? "Chave configurada." : "Chave ausente.", ok: superfrete, variable: "SUPERFRETE_TOKEN" },
    { name: "Melhor Envio", text: melhorEnvio ? "Chave configurada." : "Chave ausente.", ok: melhorEnvio, variable: "MELHOR_ENVIO_TOKEN" },
    { name: "CEP de origem", text: originOk ? `${origin.slice(0, 5)}-${origin.slice(5)}` : "Não definido na variável: usa o CEP salvo nas configurações da loja ou o padrão.", ok: true, variable: "SHIPPING_ORIGIN_CEP" },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <BackLink href="/admin/configuracoes">Voltar para configurações</BackLink>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Configurações · Integrações</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Frete</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">Cálculo de frete pelo CEP e pelo peso real dos produtos, no checkout e na página do produto.</p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Situação</h2>
          <Status ok={ready}>{ready ? "Pronto para calcular" : "Falta configurar"}</Status>
        </div>
        <p className="mt-2 text-sm text-zinc-500">Preferência de transportadora: <strong className="text-zinc-200">{PROVIDER_LABEL[env.shippingProvider]}</strong></p>
        <ul className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {rows.map((r) => (
            <li key={r.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-semibold text-white">{r.name}</div>
                <div className="text-xs text-zinc-500">{r.text}</div>
              </div>
              <div className="flex items-center gap-3">
                <code className="rounded bg-zinc-950 px-2 py-1 text-[11px] text-zinc-400">{r.variable}</code>
                <Status ok={r.ok}>{r.ok ? "Ok" : "Pendente"}</Status>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          As chaves ficam nas variáveis de ambiente do projeto na Vercel (Settings → Environment Variables) e não aparecem no painel. Depois de alterar uma variável, publique novamente para valer.
          Para escolher a transportadora, use <code className="text-zinc-300">SHIPPING_PROVIDER</code> com <code className="text-zinc-300">auto</code>, <code className="text-zinc-300">superfrete</code> ou <code className="text-zinc-300">melhor_envio</code>.
        </p>
      </section>
    </div>
  );
}
