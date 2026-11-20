import Link from "next/link";
import { ADMIN_PAGE_SIZE, getAdminCategoryOptions, getAdminProducts } from "@/lib/server/catalog";
import { ProductsFilters, type ProductsFilterValues } from "@/components/admin/ProductsFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ProductsTable } from "@/components/admin/ProductsTable";

// Lê o catálogo do banco em tempo de execução. Sem isto o Next tenta pré-renderizar a página
// durante `next build`, quando não há banco (a Vercel não tem DATABASE_URL no build).
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ page?: string } & Partial<ProductsFilterValues>> };

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters: ProductsFilterValues = {
    q: (params.q ?? "").trim(), categoria: params.categoria ?? "", status: params.status ?? "", condicao: params.condicao ?? "",
    estoque: params.estoque ?? "", visibilidade: params.visibilidade ?? "", precoMin: params.precoMin ?? "", precoMax: params.precoMax ?? "",
  };
  const [{ items: products, total, page, pages }, categories] = await Promise.all([
    getAdminProducts({ page: Number(params.page) || 1, ...filters }),
    getAdminCategoryOptions(),
  ]);
  const filtered = Object.values(filters).some(Boolean);
  const href = (n: number) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    if (n > 1) query.set("page", String(n));
    const text = query.toString();
    return text ? `/admin/produtos?${text}` : "/admin/produtos";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black text-white">Produtos</h1>
          <p className="mt-1 text-sm text-zinc-500">{filtered ? `${total} resultado${total === 1 ? "" : "s"} com os filtros aplicados` : `${total} produtos no catálogo`}</p>
        </div>
        <Link href="/admin/produtos/novo" className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-dino-red-hover">Novo produto</Link>
      </div>

      <ProductsFilters initial={filters} categories={categories} />

      <ProductsTable
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, condition: p.condition, categoryName: p.categoryName, price: p.price, available: p.available, status: p.status, image: p.image }))}
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
      />

      <AdminPagination page={page} pages={pages} total={total} pageSize={ADMIN_PAGE_SIZE} href={href} />
    </div>
  );
}
