import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin · DinoBlack Games",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/pedidos", label: "Pedidos" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-200">
      <aside className="hidden w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
          <span className="font-display text-lg font-black text-white">Dino</span>
          <span className="rounded-md bg-dino-red px-1.5 py-0.5 text-[10px] font-black text-white">ADMIN</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between border-t border-zinc-800 p-4">
          <Link href="/" className="text-xs font-semibold text-zinc-500 hover:text-dino-red">
            ← Voltar à loja
          </Link>
          <form method="post" action="/api/admin/logout">
            <button type="submit" className="text-xs font-semibold text-zinc-500 hover:text-dino-red">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-black text-white">Dino</span>
            <span className="rounded-md bg-dino-red px-1.5 py-0.5 text-[10px] font-black text-white">ADMIN</span>
          </div>
          <nav className="flex gap-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-semibold text-zinc-400 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
