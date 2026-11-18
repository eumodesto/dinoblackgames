import { AdminProductForm } from "@/components/admin/AdminProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-6"><div><h1 className="font-display text-3xl font-black text-white">Editar produto</h1><p className="mt-1 text-sm text-zinc-500">Atualize catálogo, preço, publicação e estoque.</p></div><AdminProductForm productId={id} /></div>;
}
