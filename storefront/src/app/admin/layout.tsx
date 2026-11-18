import type { Metadata } from "next";
import Link from "next/link";
import { AdminMobileMenu, AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin · DinoBlack Games",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-200">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-black text-white">Dino</span>
            <span className="rounded-md bg-dino-red px-1.5 py-0.5 text-[10px] font-black text-white">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
          <nav className="hidden max-w-[70vw] gap-4 overflow-x-auto sm:flex">
            <Link href="/admin" className="whitespace-nowrap text-sm font-semibold text-zinc-400 hover:text-white">Dashboard</Link>
            <Link href="/admin/pedidos" className="whitespace-nowrap text-sm font-semibold text-zinc-400 hover:text-white">Pedidos</Link>
            <Link href="/admin/produtos" className="whitespace-nowrap text-sm font-semibold text-zinc-400 hover:text-white">Produtos</Link>
            <Link href="/admin/configuracoes" className="whitespace-nowrap text-sm font-semibold text-zinc-400 hover:text-white">Configurações</Link>
          </nav>
          <AdminMobileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
