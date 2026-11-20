import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { BackLink } from "@/components/admin/BackLink";

export default function NewProductPage() {
  return <div className="space-y-6"><BackLink href="/admin/produtos">Voltar para produtos</BackLink><div><h1 className="font-display text-3xl font-black text-white">Novo produto</h1><p className="mt-1 text-sm text-zinc-500">Cadastre o produto com atributos compatíveis com o seu tipo.</p></div><AdminProductForm /></div>;
}
