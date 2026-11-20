"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "./AdminSelect";
import { ProductHighlightsSection, defaultUsage, emptyHighlight, emptyHighlights, isoToLocalInput, localInputToIso, type HighlightUsage, type HighlightsState } from "./ProductHighlightsSection";

type Meta = { categories: { id: string; name: string }[]; locations: { id: string; name: string }[] };
type ProductFormProps = { productId?: string };

const TYPES = [
  ["console", "Console"], ["jogo", "Jogo"], ["acessorio", "Acessório"], ["pc", "PC Gamer"],
  ["notebook", "Notebook"], ["periferico", "Periférico"], ["retro", "Retrô"],
] as const;

const input = "mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
const label = "text-xs font-bold uppercase tracking-wide text-zinc-400";

export function AdminProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta>({ categories: [], locations: [] });
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("console");
  const [highlights, setHighlights] = useState<HighlightsState>(emptyHighlights);
  const [usage, setUsage] = useState<HighlightUsage>(defaultUsage);
  const [form, setForm] = useState<Record<string, string>>({ status: "draft", condition: "novo", warrantyMonths: "12", maxInstallments: "10", stock: "0", minStock: "0", weightGrams: "", widthMm: "", heightMm: "", lengthMm: "" });

  useEffect(() => {
    fetch("/api/admin/products").then((r) => r.json()).then((data) => { setMeta(data); if (!productId && data.highlightUsage) setUsage(data.highlightUsage); }).catch(() => setMessage("Não foi possível carregar categorias."));
    if (productId) {
      fetch(`/api/admin/products/${productId}`).then((r) => r.json()).then((data) => {
        const p = data.product;
        const v = p.variant ?? {};
        const m = p.media ?? {};
        const facets = Object.fromEntries((p.facets ?? []).map((f: { key: string; value: string }) => [f.key, f.value]));
        setType(facets.product_type ?? "console");
        if (data.homeHighlights) {
          const fromApi = (slot: "hero" | "flash") => ({ ...emptyHighlight(), ...data.homeHighlights[slot], endsAt: isoToLocalInput(data.homeHighlights[slot]?.endsAt ?? "") });
          setHighlights({ hero: fromApi("hero"), flash: fromApi("flash") });
        }
        if (data.highlightUsage) setUsage(data.highlightUsage);
        setForm({ name: p.name ?? "", sku: p.sku ?? "", categoryId: p.category_id ?? "", brand: p.brand ?? "", platform: facets.platform ?? "", releaseYear: facets.release_year ?? "", tagline: p.tagline ?? "", description: p.description ?? "", condition: p.condition ?? "novo", status: p.status ?? "draft", warrantyMonths: String(p.warranty_months ?? 12), warrantyText: p.warranty_text ?? "", price: String(v.price ?? ""), compareAt: v.compare_at ? String(v.compare_at) : "", maxInstallments: String(v.max_installments ?? 10), weightGrams: v.weight_grams ? String(v.weight_grams) : "", widthMm: v.width_mm ? String(v.width_mm) : "", heightMm: v.height_mm ? String(v.height_mm) : "", lengthMm: v.length_mm ? String(v.length_mm) : "", imageUrl: m.url ?? "" });
      }).finally(() => setLoading(false));
    }
  }, [productId]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const typeHint = useMemo(() => ({ console: "Modelo, plataforma, geração e armazenamento", jogo: "Plataforma, edição, idioma e classificação", acessorio: "Compatibilidade, conexão e conteúdo da embalagem", pc: "Processador, GPU, RAM, armazenamento e fonte", notebook: "Processador, GPU, RAM, tela, armazenamento e sistema", periferico: "Compatibilidade, conexão, layout e recursos", retro: "Plataforma, região, raridade e estado" }[type] ?? "Atributos do produto"), [type]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const specs = [
      ["Especificações principais", Object.entries(form).filter(([key, value]) => ["model", "cpu", "gpu", "ram", "storage", "screen", "connection", "compatibility", "edition", "language", "classification", "powerSupply", "operatingSystem"].includes(key) && value).map(([key, value]) => [key, value])],
    ].filter(([, rows]) => rows.length);
    const body = { ...form, homeHighlights: { hero: { ...highlights.hero }, flash: { ...highlights.flash, endsAt: localInputToIso(highlights.flash.endsAt) } }, productType: type, specs: specs.map(([group, rows]) => ({ group, rows })), highlights: [], inBox: [], faq: [] };
    const response = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", { method: productId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível salvar.");
    router.push("/admin/produtos"); router.refresh();
  }

  if (loading) return <p className="text-zinc-400">Carregando produto...</p>;
  const Field = ({ name, title, placeholder, type: fieldType = "text" }: { name: string; title: string; placeholder?: string; type?: string }) => <label className="block"><span className={label}>{title}</span><input className={input} type={fieldType} value={form[name] ?? ""} placeholder={placeholder} onChange={(e) => set(name, e.target.value)} /></label>;

  return <form onSubmit={submit} className="max-w-5xl space-y-6">
    <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-2">
      <Field name="name" title="Nome comercial *" placeholder="Ex.: PlayStation 5 Slim 1TB" />
      <Field name="sku" title="SKU *" placeholder="DB-PS5-001" />
      <label className="block"><span className={label}>Tipo de produto *</span><AdminSelect value={type} onValueChange={setType} options={TYPES.map(([value, title]) => ({ value, label: title }))} aria-label="Tipo de produto" /></label>
      <label className="block"><span className={label}>Categoria *</span><AdminSelect value={form.categoryId ?? ""} onValueChange={(value) => set("categoryId", value)} required options={[{ value: "", label: "Selecione..." }, ...meta.categories.map((c) => ({ value: c.id, label: c.name }))]} aria-label="Categoria" /></label>
      <Field name="brand" title="Marca" placeholder="Sony, Nintendo, Microsoft..." />
      <Field name="platform" title="Plataforma" placeholder="PlayStation 5, Xbox Series, Switch..." />
      <Field name="releaseYear" title="Ano / geração" placeholder="2025" />
      <Field name="imageUrl" title="URL da imagem principal" placeholder="https://..." />
      <div className="md:col-span-2"><p className="text-xs text-zinc-500">{typeHint}. Esses campos alimentam filtros e especificações estruturadas.</p></div>
    </div>
    <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-3">
      <label className="block"><span className={label}>Condição</span><AdminSelect value={form.condition} onValueChange={(value) => set("condition", value)} options={[{ value: "novo", label: "Novo" }, { value: "seminovo", label: "Seminovo" }, { value: "raridade", label: "Raridade" }, { value: "pre_venda", label: "Pré-venda" }]} aria-label="Condição" /></label>
      <label className="block"><span className={label}>Status</span><AdminSelect value={form.status} onValueChange={(value) => set("status", value)} options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }, { value: "scheduled", label: "Agendado" }, { value: "archived", label: "Arquivado" }]} aria-label="Status" /></label>
      <Field name="price" title="Preço promocional (R$) *" type="number" placeholder="0,00" />
      <Field name="compareAt" title="Preço original (R$)" type="number" placeholder="Deixe vazio se não houver promoção" />
      <Field name="stock" title="Estoque inicial" type="number" />
      <Field name="minStock" title="Estoque mínimo" type="number" />
      <Field name="warrantyMonths" title="Garantia (meses)" type="number" />
      <Field name="maxInstallments" title="Máx. parcelas" type="number" />
      <label className="block"><span className={label}>Local do estoque</span><AdminSelect value={form.locationId ?? ""} onValueChange={(value) => set("locationId", value)} options={[{ value: "", label: "Não definir agora" }, ...meta.locations.map((l) => ({ value: l.id, label: l.name }))]} aria-label="Local do estoque" /></label>
      <p className="md:col-span-3 text-xs leading-5 text-zinc-500">O preço promocional é o valor cobrado no checkout. O preço original aparece riscado na loja quando for maior que o promocional.</p>
    </div>
    <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-4"><div className="md:col-span-4"><h2 className="font-bold text-white">Dimensões para entrega</h2><p className="mt-1 text-xs text-zinc-500">Informe a embalagem pronta para envio. Peso em gramas; medidas em milímetros.</p></div><Field name="weightGrams" title="Peso (g)" type="number" placeholder="Ex.: 4500" /><Field name="heightMm" title="Altura (mm)" type="number" placeholder="Ex.: 150" /><Field name="widthMm" title="Largura (mm)" type="number" placeholder="Ex.: 400" /><Field name="lengthMm" title="Comprimento (mm)" type="number" placeholder="Ex.: 300" /></div>
    <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-2"><Field name="tagline" title="Resumo curto" /><Field name="warrantyText" title="Texto da garantia" /><label className="block md:col-span-2"><span className={label}>Descrição</span><textarea className={`${input} h-28 py-3`} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label></div>
    <ProductHighlightsSection value={highlights} onChange={setHighlights} usage={usage} />
    {message && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}
    <div className="flex gap-3"><button disabled={saving} className="rounded-xl bg-dino-red px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? "Salvando..." : productId ? "Salvar alterações" : "Criar produto"}</button><button type="button" onClick={() => router.back()} className="rounded-xl border border-zinc-700 px-6 py-3 font-bold text-zinc-300">Cancelar</button></div>
  </form>;
}
