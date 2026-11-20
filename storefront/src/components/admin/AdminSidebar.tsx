"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const GROUPS = [
  { label: "Visão geral", items: [{ href: "/admin", label: "Dashboard" }] },
  { label: "Operação", items: [{ href: "/admin/pedidos", label: "Pedidos" }, { href: "/admin/estoque", label: "Estoque" }] },
  { label: "Catálogo", items: [{ href: "/admin/produtos", label: "Produtos" }, { href: "/admin/categorias", label: "Categorias" }, { href: "/admin/tags", label: "Tags" }, { href: "/admin/cupons", label: "Cupons" }] },
  { label: "Integrações", items: [{ href: "/admin/configuracoes/integracoes/email", label: "E-mail / Resend" }, { href: "/admin/configuracoes/integracoes/analytics", label: "Analytics" }, { href: "/admin/configuracoes/integracoes/ads", label: "Google Ads" }, { href: "/admin/configuracoes/integracoes/meta", label: "Meta Pixel" }, { href: "/admin/configuracoes/integracoes/frete", label: "Frete" }] },
  { label: "Sistema", items: [{ href: "/admin/usuarios", label: "Usuários" }, { href: "/admin/configuracoes", label: "Configurações" }, { href: "/admin/design-system", label: "Design system" }] },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-900 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
        <span className="font-display text-lg font-black text-white">Dino</span>
        <span className="rounded-md bg-dino-red px-1.5 py-0.5 text-[10px] font-black text-white">ADMIN</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="Menu administrativo">
        {GROUPS.map((group) => <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">{group.label}</p>
          <div className="space-y-1">{group.items.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-dino-red/15 text-white ring-1 ring-dino-red/40" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}>{item.label}</Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="flex items-center justify-between border-t border-zinc-800 p-4">
        <Link href="/" className="text-xs font-semibold text-zinc-500 hover:text-dino-red">← Voltar à loja</Link>
        <form method="post" action="/api/admin/logout"><button type="submit" className="text-xs font-semibold text-zinc-500 hover:text-dino-red">Sair</button></form>
      </div>
    </aside>
  );
}

export function AdminMobileMenu() {
  return <details className="relative lg:hidden">
    <summary className="cursor-pointer list-none rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-white">Menu</summary>
    <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
      {GROUPS.map((group) => <div key={group.label} className="mb-4 last:mb-0"><p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">{group.label}</p><div className="space-y-1">{group.items.map((item) => <Link key={item.href} href={item.href} className="block rounded-lg px-2 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white">{item.label}</Link>)}</div></div>)}
    </div>
  </details>;
}
