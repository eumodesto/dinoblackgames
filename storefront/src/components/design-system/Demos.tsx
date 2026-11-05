"use client";

import { useRef, type ForwardRefExoticComponent, type RefAttributes } from "react";
import { ChevronButton } from "@/components/ui/ChevronButton";
import { AlignRightIcon } from "@/components/icons/align-right-icon";
import { PackageCheckIcon } from "@/components/icons/package-check-icon";
import { PackagePlusIcon } from "@/components/icons/package-plus-icon";
import { ShoppingCartIcon } from "@/components/icons/shopping-cart-icon";
import { SunIcon } from "@/components/icons/sun-icon";
import { SunMoonIcon } from "@/components/icons/sun-moon-icon";
import { TagsIcon } from "@/components/icons/tags-icon";
import { UserIcon } from "@/components/icons/user-icon";

type IconHandle = { startAnimation: () => void; stopAnimation: () => void };
type IconComponent = ForwardRefExoticComponent<
  { size?: number } & RefAttributes<IconHandle>
>;

const ICONS: { name: string; file: string; usage: string; Icon: IconComponent }[] = [
  {
    name: "UserIcon",
    file: "user-icon.tsx",
    usage: "Botão da conta no header",
    Icon: UserIcon,
  },
  {
    name: "SunIcon",
    file: "sun-icon.tsx",
    usage: "Botão de tema no modo escuro (volta ao claro)",
    Icon: SunIcon,
  },
  {
    name: "SunMoonIcon",
    file: "sun-moon-icon.tsx",
    usage: "Botão de tema no modo claro (vai ao escuro)",
    Icon: SunMoonIcon,
  },
  {
    name: "AlignRightIcon",
    file: "align-right-icon.tsx",
    usage: "Botão “Todas as categorias” (desktop e busca mobile)",
    Icon: AlignRightIcon,
  },
  {
    name: "PackagePlusIcon",
    file: "package-plus-icon.tsx",
    usage: "Link “Venda seu usado” na barra superior",
    Icon: PackagePlusIcon,
  },
  {
    name: "PackageCheckIcon",
    file: "package-check-icon.tsx",
    usage: "“Meus pedidos” no menu da conta",
    Icon: PackageCheckIcon,
  },
  {
    name: "ShoppingCartIcon",
    file: "shopping-cart-icon.tsx",
    usage: "Botão do carrinho e título do carrinho lateral",
    Icon: ShoppingCartIcon,
  },
  {
    name: "TagsIcon",
    file: "tags-icon.tsx",
    usage: "Selo de “Comprar por categoria”",
    Icon: TagsIcon,
  },
];

function IconTile({
  name,
  file,
  usage,
  Icon,
}: {
  name: string;
  file: string;
  usage: string;
  Icon: IconComponent;
}) {
  const ref = useRef<IconHandle>(null);
  return (
    <div
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
      className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-dino-red/60 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-dino-red text-white shadow-md shadow-dino-red/30">
        <Icon ref={ref} size={24} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-black text-gray-900 dark:text-white">
          {name}
        </div>
        <div className="font-mono text-[11px] text-gray-500 dark:text-zinc-400">
          {file}
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-zinc-300">
          {usage}
        </div>
      </div>
    </div>
  );
}

export function IconGallery() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ICONS.map((icon) => (
        <IconTile key={icon.name} {...icon} />
      ))}
    </div>
  );
}

const noop = () => {};

export function ArrowShowcase() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
          overlay · sobre imagem ou card escuro
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ChevronButton direction="left" label="Exemplo anterior" onClick={noop} />
          <ChevronButton direction="right" label="Exemplo próximo" onClick={noop} />
          <ChevronButton
            direction="left"
            label="Exemplo anterior grande"
            size="lg"
            onClick={noop}
          />
          <ChevronButton
            direction="right"
            label="Exemplo próximo grande"
            size="lg"
            onClick={noop}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
          surface · acompanha o tema da página
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ChevronButton
            direction="left"
            label="Exemplo anterior"
            variant="surface"
            onClick={noop}
          />
          <ChevronButton
            direction="right"
            label="Exemplo próximo"
            variant="surface"
            onClick={noop}
          />
        </div>
      </div>
    </div>
  );
}
