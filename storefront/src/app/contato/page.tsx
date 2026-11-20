import type { Metadata } from "next";
import { FOOTER_ADDRESS, FOOTER_BRAND, FOOTER_MAPS_URL, SOCIAL_LINKS } from "@/data/footer";
import { WHATSAPP_DISPLAY, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contato · DinoBlack Games",
  description: `Fale com a ${FOOTER_BRAND} pelo WhatsApp ou venha até a loja.`,
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-20 pt-8 text-gray-800 dark:text-zinc-200">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Contato</p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-gray-900 dark:text-white md:text-4xl">Fale com a DinoBlack</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-zinc-400">Dúvidas sobre produto, pedido, garantia ou venda de usados: o caminho mais rápido é o WhatsApp.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-display text-lg font-black text-gray-900 dark:text-white">WhatsApp</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{WHATSAPP_DISPLAY}</p>
          <a href={waLink("Olá! Vim pelo site da DinoBlack Games.")} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 items-center rounded-xl bg-dino-red px-5 text-sm font-bold text-white transition hover:bg-dino-red-hover">Chamar no WhatsApp</a>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-display text-lg font-black text-gray-900 dark:text-white">Loja</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{FOOTER_ADDRESS}</p>
          <a href={FOOTER_MAPS_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 items-center rounded-xl border border-gray-300 px-5 text-sm font-bold text-gray-900 transition hover:border-dino-red dark:border-zinc-700 dark:text-white">Ver no mapa</a>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-display text-lg font-black text-gray-900 dark:text-white">Redes sociais</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {SOCIAL_LINKS.map((s) => (
            <li key={s.id}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-xl border border-gray-300 px-5 text-sm font-bold text-gray-900 transition hover:border-dino-red dark:border-zinc-700 dark:text-white">{s.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
