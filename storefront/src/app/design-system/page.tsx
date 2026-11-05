import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowShowcase, IconGallery } from "@/components/design-system/Demos";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { CATEGORIES, PRODUCTS } from "@/data/demo";

export const metadata: Metadata = {
  title: "Design system · DinoBlack Games",
  description:
    "Cores, tipografia, botões, ícones e padrões de interface da loja DinoBlack.",
  robots: { index: false, follow: false },
};

const UPDATED_AT = "5 de novembro de 2026";

const SECTIONS = [
  ["cores", "Cores"],
  ["tipografia", "Tipografia"],
  ["botoes", "Botões e setas"],
  ["icones", "Ícones animados"],
  ["cards", "Cards"],
  ["forma", "Formas e movimento"],
  ["regras", "Regras de uso"],
  ["historico", "Histórico"],
] as const;

const BRAND_COLORS = [
  { name: "dino-red", hex: "#da2230", note: "Ação principal, preços em destaque, hover e foco", used: true },
  { name: "dino-red-hover", hex: "#b91c28", note: "Estado hover dos botões vermelhos", used: true },
  { name: "dino-black", hex: "#000000", note: "Definido na marca", used: false },
  { name: "dino-graphite", hex: "#2a2f35", note: "Definido na marca", used: false },
  { name: "dino-silver", hex: "#e5e5e5", note: "Definido na marca", used: false },
  { name: "dino-control", hex: "#d7d9d8", note: "Definido na marca", used: false },
  { name: "dino-cyan", hex: "#5fc4e2", note: "Definido na marca", used: false },
];

