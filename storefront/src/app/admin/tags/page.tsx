import { AdminTags } from "@/components/admin/AdminTags";

export const dynamic = "force-dynamic";

export default function TagsPage() { return <div className="max-w-6xl space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Catálogo</p><h1 className="mt-2 font-display text-3xl font-black text-white">Tags</h1><p className="mt-1 text-sm text-zinc-500">Crie marcadores para curadoria, filtros e busca do catálogo.</p></div><AdminTags /></div>; }
