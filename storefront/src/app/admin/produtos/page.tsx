import Image from "next/image";
import Link from "next/link";
import { getAdminProducts } from "@/lib/server/catalog";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  published: { label: "Publicado", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  draft: { label: "Rascunho", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
  archived: { label: "Arquivado", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  scheduled: { label: "Agendado", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
};

const CONDITION_LABEL: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  raridade: "Raridade",
  pre_venda: "Pré-venda",
};

// Lê o catálogo do banco em tempo de execução. Sem isto o Next tenta pré-renderizar a página
// durante `next build`, quando não há banco (a Vercel não tem DATABASE_URL no build).
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">Produtos</h1>
          <p className="mt-1 text-sm text-zinc-500">{products.length} produtos no catálogo</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-bold text-zinc-400">Produto</th>
              <th className="hidden px-4 py-3 font-bold text-zinc-400 md:table-cell">SKU</th>
              <th className="hidden px-4 py-3 font-bold text-zinc-400 sm:table-cell">Categoria</th>
              <th className="px-4 py-3 font-bold text-zinc-400">Preço</th>
              <th className="hidden px-4 py-3 font-bold text-zinc-400 sm:table-cell">Estoque</th>
              <th className="px-4 py-3 font-bold text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {products.map((p) => {
              const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
              return (
                <tr key={p.id} className="transition hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link href={`/produto/${p.slug}`} className="flex items-center gap-3 hover:text-dino-red">
                      {p.image ? (
                        <Image src={p.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg bg-zinc-900 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-zinc-800" />
                      )}
                      <div>
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-xs text-zinc-500">{CONDITION_LABEL[p.condition] ?? p.condition}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-zinc-500 md:table-cell">{p.sku}</td>
                  <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">{p.categoryName}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">{formatBRL(p.price)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`font-semibold ${p.available > 5 ? "text-emerald-400" : p.available > 0 ? "text-amber-400" : "text-red-400"}`}>
                      {p.available}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
