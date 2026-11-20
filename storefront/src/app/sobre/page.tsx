import type { Metadata } from "next";
import Link from "next/link";
import { FOOTER_ADDRESS, FOOTER_BRAND, FOOTER_DESCRIPTION, FOOTER_MAPS_URL } from "@/data/footer";
import { WA_SELL_USED } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Sobre a DinoBlack Games",
  description: FOOTER_DESCRIPTION,
};

const POINTS = [
  { title: "Games, acessórios e informática", text: "Consoles, jogos, controles, notebooks e PC gamer em um só lugar." },
  { title: "Novos e seminovos", text: "Produtos novos e usados com condição descrita na página de cada item." },
  { title: "Garantia DinoBlack", text: "Cada produto informa o prazo de garantia antes da compra." },
  { title: "Envio para todo o Brasil", text: "O frete é calculado pelo CEP, na página do produto e no checkout." },
  { title: "Compramos o seu usado", text: "Tem um console, jogo ou acessório parado? Envie os dados e a equipe responde com a próxima etapa." },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-20 pt-8 text-gray-800 dark:text-zinc-200">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Sobre nós</p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-gray-900 dark:text-white md:text-4xl">{FOOTER_BRAND}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-zinc-400">{FOOTER_DESCRIPTION}</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {POINTS.map((p) => (
          <li key={p.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-display text-lg font-black text-gray-900 dark:text-white">{p.title}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-zinc-400">{p.text}</p>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-display text-lg font-black text-gray-900 dark:text-white">Onde estamos</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{FOOTER_ADDRESS}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={FOOTER_MAPS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-xl border border-gray-300 px-5 text-sm font-bold text-gray-900 transition hover:border-dino-red dark:border-zinc-700 dark:text-white">Ver no mapa</a>
          <Link href="/contato" className="inline-flex h-11 items-center rounded-xl bg-dino-red px-5 text-sm font-bold text-white transition hover:bg-dino-red-hover">Falar com a gente</Link>
          <a href={WA_SELL_USED} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-xl border border-gray-300 px-5 text-sm font-bold text-gray-900 transition hover:border-dino-red dark:border-zinc-700 dark:text-white">Vender meu usado</a>
        </div>
      </section>
    </div>
  );
}
