"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "./AdminSelect";
import { RichTextEditor } from "./RichTextEditor";
import { ProductHighlightsSection, defaultUsage, emptyHighlight, emptyHighlights, isoToLocalInput, localInputToIso, type HighlightUsage, type HighlightsState } from "./ProductHighlightsSection";
import { normalizeTags, optionCode, parseVideoUrl, specsToText } from "@/lib/catalog-normalize";
import { OPTION_PRESETS, colorSwatch, isColorOption, presetByName } from "@/lib/variant-options";

type Meta = { categories: { id: string; name: string }[]; locations: { id: string; name: string }[]; tags: string[] };
type Media = { url: string; alt: string; width?: number | null; height?: number | null; bytes?: number | null };
type OptionDef = { code: string; name: string; values: string[]; draft: string; custom?: boolean };
type VariantRow = { key: string; id?: string; sku?: string; options: Record<string, string>; price: string; compareAt: string; cashPrice: string; imageUrl: string; stock: string; minStock: string; maxInstallments: string };

const TYPES = [
  ["console", "Console"], ["jogo", "Jogo"], ["acessorio", "Acessório"], ["gift", "Gift Card"], ["hardware", "Hardware"],
  ["pc", "PC Gamer"], ["notebook", "Notebook"], ["periferico", "Periférico"], ["retro", "Retrô"],
] as const;

const input = "mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
const label = "text-xs font-bold uppercase tracking-wide text-zinc-400";
const card = "grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5";
const ghost = "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-dino-red hover:text-white disabled:opacity-40";

const variantKey = (options: Record<string, string>) => JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)));
const emptyVariant = (): VariantRow => ({ key: "single", options: {}, price: "", compareAt: "", cashPrice: "", imageUrl: "", stock: "0", minStock: "0", maxInstallments: "10" });

/** Todas as combinações das opções (Condição × Armazenamento…), mantendo preço/estoque já digitados. */
function combine(options: OptionDef[], previous: VariantRow[]): VariantRow[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length);
  let combos: Record<string, string>[] = [{}];
  for (const option of usable) combos = combos.flatMap((base) => option.values.map((value) => ({ ...base, [option.code]: value })));
  const byKey = new Map(previous.map((v) => [variantKey(v.options), v]));
  const template = previous[0];
  return combos.map((combo) => {
    const key = variantKey(combo);
    return byKey.get(key) ?? { ...emptyVariant(), key, options: combo, price: template?.price ?? "", maxInstallments: template?.maxInstallments ?? "10" };
  });
}