const SURFACES = [
  { name: "Fundo da página", light: "#f1f3f6", dark: "#050507" },
  { name: "Superfície (header, seções)", light: "#ffffff", dark: "#050507" },
  { name: "Card elevado", light: "#ffffff", dark: "zinc-950 / zinc-900" },
  { name: "Borda", light: "gray-200", dark: "zinc-800" },
  { name: "Texto principal", light: "#171717", dark: "#ededed" },
  { name: "Texto secundário", light: "gray-500", dark: "zinc-400" },
];

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-gray-200 py-10 dark:border-zinc-800/80">
      <h2 className="font-display text-2xl font-black tracking-tight text-gray-900 dark:text-white">
        {title}
      </h2>
      {lead && (
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-zinc-400">
          {lead}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({
  name,
  hex,
  note,
  used,
}: {
  name: string;
  hex: string;
  note: string;
  used: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="h-20 border-b border-gray-200 dark:border-zinc-800" style={{ backgroundColor: hex }} />
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">{name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              used
                ? "bg-dino-red/10 text-dino-red"
                : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {used ? "em uso" : "sem uso ainda"}
          </span>
        </div>
        <div className="font-mono text-xs text-gray-500 dark:text-zinc-400">{hex}</div>
        <div className="text-xs text-gray-600 dark:text-zinc-300">{note}</div>
      </div>
    </div>
  );
}

function Spec({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </code>
  );
}

export default function DesignSystemPage() {
  const sample = PRODUCTS.slice(0, 3);

  return (
    <div className="container mx-auto px-4 pb-16 pt-8 text-gray-800 dark:text-zinc-200">
      <header className="pb-8">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">
          DinoBlack · Games e Informática
        </p>
        <h1 className="mt-3 font-display text-4xl font-black text-gray-900 dark:text-white sm:text-5xl">
          Design system
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600 dark:text-zinc-400">
          Referência viva da interface da loja. As amostras abaixo usam os
          componentes reais do site, então mostram sempre o que está publicado.
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
          Atualizado em {UPDATED_AT}. Use o botão de tema no topo para ver o modo claro e o escuro.
        </p>
        <nav aria-label="Seções" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:border-dino-red hover:text-dino-red dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section
        id="cores"
        title="Cores"
        lead="O vermelho é a única cor de marca aplicada hoje. As demais estão definidas como tokens em globals.css, mas ainda não aparecem em nenhum componente."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_COLORS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
        <h3 className="mb-3 mt-8 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">
          Superfícies e texto
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-3 font-bold">Uso</th>
                <th className="px-4 py-3 font-bold">Claro</th>
                <th className="px-4 py-3 font-bold">Escuro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {SURFACES.map((s) => (
                <tr key={s.name}>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.light}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.dark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="tipografia"
        title="Tipografia"
        lead="Duas famílias: Rubik para títulos e destaques, Nunito Sans para todo o resto. Preços usam fonte monoespaçada."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Rubik · display · 500, 700, 800, 900
            </div>
            <div className="font-display mt-3 text-5xl font-black text-gray-900 dark:text-white">Aa Rubik</div>
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
              Classe <Spec>font-display</Spec>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Nunito Sans · texto · 400 a 800
            </div>
            <div className="mt-3 text-5xl font-bold text-gray-900 dark:text-white">Aa Nunito</div>
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
              Padrão do site (<Spec>font-sans</Spec>)
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {[
            {
              label: "Título do banner",
              spec: "font-display text-3xl sm:text-5xl font-black",
              sample: <span className="font-display text-3xl font-black text-gray-900 dark:text-white sm:text-5xl">PlayStation 5 Slim</span>,
            },
            {
              label: "Título de seção",
              spec: "font-display text-xl md:text-2xl font-black",
              sample: <span className="font-display text-xl font-black text-gray-900 dark:text-white md:text-2xl">Lançamentos e destaques</span>,
            },
            {
              label: "Sobretítulo",
              spec: "text-[11px] font-black uppercase tracking-[0.18em] text-dino-red",
              sample: <span className="text-[11px] font-black uppercase tracking-[0.18em] text-dino-red">Potência. Velocidade. Next gen.</span>,
            },
            {
              label: "Preço",
              spec: "font-mono text-lg sm:text-xl font-black",
              sample: <span className="font-mono text-xl font-black text-gray-900 dark:text-white">R$ 3.899,00</span>,
            },
            {
              label: "Texto de apoio",
              spec: "text-sm text-gray-600 dark:text-zinc-400",
              sample: <span className="text-sm text-gray-600 dark:text-zinc-400">SSD ultrarrápido, DualSense e catálogo exclusivo.</span>,
            },
          ].map((row) => (
            <div key={row.label} className="grid gap-2 p-4 md:grid-cols-[180px_1fr_1fr] md:items-center">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{row.label}</div>
              <div>{row.sample}</div>
              <div className="font-mono text-[11px] text-gray-500 dark:text-zinc-500">{row.spec}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="botoes"
        title="Botões e setas"
        lead="Todo controle só com ícone precisa de aria-label. Alvo de toque mínimo de 40px."
      >
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Ações</h3>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-dino-red px-5 py-3 text-sm font-black text-white transition hover:bg-dino-red-hover">
              Explorar agora →
            </span>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400">Primário · CTA do banner</div>
          </div>
          <div className="space-y-2">
            <span className="inline-flex h-10 items-center gap-1 rounded-xl bg-dino-red px-4 text-sm font-black text-white">
              Pegar →
            </span>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400">Primário compacto · Flash Drop</div>
          </div>
          <div className="space-y-2 rounded-2xl bg-zinc-950 p-3">
            <span className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-white px-5 text-xs font-black text-zinc-950 shadow-md">
              Explorar produto →
            </span>
            <div className="text-[11px] text-zinc-400">Secundário · card (vira vermelho no hover)</div>
          </div>
          <div className="space-y-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              ●
            </span>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400">Ícone redondo · 40px (tema, carrinho)</div>
          </div>
        </div>

        <h3 className="mb-3 mt-8 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">
          Setas de carrossel · ChevronButton
        </h3>
        <ArrowShowcase />
        <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400">
          Tamanhos: <Spec>md</Spec> círculo de 40px com seta de 24px; <Spec>lg</Spec> círculo de 48px com seta de 28px (banner principal). Componente em <Spec>components/ui/ChevronButton.tsx</Spec>.
        </p>
      </Section>

      <Section
        id="icones"
        title="Ícones animados"
        lead="Passe o mouse sobre um item para ver a animação. Nos botões, a animação dispara com o hover do botão inteiro, não só do desenho."
      >
        <IconGallery />
        <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400">
          Bibliotecas AnimateIcons e Lucide Animated, licença MIT, em <Spec>components/icons/</Spec>. Dependem de <Spec>motion</Spec>.
        </p>
      </Section>

      <Section
        id="cards"
        title="Cards"
        lead="Estes exemplos são os componentes reais da home."
      >
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Categoria</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {CATEGORIES.slice(0, 2).map((cat) => (
            <div
              key={cat.id}
              className="relative aspect-[4/3] w-52 shrink-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-900 dark:border-zinc-800"
            >
              <Image src={cat.image} alt={cat.name} fill sizes="208px" className="object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-base font-black text-white">{cat.name}</div>
                <div className="mt-1 text-xs font-semibold text-white/80">Explorar coleção →</div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mb-1 mt-6 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Produto</h3>
        <ProductCarousel title="Exemplo de carrossel" products={sample} />

        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Selos</h3>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-950 p-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-dino-red to-rose-600 px-3 py-1 text-[11px] font-black text-white shadow-lg shadow-dino-red/40">
            ★ Flagship
          </span>
          <span className="rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-md">
            −9%
          </span>
          <span className="rounded-full bg-zinc-700/80 px-2 py-1 text-[10px] font-bold text-white">Oferta exclusiva</span>
          <span className="flex items-center gap-1 font-mono text-xs font-bold text-white">
            <span className="rounded-md bg-zinc-800 px-1.5 py-1">05</span>:
            <span className="rounded-md bg-zinc-800 px-1.5 py-1">42</span>:
            <span className="rounded-md bg-dino-red px-1.5 py-1">19</span>
          </span>
        </div>
      </Section>

      <Section
        id="forma"
        title="Formas e movimento"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">Raios</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Spec>rounded-full</Spec> botões, selos, campo de busca, setas</li>
              <li><Spec>rounded-[28px]</Spec> cards de produto, banner e Flash Drop</li>
              <li><Spec>rounded-2xl</Spec> cards de categoria, menus e painéis</li>
              <li><Spec>rounded-xl</Spec> selo de ícone, botão compacto</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">Layout</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Mobile first; breakpoints padrão do Tailwind: <Spec>sm 640</Spec> <Spec>md 768</Spec> <Spec>lg 1024</Spec></li>
              <li>Conteúdo em <Spec>container mx-auto px-4</Spec></li>
              <li>Header: barra superior, logo, busca, tema, conta e carrinho; navegação por categorias a partir de <Spec>lg</Spec></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">Sombras</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Botão primário e selo de ícone: <Spec>shadow-dino-red/25</Spec> a <Spec>/30</Spec></li>
              <li>Card de produto em hover: brilho vermelho <Spec>0 24px 50px rgba(218,34,48,.22)</Spec></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">Movimento</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Cards sobem de 6 a 8px no hover e a imagem dá zoom (<Spec>scale-110</Spec>, 700ms)</li>
              <li>Transições de cor e borda em 300ms</li>
              <li>Ícones animam no hover. Quase todos respeitam <Spec>prefers-reduced-motion</Spec>; os três de usuário e tema (user, sun, sun-moon) ainda não</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="regras" title="Regras de uso">
        <ul className="grid gap-3 text-sm md:grid-cols-2">
          {[
            "Vermelho é ação: um destaque vermelho por região, sem competir com o CTA.",
            "Setas de carrossel sempre com ChevronButton, nunca caracteres de texto.",
            "Ícones novos entram em components/icons/ e disparam a animação pelo hover do botão que os contém.",
            "Todo botão só com ícone leva aria-label; alvos de toque com pelo menos 40px.",
            "Carrosséis horizontais precisam de padding em volta da faixa para o hover do card não ser cortado.",
            "Testar sempre nos dois temas e em 375px de largura.",
            "Não usar Xbox como referência visual (preferência do cliente). Referências: site da PlayStation para o visual geral e página de produto da Nintendo.",
            "Categorias principais, nesta ordem: Consoles, PC Gamer, Retro e Notebooks.",
          ].map((rule) => (
            <li key={rule} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              {rule}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="historico" title="Histórico">
        <ol className="space-y-3 text-sm">
          {[
            ["5 nov 2026", "Criada esta página. Setas de carrossel padronizadas (ChevronButton) e faixas de cards com folga para o hover."],
            ["4 nov 2026", "Oito ícones animados aplicados ao header, ao carrinho e às categorias. Barra de stories removida da home."],
            ["30 out 2026", "Paleta e direção visual aprovadas no documento de desenvolvimento (v1.2)."],
          ].map(([date, text]) => (
            <li key={date} className="grid gap-1 rounded-2xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[110px_1fr]">
              <span className="font-mono text-xs font-bold text-dino-red">{date}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
