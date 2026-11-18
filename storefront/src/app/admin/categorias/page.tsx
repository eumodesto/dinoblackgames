import { AdminCategories } from "@/components/admin/AdminCategories";

export const dynamic = "force-dynamic";

export default function CategoriesPage() { return <div className="max-w-6xl space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Catálogo</p><h1 className="mt-2 font-display text-3xl font-black text-white">Categorias</h1><p className="mt-1 text-sm text-zinc-500">Organize o catálogo público, a navegação e as páginas de SEO.</p></div><AdminCategories /></div>; }