export function AdminProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<Meta>({ categories: [], locations: [], tags: [] });
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("console");
  const [highlights, setHighlights] = useState<HighlightsState>(emptyHighlights);
  const [usage, setUsage] = useState<HighlightUsage>(defaultUsage);
  const [form, setForm] = useState<Record<string, string>>({ status: "draft", visibility: "visible", condition: "novo", warrantyMonths: "12", weightGrams: "", widthMm: "", heightMm: "", lengthMm: "", videoUrl: "", locationId: "" });
  const [media, setMedia] = useState<Media[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [options, setOptions] = useState<OptionDef[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()]);
  const [extras, setExtras] = useState(false); // preço do Pix e foto por variação (precisa da migration 18 no banco)
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [inBoxText, setInBoxText] = useState("");
  const [specsText, setSpecsText] = useState("");
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/products").then((r) => r.json()).then((data) => { setMeta({ categories: data.categories ?? [], locations: data.locations ?? [], tags: data.tags ?? [] }); setExtras(Boolean(data.variantExtras)); if (!productId && data.highlightUsage) setUsage(data.highlightUsage); }).catch(() => setMessage("Não foi possível carregar categorias."));
    if (!productId) return;
    fetch(`/api/admin/products/${productId}`).then((r) => r.json()).then((data) => {
      const p = data.product;
      const facets = Object.fromEntries((data.facets ?? []).map((f: { key: string; value: string }) => [f.key, f.value]));
      const first = data.variants?.[0] ?? {};
      setType(facets.product_type ?? "console");
      if (data.homeHighlights) {
        const fromApi = (slot: "hero" | "flash") => ({ ...emptyHighlight(), ...data.homeHighlights[slot], endsAt: isoToLocalInput(data.homeHighlights[slot]?.endsAt ?? "") });
        setHighlights({ hero: fromApi("hero"), flash: fromApi("flash") });
      }
      if (data.highlightUsage) setUsage(data.highlightUsage);
      setForm({
        name: p.name ?? "", sku: p.sku ?? "", categoryId: p.category_id ?? "", brand: p.brand ?? "", platform: facets.platform ?? "", releaseYear: facets.release_year ?? "",
        tagline: p.tagline ?? "", description: p.description ?? "", condition: p.condition ?? "novo", status: p.status ?? "draft", visibility: p.visibility ?? "visible",
        warrantyMonths: String(p.warranty_months ?? 12), warrantyText: p.warranty_text ?? "", videoUrl: p.video_url ?? "", badge: p.badge ?? "",
        weightGrams: first.weight_grams ? String(first.weight_grams) : "", widthMm: first.width_mm ? String(first.width_mm) : "", heightMm: first.height_mm ? String(first.height_mm) : "", lengthMm: first.length_mm ? String(first.length_mm) : "", locationId: "",
      });
      setInBoxText(((p.in_box ?? []) as string[]).join("\n"));
      setSpecsText(specsToText(p.specs));
      setFaq(((p.faq ?? []) as { q: string; a: string }[]).map((f) => ({ q: f.q, a: f.a })));
      setMedia((data.media ?? []).map((m: Media) => ({ url: m.url, alt: m.alt, width: m.width, height: m.height, bytes: m.bytes })));
      setTags(data.tags ?? []);
      setOptions((data.options ?? []).map((o: { code: string; name: string; values: string[] }) => ({ code: o.code, name: o.name, values: o.values, draft: "", custom: !presetByName(o.name) })));
      setVariants((data.variants ?? []).map((v: Record<string, unknown>) => ({
        key: variantKey((v.options ?? {}) as Record<string, string>), id: v.id as string, sku: v.sku as string, options: (v.options ?? {}) as Record<string, string>,
        price: String(v.price ?? ""), compareAt: v.compare_at && Number(v.compare_at) > Number(v.price) ? String(v.compare_at) : "", cashPrice: v.cash_price ? String(v.cash_price) : "", imageUrl: typeof v.image_url === "string" ? v.image_url : "", stock: String(v.stock ?? 0), minStock: String(v.min_stock ?? 0), maxInstallments: String(v.max_installments ?? 10),
      })));
    }).finally(() => setLoading(false));
  }, [productId]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const video = useMemo(() => parseVideoUrl(form.videoUrl), [form.videoUrl]);
  const hasOptions = options.length > 0;

  // ---- imagens
  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setDragging(false);
    setUploading(true); setMessage("");
    const body = new FormData();
    body.set("name", form.name ?? "");
    Array.from(files).forEach((f) => body.append("files", f));
    const response = await fetch("/api/admin/uploads", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!response.ok) return setMessage(data.error ?? "Falha no envio das imagens.");
    setMedia((current) => [...current, ...data.files]);
  }
  const move = (from: number, to: number) => setMedia((current) => { if (to < 0 || to >= current.length) return current; const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
  function addUrl() {
    const url = urlDraft.trim();
    if (!/^https?:\/\//i.test(url)) return setMessage("Cole um link de imagem que comece com https://");
    setMedia((current) => [...current, { url, alt: form.name ?? "" }]); setUrlDraft(""); setMessage("");
  }

  // ---- tags
  function addTags(raw: string) {
    const merged = normalizeTags([...tags, ...raw.split(",")], new Map(), { name: form.name }, 12);
    setTags(merged); setTagDraft("");
  }

  // ---- opções e variações
  const updateOptions = (next: OptionDef[]) => { setOptions(next); setVariants((current) => (next.some((o) => o.name.trim() && o.values.length) ? combine(next, current) : [current[0] ? { ...current[0], key: "single", options: {} } : emptyVariant()])); };
  const addOption = () => updateOptions([...options, { code: "", name: "", values: [], draft: "" }]);
  const patchOption = (index: number, patch: Partial<OptionDef>) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o));
    if (patch.name !== undefined) next[index].code = optionCode(patch.name);
    setOptions(next);
    if (patch.values) updateOptions(next);
  };
  const patchVariant = (key: string, patch: Partial<VariantRow>) => setVariants((current) => current.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const optionLabel = (v: VariantRow) => Object.values(v.options).join(" · ") || "Produto";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const usableOptions = options.filter((o) => o.name.trim() && o.values.length).map(({ code, name, values }) => ({ code: code || optionCode(name), name: name.trim(), values }));
    const body = {
      ...form, productType: type, tags, media, options: usableOptions, locationId: form.locationId || undefined,
      // A foto da variação só vale se ainda está na galeria do produto.
      variants: variants.map((v) => ({ id: v.id, sku: v.sku, options: v.options, price: v.price, compareAt: v.compareAt, stock: v.stock, minStock: v.minStock, maxInstallments: v.maxInstallments, ...(extras ? { cashPrice: v.cashPrice, imageUrl: media.some((m) => m.url === v.imageUrl) ? v.imageUrl : "" } : {}) })),
      homeHighlights: { hero: { ...highlights.hero }, flash: { ...highlights.flash, endsAt: localInputToIso(highlights.flash.endsAt) } },
      specsText, inBox: inBoxText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean), faq,
    };
    const response = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", { method: productId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível salvar.");
    router.push("/admin/produtos"); router.refresh();
  }

  if (loading) return <p className="text-zinc-400">Carregando produto...</p>;
  const field = (name: string, title: string, opts: { placeholder?: string; type?: string; readOnly?: boolean } = {}) => (
    <label className="block"><span className={label}>{title}</span><input className={input} type={opts.type ?? "text"} value={form[name] ?? ""} placeholder={opts.placeholder} readOnly={opts.readOnly} onChange={(e) => set(name, e.target.value)} /></label>
  );
  const cell = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-white outline-none focus:border-dino-red";

  return <form onSubmit={submit} className="space-y-6">
    <div className={`${card} md:grid-cols-2`}>
      {field("name", "Nome comercial *", { placeholder: "Ex.: PlayStation 5 Slim 1TB" })}
      {field("sku", "ID DinoBlack (SKU)", { placeholder: "Gerado automaticamente: DB-JGO-00001", readOnly: Boolean(productId) })}
      <label className="block"><span className={label}>Tipo de produto *</span><AdminSelect value={type} onValueChange={setType} options={TYPES.map(([value, title]) => ({ value, label: title }))} aria-label="Tipo de produto" /></label>
      <label className="block"><span className={label}>Categoria *</span><AdminSelect value={form.categoryId ?? ""} onValueChange={(value) => set("categoryId", value)} required options={[{ value: "", label: "Selecione..." }, ...meta.categories.map((c) => ({ value: c.id, label: c.name }))]} aria-label="Categoria" /></label>
      {field("brand", "Marca", { placeholder: "Sony, Nintendo, Microsoft..." })}
      {field("platform", "Plataforma", { placeholder: "PlayStation 5, Xbox Series, Switch..." })}
      {field("releaseYear", "Ano / geração", { placeholder: "2025" })}
      {field("badge", "Selo (opcional)", { placeholder: "Ex.: Lançamento" })}
    </div>

    <div className={card}>
      <div><h2 className="font-bold text-white">Imagens</h2><p className="mt-1 text-xs text-zinc-500">A primeira é a capa. As imagens são reduzidas e convertidas para WebP automaticamente, com nome otimizado para buscas.</p></div>
      {media.length > 0 && <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {media.map((m, i) => <li key={`${m.url}-${i}`} className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização no admin */}
            <img src={m.url} alt={m.alt} className="h-full w-full object-contain" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-dino-red px-2 py-0.5 text-[10px] font-black text-white">CAPA</span>}
          </div>
          <input aria-label={`Texto alternativo da imagem ${i + 1}`} className={`${cell} mt-2 text-xs`} value={m.alt} placeholder="Texto alternativo" onChange={(e) => setMedia((c) => c.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
          <div className="mt-2 grid grid-cols-[1fr_1.6fr_1fr_1fr] gap-1">
            <button type="button" className={`${ghost} !px-0`} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Mover para antes">◀</button>
            <button type="button" className={`${ghost} !px-1`} disabled={i === 0} onClick={() => move(i, 0)}>Capa</button>
            <button type="button" className={`${ghost} !px-0`} disabled={i === media.length - 1} onClick={() => move(i, i + 1)} aria-label="Mover para depois">▶</button>
            <button type="button" className={`${ghost} !px-0 hover:!border-red-500 hover:!text-red-400`} onClick={() => setMedia((c) => c.filter((_, j) => j !== i))} aria-label="Remover imagem">✕</button>
          </div>
        </li>)}
      </ul>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        className={`grid place-items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${dragging ? "border-dino-red bg-dino-red/10 text-white" : "border-zinc-700 text-zinc-400"}`}
      >
        <span>{uploading ? "Enviando..." : "Arraste as imagens aqui ou use o botão abaixo (JPG, PNG, WebP · até 4 MB cada)"}</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white disabled:opacity-50">{uploading ? "Enviando..." : "Enviar imagens"}</button>
        <label className="min-w-[240px] flex-1"><span className={label}>ou cole o link de uma imagem</span><input className={input} value={urlDraft} placeholder="https://..." onChange={(e) => setUrlDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} /></label>
        <button type="button" className={`${ghost} h-11`} onClick={addUrl}>Adicionar link</button>
      </div>
    </div>

    <div className={`${card} md:grid-cols-3`}>
      <label className="block"><span className={label}>Condição</span><AdminSelect value={form.condition} onValueChange={(value) => set("condition", value)} options={[{ value: "novo", label: "Novo" }, { value: "seminovo", label: "Seminovo" }, { value: "raridade", label: "Raridade" }, { value: "pre_venda", label: "Pré-venda" }]} aria-label="Condição" /></label>
      <label className="block"><span className={label}>Status</span><AdminSelect value={form.status} onValueChange={(value) => set("status", value)} options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }, { value: "scheduled", label: "Agendado" }, { value: "archived", label: "Arquivado" }]} aria-label="Status" /></label>
      <label className="block"><span className={label}>Visibilidade na loja</span><AdminSelect value={form.visibility} onValueChange={(value) => set("visibility", value)} options={[{ value: "visible", label: "Visível nas listas e na busca" }, { value: "hidden", label: "Oculto (só pelo link direto)" }]} aria-label="Visibilidade" /></label>
      {field("warrantyMonths", "Garantia (meses)", { type: "number" })}
      {field("warrantyText", "Texto da garantia")}
      <label className="block"><span className={label}>Local do estoque</span><AdminSelect value={form.locationId ?? ""} onValueChange={(value) => set("locationId", value)} options={[{ value: "", label: "Padrão da loja" }, ...meta.locations.map((l) => ({ value: l.id, label: l.name }))]} aria-label="Local do estoque" /></label>
    </div>

    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-bold text-white">Preço e estoque</h2><p className="mt-1 text-xs text-zinc-500">O preço é o valor cobrado no checkout; o preço original aparece riscado quando é maior. O estoque é a quantidade exata disponível.</p></div>
        {!hasOptions && <button type="button" className={ghost} onClick={addOption}>+ Este produto tem variações</button>}
      </div>

      {options.map((option, index) => {
        const preset = presetByName(option.name);
        const isColor = isColorOption(optionCode(option.name), option.name);
        const taken = new Set(options.filter((_, i) => i !== index).map((o) => optionCode(o.name)));
        const suggestions = (preset?.suggestions ?? []).filter((s) => !option.values.includes(s));
        const addValue = (v: string) => { const value = v.trim(); if (value && !option.values.includes(value)) patchOption(index, { values: [...option.values, value], draft: "" }); };
        return <div key={index} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,260px)_1fr_auto] md:items-start">
            <div>
              <span className={label}>Tipo de variação</span>
              <div className="mt-1"><AdminSelect
                value={option.custom ? "__custom" : preset?.code ?? ""}
                onValueChange={(v) => { if (v === "__custom") patchOption(index, { name: "", custom: true, values: [] }); else { const p = OPTION_PRESETS.find((x) => x.code === v); if (p) patchOption(index, { name: p.name, custom: false, values: [] }); } }}
                aria-label="Tipo de variação"
                options={[{ value: "", label: "Escolha o tipo..." }, ...OPTION_PRESETS.filter((p) => !taken.has(p.code)).map((p) => ({ value: p.code, label: p.name })), { value: "__custom", label: "Outra (personalizada)..." }]}
              /></div>
              {option.custom && <input className={`${cell} !h-11 mt-2`} value={option.name} placeholder="Nome da variação (ex.: Acabamento)" aria-label="Nome da variação personalizada" onChange={(e) => patchOption(index, { name: e.target.value })} />}
              {preset && <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">{preset.hint}{isColor ? ". Na loja aparece como bolinhas de cor." : ""}</p>}
            </div>
            <div><span className={label}>Valores</span>
              <div className="gd-chips mt-1">
                {option.values.map((value) => { const swatch = isColor ? colorSwatch(value) : null; return <span key={value} className="gd-chip">{swatch && <i aria-hidden className="h-3.5 w-3.5 rounded-full border border-white/25" style={{ background: swatch }} />}{value}<button type="button" aria-label={`Remover ${value}`} onClick={() => patchOption(index, { values: option.values.filter((v) => v !== value) })}>✕</button></span>; })}
                <input className="gd-bare text-sm text-white" value={option.draft} placeholder={option.values.length ? "Adicionar outro valor" : "Digite o valor e pressione Enter"} onChange={(e) => patchOption(index, { draft: e.target.value })}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && option.draft.trim()) { e.preventDefault(); addValue(option.draft); } }} />
              </div>
            </div>
            <button type="button" className={`${ghost} md:mt-6`} onClick={() => updateOptions(options.filter((_, i) => i !== index))}>Remover</button>
          </div>
          {suggestions.length > 0 && <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500">Sugestões:</span>
            {suggestions.map((sug) => <button key={sug} type="button" onClick={() => addValue(sug)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-600 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:border-dino-red hover:text-white">
              {isColor && colorSwatch(sug) && <i aria-hidden className="h-3 w-3 rounded-full border border-white/25" style={{ background: colorSwatch(sug) ?? undefined }} />}+ {sug}</button>)}
          </div>}
        </div>;
      })}
      {hasOptions && options.length < 4 && <button type="button" className={`${ghost} justify-self-start`} onClick={addOption}>+ Outra opção</button>}

      <div className="overflow-x-auto"><table className={`w-full text-left text-sm ${extras ? "min-w-[920px]" : "min-w-[640px]"}`}>
        <thead><tr className="text-[11px] uppercase tracking-wide text-zinc-500">
          <th className="pb-2 pr-2 font-bold">{hasOptions ? "Variação" : "Produto"}</th>
          {extras && <th className="pb-2 pr-2 font-bold">Foto</th>}
          <th className="pb-2 pr-2 font-bold">Preço (R$) *</th>
          <th className="pb-2 pr-2 font-bold">Preço original</th>
          {extras && <th className="pb-2 pr-2 font-bold">Preço no Pix</th>}
          <th className="pb-2 pr-2 font-bold">Estoque</th><th className="pb-2 pr-2 font-bold">Mínimo</th><th className="pb-2 font-bold">Parcelas</th>
        </tr></thead>
        <tbody>{variants.flatMap((v) => {
          const price = Number(v.price);
          const cash = Number(v.cashPrice);
          const cashBad = v.cashPrice !== "" && (!Number.isFinite(cash) || cash <= 0 || (price > 0 && cash >= price));
          const cashOff = v.cashPrice !== "" && !cashBad && price > 0 ? Math.round((1 - cash / price) * 100) : 0;
          const photo = media.find((m) => m.url === v.imageUrl);
          const rows = [<tr key={v.key} className="border-t border-zinc-800">
          <td className="py-2 pr-2 align-middle"><div className="font-semibold text-white">{optionLabel(v)}</div>{v.sku && <div className="font-mono text-[11px] text-zinc-500">{v.sku}</div>}</td>
          {extras && <td className="py-2 pr-2">
            <button type="button" onClick={() => setPickerFor(pickerFor === v.key ? null : v.key)} aria-expanded={pickerFor === v.key} aria-label={`Escolher a foto de ${optionLabel(v)}`} disabled={media.length === 0} title={media.length === 0 ? "Envie imagens do produto primeiro" : "Escolher a foto desta variação"} className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 text-[10px] font-bold text-zinc-500 transition hover:border-dino-red disabled:opacity-40">
              {photo ? /* eslint-disable-next-line @next/next/no-img-element -- pré-visualização no admin */ <img src={photo.url} alt="" className="h-full w-full object-cover" /> : "Foto"}
            </button>
          </td>}
          <td className="py-2 pr-2"><input aria-label="Preço" className={cell} type="number" step="0.01" min="0" required value={v.price} onChange={(e) => patchVariant(v.key, { price: e.target.value })} /></td>
          <td className="py-2 pr-2"><input aria-label="Preço original" className={cell} type="number" step="0.01" min="0" value={v.compareAt} onChange={(e) => patchVariant(v.key, { compareAt: e.target.value })} /></td>
          {extras && <td className="py-2 pr-2">
            <input aria-label="Preço no Pix" aria-invalid={cashBad} className={`${cell} ${cashBad ? "!border-red-500" : ""}`} type="number" step="0.01" min="0" placeholder="Sem desconto" value={v.cashPrice} onChange={(e) => patchVariant(v.key, { cashPrice: e.target.value })} />
            {cashBad ? <span className="mt-0.5 block text-[10px] font-semibold text-red-300">Use um valor menor que o preço</span> : cashOff > 0 ? <span className="mt-0.5 block text-[10px] font-semibold text-emerald-400">{cashOff}% abaixo do preço</span> : null}
          </td>}
          <td className="py-2 pr-2"><input aria-label="Estoque" className={cell} type="number" min="0" value={v.stock} onChange={(e) => patchVariant(v.key, { stock: e.target.value })} /></td>
          <td className="py-2 pr-2"><input aria-label="Estoque mínimo" className={cell} type="number" min="0" value={v.minStock} onChange={(e) => patchVariant(v.key, { minStock: e.target.value })} /></td>
          <td className="py-2"><input aria-label="Máximo de parcelas" className={cell} type="number" min="1" max="12" value={v.maxInstallments} onChange={(e) => patchVariant(v.key, { maxInstallments: e.target.value })} /></td>
        </tr>];
          if (extras && pickerFor === v.key) {
            rows.push(<tr key={`${v.key}-photo`}><td colSpan={8} className="pb-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-400">Foto de <strong className="text-white">{optionLabel(v)}</strong>: ao escolher esta variação, a loja mostra esta imagem como principal. Escolha entre as imagens do produto.</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  <li><button type="button" onClick={() => { patchVariant(v.key, { imageUrl: "" }); setPickerFor(null); }} aria-pressed={!photo} className={`grid h-16 w-16 place-items-center rounded-lg border text-[10px] font-bold ${!photo ? "border-dino-red text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>Sem foto própria</button></li>
                  {media.map((m, i) => <li key={`${m.url}-${i}`}><button type="button" onClick={() => { patchVariant(v.key, { imageUrl: m.url }); setPickerFor(null); }} aria-pressed={v.imageUrl === m.url} aria-label={`Usar a imagem ${i + 1}`} className={`h-16 w-16 overflow-hidden rounded-lg border bg-zinc-900 ${v.imageUrl === m.url ? "border-dino-red ring-2 ring-dino-red/40" : "border-zinc-700 hover:border-zinc-500"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização no admin */}
                    <img src={m.url} alt={m.alt} className="h-full w-full object-contain" />
                  </button></li>)}
                </ul>
              </div>
            </td></tr>);
          }
          return rows;
        })}</tbody>
      </table></div>
      {extras
        ? <p className="text-xs text-zinc-500">Preço no Pix: valor cobrado quando o cliente escolhe Pix no checkout (cartão e débito pagam o preço normal). Vazio = sem preço especial. A foto da variação aparece como imagem principal quando o cliente escolhe essa variação.</p>
        : <p className="text-xs text-zinc-500">Preço no Pix e foto por variação ficam disponíveis assim que a atualização 20261125000018 do banco for aplicada.</p>}
    </div>

    <div className={`${card} md:grid-cols-4`}><div className="md:col-span-4"><h2 className="font-bold text-white">Dimensões para entrega</h2><p className="mt-1 text-xs text-zinc-500">Embalagem pronta para envio (vale para todas as variações). Peso em gramas; medidas em milímetros.</p></div>
      {field("weightGrams", "Peso (g)", { type: "number", placeholder: "Ex.: 4500" })}{field("heightMm", "Altura (mm)", { type: "number", placeholder: "Ex.: 150" })}{field("widthMm", "Largura (mm)", { type: "number", placeholder: "Ex.: 400" })}{field("lengthMm", "Comprimento (mm)", { type: "number", placeholder: "Ex.: 300" })}
    </div>

    <div className={`${card} md:grid-cols-2`}>
      <div className="md:col-span-2"><h2 className="font-bold text-white">Conteúdo</h2></div>
      {field("tagline", "Resumo curto")}
      <label className="block"><span className={label}>Vídeo (YouTube ou Vimeo)</span><input className={input} value={form.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=..." onChange={(e) => set("videoUrl", e.target.value)} />
        {form.videoUrl && <span className={`mt-1 block text-xs ${video ? "text-emerald-400" : "text-amber-400"}`}>{video ? `Vídeo reconhecido (${video.provider === "youtube" ? "YouTube" : "Vimeo"}). A loja abre numa janela de reprodução.` : "Link não reconhecido."}</span>}</label>
      <RichTextEditor value={form.description ?? ""} onChange={(value) => set("description", value)} />
      <label className="block"><span className={label}>O que vem na caixa</span><textarea className={`${input} h-36 py-3`} value={inBoxText} placeholder={"Um item por linha\nConsole PlayStation 5\nControle DualSense\nCabo HDMI"} onChange={(e) => setInBoxText(e.target.value)} /><span className="mt-1 block text-xs text-zinc-500">Sem itens, a seção não aparece na loja.</span></label>
      <label className="block"><span className={label}>Especificações</span><textarea className={`${input} h-36 py-3 font-mono text-xs`} value={specsText} placeholder={"# Geral\nProcessador: AMD Zen 2\nArmazenamento: 825 GB SSD\n\n# Vídeo\nResolução: até 8K"} onChange={(e) => setSpecsText(e.target.value)} /><span className="mt-1 block text-xs text-zinc-500">&quot;Rótulo: valor&quot; por linha; &quot;# Nome&quot; abre um novo grupo.</span></label>
      <div className="md:col-span-2"><div className="flex items-center justify-between"><span className={label}>Perguntas frequentes</span><button type="button" className={ghost} onClick={() => setFaq((c) => [...c, { q: "", a: "" }])}>+ Pergunta</button></div>
        {faq.map((item, i) => <div key={i} className="mt-2 grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:grid-cols-[1fr_1.4fr_auto]">
          <input aria-label={`Pergunta ${i + 1}`} className={cell} value={item.q} placeholder="Pergunta" onChange={(e) => setFaq((c) => c.map((f, j) => (j === i ? { ...f, q: e.target.value } : f)))} />
          <input aria-label={`Resposta ${i + 1}`} className={cell} value={item.a} placeholder="Resposta" onChange={(e) => setFaq((c) => c.map((f, j) => (j === i ? { ...f, a: e.target.value } : f)))} />
          <button type="button" className={ghost} onClick={() => setFaq((c) => c.filter((_, j) => j !== i))} aria-label="Remover pergunta">✕</button>
        </div>)}
        <span className="mt-1 block text-xs text-zinc-500">Sem perguntas, a seção não aparece na loja.</span></div>
      <div className="md:col-span-2"><span className={label}>Tags</span>
        <div className="gd-chips mt-1">
          {tags.map((tag) => <span key={tag} className="gd-chip">{tag}<button type="button" aria-label={`Remover ${tag}`} onClick={() => setTags((c) => c.filter((t) => t !== tag))}>✕</button></span>)}
          <input list="tag-suggestions" className="gd-bare text-sm text-white" value={tagDraft} placeholder="Digite e pressione Enter (sem repetir plataforma ou tipo)" onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && tagDraft.trim()) { e.preventDefault(); addTags(tagDraft); } }} onBlur={() => tagDraft.trim() && addTags(tagDraft)} />
          <datalist id="tag-suggestions">{meta.tags.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <span className="mt-1 block text-xs text-zinc-500">As tags são limpas ao salvar: sem duplicadas, sem acento/caixa diferente e sem termos genéricos (jogo, usado, nome da plataforma).</span>
      </div>
    </div>

    <ProductHighlightsSection value={highlights} onChange={setHighlights} usage={usage} published={form.status === "published"} />
    {message && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}
    <div className="flex gap-3"><button disabled={saving || uploading} className="rounded-xl bg-dino-red px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? "Salvando..." : productId ? "Salvar alterações" : "Criar produto"}</button><button type="button" onClick={() => router.back()} className="rounded-xl border border-zinc-700 px-6 py-3 font-bold text-zinc-300">Cancelar</button></div>
  </form>;
}
