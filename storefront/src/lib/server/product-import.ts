import "server-only";
import { fold, normalizeTags, optionCode } from "@/lib/catalog-normalize";
import {
  CSV_COLUMNS, EXAMPLE_PREFIX, MAX_IMPORT_BYTES, MAX_IMPORT_PRODUCTS, MAX_IMPORT_ROWS, columnsFor, parseCsv, parseNumber, toCsv, unguard,
} from "@/lib/product-csv";
import { PRODUCT_TYPES, TYPE_LABEL } from "./product-admin";
import { getSql } from "./sql";
import { variantExtrasSupported } from "./variant-support";

// ---------------------------------------------------------------------------- exportar
const brl = (n: unknown) => (n === null || n === undefined || n === "" ? "" : Number(n).toFixed(2).replace(".", ","));
const num = (n: unknown) => (n === null || n === undefined ? "" : String(n));

type ExportRow = {
  sku: string; name: string; category: string; product_type: string | null; condition: string; status: string; visibility: string; brand: string | null;
  platform: string | null; release_year: string | null; tagline: string | null; badge: string | null; description: string | null; warranty_months: number | null;
  tags: string | null; images: string | null; id: string; vsku: string | null; option_values: Record<string, string> | null; price: string | number | null; compare_at: string | number | null;
  cash_price?: string | number | null; image_url?: string | null; max_installments: number | null; weight_grams: number | null; width_mm: number | null; height_mm: number | null; length_mm: number | null;
  stock: number | null; min_stock: number | null;
};

/** Todos os produtos (qualquer status), uma linha por variação ativa, no mesmo formato do modelo de importação. */
export async function exportProductsCsv(): Promise<{ csv: string; products: number; rows: number }> {
  const sql = await getSql();
  const extras = await variantExtrasSupported();
  const rows = await sql.query<ExportRow>(
    `with recursive t as (
       select id, name::text as label from categories where parent_id is null
       union all
       select c.id, t.label || ' › ' || c.name from categories c join t on c.parent_id = t.id
     )
     select p.id, p.sku, p.name, t.label as category, p.condition::text as condition, p.status::text as status, p.visibility, p.brand, p.tagline, p.badge, p.description, p.warranty_months,
       (select pf.facet_value from product_facets pf where pf.product_id = p.id and pf.facet_key = 'product_type' limit 1) as product_type,
       (select pf.facet_value from product_facets pf where pf.product_id = p.id and pf.facet_key = 'platform' limit 1) as platform,
       (select pf.facet_value from product_facets pf where pf.product_id = p.id and pf.facet_key = 'release_year' limit 1) as release_year,
       (select string_agg(tg.name, '|' order by tg.name) from product_tags pt join tags tg on tg.id = pt.tag_id where pt.product_id = p.id) as tags,
       (select string_agg(m.url, '|' order by m.position) from product_media m where m.product_id = p.id and m.kind = 'image') as images,
       v.sku as vsku, v.option_values, v.price, v.compare_at, ${extras ? "v.cash_price, v.image_url," : ""} v.max_installments, v.weight_grams, v.width_mm, v.height_mm, v.length_mm,
       (select coalesce(sum(il.on_hand), 0) from inventory_levels il where il.variant_id = v.id)::int as stock,
       (select coalesce(max(il.min_level), 0) from inventory_levels il where il.variant_id = v.id)::int as min_stock
     from products p
     join t on t.id = p.category_id
     left join product_variants v on v.product_id = p.id and v.is_active
     order by p.sku, v.price, v.created_at`,
  );
  const optionRows = await sql.query<{ product_id: string; code: string; name: string }>("select product_id, code, name from product_options order by product_id, position");
  const optionNames = new Map<string, { code: string; name: string }[]>();
  for (const o of optionRows) optionNames.set(o.product_id, [...(optionNames.get(o.product_id) ?? []), { code: o.code, name: o.name }]);

  const cols = columnsFor(extras);
  const lines = rows.map((r) => {
    const defs = optionNames.get(r.id) ?? [];
    const opcoes = defs.filter((d) => r.option_values?.[d.code]).map((d) => `${d.name}=${r.option_values?.[d.code]}`).join("|");
    const cells: Record<string, string> = {
      sku: r.sku, nome: r.name, categoria: r.category ?? "", tipo: r.product_type ?? "", condicao: r.condition, status: r.status, visibilidade: r.visibility,
      marca: r.brand ?? "", plataforma: r.platform ?? "", ano: r.release_year ?? "", subtitulo: r.tagline ?? "", selo: r.badge ?? "", descricao: r.description ?? "",
      garantia_meses: num(r.warranty_months), etiquetas: r.tags ?? "", imagens: r.images ?? "", sku_variacao: r.vsku ?? "", opcoes, preco: brl(r.price),
      preco_original: r.compare_at !== null && Number(r.compare_at) > Number(r.price ?? 0) ? brl(r.compare_at) : "", preco_pix: brl(r.cash_price), estoque: num(r.stock), estoque_minimo: num(r.min_stock),
      parcelas_max: num(r.max_installments), imagem_variacao: r.image_url ?? "", peso_g: num(r.weight_grams), largura_mm: num(r.width_mm), altura_mm: num(r.height_mm), comprimento_mm: num(r.length_mm),
    };
    return cols.map((c) => cells[c.key] ?? "");
  });
  return { csv: toCsv(cols.map((c) => c.header), lines), products: new Set(rows.map((r) => r.id)).size, rows: rows.length };
}

/** Arquivo modelo: cabeçalho + duas linhas de exemplo (o importador as recusa até serem apagadas). */
export async function templateCsv(): Promise<string> {
  const extras = await variantExtrasSupported();
  const cols = columnsFor(extras);
  return toCsv(cols.map((c) => c.header), [0, 1].map((i) => cols.map((c) => c.example?.[i as 0 | 1] ?? "")));
}

// ---------------------------------------------------------------------------- importar
export type ImportChange = { label: string; before: string; after: string };
export type ImportItem = {
  key: string;
  /** Linhas do arquivo (como numeradas na planilha, cabeçalho = 1). */
  rows: number[];
  action: "create" | "update" | "error";
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  variants: number;
  errors: string[];
  warnings: string[];
  changes: ImportChange[];
};
export type ImportAnalysis = {
  fileErrors: string[];
  ignoredColumns: string[];
  extras: boolean;
  totalRows: number;
  items: ImportItem[];
  counts: { create: number; update: number; error: number };
};
type Prepared = { item: ImportItem; payload: Record<string, unknown> | null };

const STATUS_MAP: Record<string, string> = { rascunho: "draft", draft: "draft", publicado: "published", published: "published", agendado: "scheduled", scheduled: "scheduled", arquivado: "archived", archived: "archived" };
const VIS_MAP: Record<string, string> = { visivel: "visible", visible: "visible", oculto: "hidden", hidden: "hidden" };
const COND_MAP: Record<string, string> = { novo: "novo", seminovo: "seminovo", "semi novo": "seminovo", raridade: "raridade", "pre venda": "pre_venda", prevenda: "pre_venda", "pre_venda": "pre_venda" };
const TYPE_MAP: Record<string, string> = Object.fromEntries([
  ...PRODUCT_TYPES.map((t) => [t, t] as const),
  ...Object.entries(TYPE_LABEL).map(([k, v]) => [fold(v), k] as const),
  ["acessorios", "acessorio"], ["pc gamer", "pc"], ["gift card", "gift"], ["periferico", "periferico"], ["retro", "retro"], ["jogos", "jogo"], ["consoles", "console"],
]);

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const optKey = (o: Record<string, string>) => JSON.stringify(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

type ExistingProduct = { id: string; sku: string; name: string; status: string; visibility: string; brand: string | null; category: string | null; min_price: string | number | null; stock: number; images: number; variants: number };
type ExistingVariant = { id: string; product_id: string; sku: string | null; option_values: Record<string, string>; compare_at: string | number | null; weight_grams: number | null; width_mm: number | null; height_mm: number | null; length_mm: number | null; max_installments: number };

type Cells = Record<string, string>;

/** Lê o arquivo, valida tudo contra o banco e monta o que será gravado. Não altera nada. */
async function prepare(csv: string): Promise<{ analysis: ImportAnalysis; prepared: Prepared[] }> {
  const extras = await variantExtrasSupported();
  const empty = (fileErrors: string[]): { analysis: ImportAnalysis; prepared: Prepared[] } => ({
    analysis: { fileErrors, ignoredColumns: [], extras, totalRows: 0, items: [], counts: { create: 0, update: 0, error: 0 } }, prepared: [],
  });
  if (Buffer.byteLength(csv, "utf8") > MAX_IMPORT_BYTES) return empty([`Arquivo grande demais (máximo ${Math.round(MAX_IMPORT_BYTES / 1_000_000)} MB). Divida em partes.`]);
  const { rows: table } = parseCsv(csv);
  if (table.length < 2) return empty(["O arquivo precisa do cabeçalho e de pelo menos uma linha de produto."]);
  if (table.length - 1 > MAX_IMPORT_ROWS) return empty([`Linhas demais (${table.length - 1}). O máximo por importação é ${MAX_IMPORT_ROWS}; divida o arquivo.`]);

  // cabeçalho
  const known = new Map(CSV_COLUMNS.map((c) => [fold(c.header).replace(/ /g, "_"), c.key]));
  const headerKeys = table[0].map((h) => known.get(fold(h).replace(/ /g, "_")) ?? null);
  const ignoredColumns = table[0].filter((_, i) => headerKeys[i] === null && table[0][i].trim() !== "");
  if (!headerKeys.includes("sku")) return empty(["O cabeçalho precisa da coluna “sku”. Baixe o modelo e mantenha os nomes das colunas."]);
  const present = new Set(headerKeys.filter(Boolean) as string[]);
  const extraIgnored = !extras && (present.has("preco_pix") || present.has("imagem_variacao"));

  const lines = table.slice(1).map((cells, i) => {
    const c: Cells = {};
    headerKeys.forEach((k, idx) => { if (k) c[k] = unguard((cells[idx] ?? "").trim()); });
    return { row: i + 2, c };
  });

  // agrupar por produto
  const groups = new Map<string, { row: number; c: Cells }[]>();
  for (const line of lines) {
    const sku = (line.c.sku ?? "").toUpperCase();
    const key = sku ? `sku:${sku}` : `row:${line.row}`;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  if (groups.size > MAX_IMPORT_PRODUCTS) return empty([`Produtos demais (${groups.size}). O máximo por importação é ${MAX_IMPORT_PRODUCTS}; divida o arquivo.`]);

  const sql = await getSql();
  const skus = [...groups.keys()].filter((k) => k.startsWith("sku:")).map((k) => k.slice(4));
  const existing = skus.length
    ? await sql.query<ExistingProduct>(
        `with recursive t as (select id, name::text as label from categories where parent_id is null union all select c.id, t.label || ' › ' || c.name from categories c join t on c.parent_id = t.id)
         select p.id, p.sku, p.name, p.status::text as status, p.visibility, p.brand, t.label as category,
           (select min(v.price) from product_variants v where v.product_id = p.id and v.is_active) as min_price,
           (select coalesce(sum(il.on_hand), 0) from inventory_levels il join product_variants v on v.id = il.variant_id where v.product_id = p.id and v.is_active)::int as stock,
           (select count(*) from product_media m where m.product_id = p.id and m.kind = 'image')::int as images,
           (select count(*) from product_variants v where v.product_id = p.id and v.is_active)::int as variants
         from products p left join t on t.id = p.category_id where upper(p.sku) = any($1::text[])`,
        [skus],
      )
    : [];
  const bySku = new Map(existing.map((p) => [p.sku.toUpperCase(), p]));
  const ids = existing.map((p) => p.id);
  const existingVariants = ids.length
    ? await sql.query<ExistingVariant>("select id, product_id, sku, option_values, compare_at, weight_grams, width_mm, height_mm, length_mm, max_installments from product_variants where product_id = any($1::uuid[]) and is_active", [ids])
    : [];
  const existingOptions = ids.length
    ? await sql.query<{ product_id: string; code: string; name: string; position: number; vals: string[] }>(
        "select o.product_id, o.code, o.name, o.position, coalesce((select jsonb_agg(v.label order by v.position) from product_option_values v where v.option_id = o.id), '[]'::jsonb) as vals from product_options o where o.product_id = any($1::uuid[]) order by o.position",
        [ids],
      )
    : [];
  const existingMedia = ids.length ? await sql.query<{ product_id: string; url: string }>("select product_id, url from product_media where product_id = any($1::uuid[]) and kind = 'image'", [ids]) : [];
  const vskuAll = [...new Set(lines.map((l) => l.c.sku_variacao).filter(Boolean))];
  const vskuOwners = vskuAll.length ? await sql.query<{ sku: string; product_id: string }>("select sku, product_id from product_variants where sku = any($1::text[])", [vskuAll]) : [];
  const vskuOwner = new Map(vskuOwners.map((v) => [v.sku, v.product_id]));

  // categorias: caminho completo, slug ou nome único
  const cats = await sql.query<{ id: string; slug: string; name: string; label: string }>(
    "with recursive t as (select id, slug, name::text as name, name::text as label from categories where parent_id is null union all select c.id, c.slug, c.name::text, t.label || ' › ' || c.name from categories c join t on c.parent_id = t.id) select id, slug, name, label from t",
  );
  const catKey = (s: string) => fold(s.replace(/[>›»]/g, " > ").replace(/\s*>\s*/g, " > "));
  const catByPath = new Map(cats.map((c) => [catKey(c.label), c]));
  const catBySlug = new Map(cats.map((c) => [fold(c.slug), c]));
  const nameCount = new Map<string, number>();
  for (const c of cats) nameCount.set(fold(c.name), (nameCount.get(fold(c.name)) ?? 0) + 1);
  const catByName = new Map(cats.filter((c) => nameCount.get(fold(c.name)) === 1).map((c) => [fold(c.name), c]));
  const findCategory = (raw: string) => catByPath.get(catKey(raw)) ?? catBySlug.get(fold(raw)) ?? catByName.get(fold(raw)) ?? null;

  const seenVsku = new Map<string, string>();
  const prepared: Prepared[] = [];

  for (const [key, group] of groups) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const first = group[0].c;
    const rowsOf = group.map((g) => g.row);
    const at = (row: number, msg: string) => `Linha ${row}: ${msg}`;
    const skuRaw = first.sku ?? "";
    const exist = skuRaw ? bySku.get(skuRaw.toUpperCase()) : undefined;
    const isNew = !exist;
    const payload: Record<string, unknown> = {};
    const changes: ImportChange[] = [];

    if (extraIgnored) warnings.push("As colunas de preço no Pix e imagem da variação foram ignoradas: a atualização do banco ainda não foi aplicada.");

    // Linha de exemplo do modelo
    if ((first.nome ?? "").startsWith(EXAMPLE_PREFIX)) {
      errors.push(at(rowsOf[0], "linha de exemplo do modelo. Apague-a ou substitua pelos seus dados."));
    }

    // ---- campos do produto (a primeira linha manda; células vazias não alteram um produto existente)
    for (const g of group.slice(1)) {
      for (const k of ["nome", "categoria", "tipo", "condicao", "status", "visibilidade", "marca", "plataforma", "ano", "subtitulo", "selo", "descricao", "garantia_meses", "etiquetas", "imagens"]) {
        if (g.c[k] && g.c[k] !== (first[k] ?? "")) { warnings.push(at(g.row, `“${k}” difere da primeira linha do produto; vale a primeira.`)); break; }
      }
    }
    if (skuRaw && !/^[A-Za-z0-9._-]{3,40}$/.test(skuRaw)) errors.push(at(rowsOf[0], `SKU “${skuRaw}” inválido (use letras, números, ponto, hífen ou sublinhado, de 3 a 40 caracteres).`));
    if (isNew && skuRaw) payload.sku = skuRaw;

    const name = first.nome ?? "";
    if (name) { if (name.length > 200) errors.push(at(rowsOf[0], "nome passa de 200 caracteres.")); payload.name = name; }
    else if (isNew) errors.push(at(rowsOf[0], "nome é obrigatório em produto novo."));

    let categoryLabel = exist?.category ?? "";
    if (first.categoria) {
      const cat = findCategory(first.categoria);
      if (!cat) errors.push(at(rowsOf[0], `categoria “${first.categoria}” não encontrada. Use o caminho completo (ex.: Consoles › Xbox) ou o slug.`));
      else { payload.categoryId = cat.id; categoryLabel = cat.label; }
    } else if (isNew) errors.push(at(rowsOf[0], "categoria é obrigatória em produto novo."));

    if (first.tipo) {
      const t = TYPE_MAP[fold(first.tipo)];
      if (!t) errors.push(at(rowsOf[0], `tipo “${first.tipo}” inválido. Use: ${PRODUCT_TYPES.join(", ")}.`));
      else { payload.productType = t; payload.typeLabel = TYPE_LABEL[t]; }
    } else if (isNew) errors.push(at(rowsOf[0], "tipo é obrigatório em produto novo (console, jogo, acessorio, pc, notebook, periferico, retro, gift ou hardware)."));

    if (first.condicao) {
      const c = COND_MAP[fold(first.condicao)];
      if (!c) errors.push(at(rowsOf[0], `condicao “${first.condicao}” inválida. Use: novo, seminovo, raridade ou pre_venda.`)); else payload.condition = c;
    } else if (isNew) payload.condition = "novo";

    let status = exist?.status ?? "draft";
    if (first.status) {
      const st = STATUS_MAP[fold(first.status)];
      if (!st) errors.push(at(rowsOf[0], `status “${first.status}” inválido. Use: rascunho, publicado, agendado ou arquivado.`));
      else { payload.status = st; status = st; }
    } else if (isNew) payload.status = "draft";

    let visibility = exist?.visibility ?? "visible";
    if (first.visibilidade) {
      const v = VIS_MAP[fold(first.visibilidade)];
      if (!v) errors.push(at(rowsOf[0], `visibilidade “${first.visibilidade}” inválida. Use: visivel ou oculto.`)); else { payload.visibility = v; visibility = v; }
    } else if (isNew) payload.visibility = "visible";

    if (first.marca) payload.brand = first.marca;
    if (first.plataforma) payload.platform = first.plataforma;
    if (first.ano) payload.releaseYear = first.ano;
    if (first.subtitulo) payload.tagline = first.subtitulo.slice(0, 240);
    if (first.selo) payload.badge = first.selo.slice(0, 60);
    if (first.descricao) payload.description = first.descricao.slice(0, 20000);
    if (first.garantia_meses) {
      const n = parseNumber(first.garantia_meses);
      if (n === null || !Number.isInteger(n) || n < 0 || n > 240) errors.push(at(rowsOf[0], "garantia_meses precisa ser um número inteiro (0 a 240).")); else payload.warrantyMonths = n;
    }
    if (first.etiquetas) payload.tags = normalizeTags(first.etiquetas.split("|"), new Map(), { name: name || exist?.name }, 12);

    // ---- imagens do produto
    let galleryUrls: string[] = existingMedia.filter((m) => m.product_id === exist?.id).map((m) => m.url);
    if (first.imagens) {
      const urls = first.imagens.split("|").map((u) => u.trim()).filter(Boolean);
      const bad = urls.find((u) => !/^https?:\/\//i.test(u));
      if (bad) errors.push(at(rowsOf[0], `link de imagem inválido: “${bad.slice(0, 60)}”. Use endereços que comecem com https://.`));
      else if (urls.length > 20) errors.push(at(rowsOf[0], "no máximo 20 imagens por produto."));
      else if (exist && urls.join("|") === galleryUrls.join("|")) {
        // Mesma galeria do banco: não mexe (regravar apagaria os textos alternativos e os recortes das fotos).
      } else {
        galleryUrls = urls;
        payload.media = urls.map((url) => ({ url, alt: name || exist?.name || "" }));
        if (exist && exist.images > 0) warnings.push(`A galeria atual (${exist.images} ${exist.images === 1 ? "imagem" : "imagens"}) será substituída por ${urls.length}.`);
      }
    }

    // ---- variações
    type V = { row: number; vsku: string; options: Record<string, string>; price: number | null; compareAt: number | null; cash: number | null | undefined; image: string; stock: number | null; minStock: number | null; installments: number | null; weight: number | null; width: number | null; height: number | null; length: number | null };
    const vs: V[] = [];
    const intCell = (row: number, label: string, raw: string | undefined, max: number): number | null => {
      if (!raw) return null;
      const n = parseNumber(raw);
      if (n === null || !Number.isInteger(n) || n < 0 || n > max) { errors.push(at(row, `${label} precisa ser um número inteiro de 0 a ${max}.`)); return null; }
      return n;
    };
    for (const g of group) {
      const c = g.c;
      const options: Record<string, string> = {};
      if (c.opcoes) {
        for (const part of c.opcoes.split("|")) {
          const [n, ...rest] = part.split("=");
          const optName = (n ?? "").trim();
          const val = rest.join("=").trim();
          if (!optName || !val) { errors.push(at(g.row, `opcoes “${c.opcoes.slice(0, 50)}” inválidas. Use o formato Nome=Valor|Nome=Valor (ex.: Cor=Branco|Armazenamento=1TB).`)); break; }
          options[optName] = val;
        }
      }
      const priceN = c.preco ? parseNumber(c.preco) : null;
      if (c.preco && (priceN === null || priceN < 0 || priceN > 10_000_000)) errors.push(at(g.row, `preco “${c.preco}” inválido. Use números, ex.: 479,90.`));
      const cmp = c.preco_original ? parseNumber(c.preco_original) : null;
      if (c.preco_original && cmp === null) errors.push(at(g.row, `preco_original “${c.preco_original}” inválido.`));
      let cash: number | null | undefined;
      if (extras && present.has("preco_pix") && c.preco_pix) {
        const n = parseNumber(c.preco_pix);
        if (n === null || n < 0) errors.push(at(g.row, `preco_pix “${c.preco_pix}” inválido.`));
        else cash = n === 0 ? null : n;
      }
      const inst = intCell(g.row, "parcelas_max", c.parcelas_max, 12);
      if (inst !== null && inst < 1) errors.push(at(g.row, "parcelas_max deve ficar entre 1 e 12."));
      const vsku = c.sku_variacao ?? "";
      if (vsku && !/^[A-Za-z0-9._-]{3,60}$/.test(vsku)) errors.push(at(g.row, `sku_variacao “${vsku}” inválido.`));
      vs.push({
        row: g.row, vsku, options, price: priceN, compareAt: cmp, cash, image: extras ? c.imagem_variacao ?? "" : "", stock: intCell(g.row, "estoque", c.estoque, 1_000_000),
        minStock: intCell(g.row, "estoque_minimo", c.estoque_minimo, 1_000_000), installments: inst, weight: intCell(g.row, "peso_g", c.peso_g, 200_000),
        width: intCell(g.row, "largura_mm", c.largura_mm, 200_000), height: intCell(g.row, "altura_mm", c.altura_mm, 200_000), length: intCell(g.row, "comprimento_mm", c.comprimento_mm, 200_000),
      });
    }

    const hasPrice = vs.some((v) => v.price !== null);
    const wantsVariants = isNew || hasPrice;
    let priceText = exist?.min_price != null ? money(Number(exist.min_price)) : "—";
    let stockText = exist ? String(exist.stock) : "—";
    let variantCount = exist?.variants ?? 0;

    if (wantsVariants) {
      for (const v of vs) if (v.price === null) errors.push(at(v.row, "preco é obrigatório em todas as linhas deste produto."));
      if (vs.length > 60) errors.push(`Variações demais (${vs.length}); o máximo é 60 por produto.`);

      // opções: todas as linhas com os mesmos nomes de opção
      const optNames = Object.keys(vs[0].options);
      for (const v of vs.slice(1)) {
        const names = Object.keys(v.options);
        if (names.length !== optNames.length || names.some((n) => !(n in vs[0].options))) { errors.push(at(v.row, "todas as variações do produto precisam ter as mesmas opções (ex.: todas com Cor e Armazenamento).")); break; }
      }
      // Sem a coluna opcoes em produto que já tem opções: mantém as opções e os valores atuais de cada variação.
      const mineOptions = existingOptions.filter((o) => o.product_id === exist?.id);
      const useExistingOptions = optNames.length === 0 && exist !== undefined && mineOptions.length > 0;
      const optDefs = useExistingOptions
        ? mineOptions.map((o) => ({ code: o.code, name: o.name, values: o.vals, position: o.position }))
        : optNames.map((n, i) => ({ code: optionCode(n), name: n, values: [...new Set(vs.map((v) => v.options[n]).filter(Boolean))], position: i }));
      const coded = vs.map((v) => ({ v, opts: Object.fromEntries(Object.entries(v.options).map(([n, val]) => [optionCode(n), val])) }));
      if (!useExistingOptions) {
        const seenCombo = new Set<string>();
        for (const { v, opts } of coded) {
          const k = optKey(opts);
          if (seenCombo.has(k)) errors.push(at(v.row, "combinação de opções repetida neste produto."));
          seenCombo.add(k);
        }
      }
      const seenInProduct = new Set<string>();

      // casar com variações existentes: por SKU da variação, depois por opções; produto de 1 variação para 1 linha reaproveita
      const mine = existingVariants.filter((x) => x.product_id === exist?.id);
      const used = new Set<string>();
      const variantsPayload: Record<string, unknown>[] = [];
      for (const { v, opts } of coded) {
        let match: ExistingVariant | undefined;
        if (v.vsku) {
          if (seenInProduct.has(v.vsku)) errors.push(at(v.row, `sku_variacao “${v.vsku}” repetido neste produto.`));
          seenInProduct.add(v.vsku);
          const owner = vskuOwner.get(v.vsku);
          if (owner && owner !== exist?.id) errors.push(at(v.row, `sku_variacao “${v.vsku}” já pertence a outro produto.`));
          match = mine.find((x) => x.sku === v.vsku);
          const seenIn = seenVsku.get(v.vsku);
          if (seenIn && seenIn !== key) errors.push(at(v.row, `sku_variacao “${v.vsku}” repetido em outro produto do arquivo.`));
          seenVsku.set(v.vsku, key);
        }
        if (!match) match = mine.find((x) => !used.has(x.id) && optKey(x.option_values ?? {}) === optKey(opts));
        if (!match && mine.length === 1 && coded.length === 1) match = mine[0];
        if (match) used.add(match.id);
        if (useExistingOptions && !match) errors.push(at(v.row, "variação nova em produto que já tem opções: informe a coluna opcoes."));

        if (v.cash != null && v.price !== null && v.cash >= v.price) errors.push(at(v.row, "preco_pix precisa ser menor que o preco."));
        let compareAt: number | null = v.compareAt;
        if (compareAt !== null && v.price !== null && compareAt <= v.price) { warnings.push(at(v.row, "preco_original menor ou igual ao preco: ignorado.")); compareAt = null; }
        if (compareAt === null && match && !v.compareAt && match.compare_at !== null && v.price !== null && Number(match.compare_at) > v.price) compareAt = Number(match.compare_at);

        let imageUrl: string | undefined;
        if (extras && present.has("imagem_variacao") && v.image) {
          if (!/^https?:\/\//i.test(v.image)) errors.push(at(v.row, "imagem_variacao inválida (use um link https)."));
          else if (!galleryUrls.includes(v.image)) warnings.push(at(v.row, "imagem_variacao não está entre as imagens do produto: ignorada. Coloque o mesmo link também na coluna imagens."));
          else imageUrl = v.image;
        }
        variantsPayload.push({
          ...(match ? { id: match.id } : v.vsku ? { sku: v.vsku } : {}),
          options: useExistingOptions ? (match?.option_values ?? {}) : opts,
          price: v.price,
          compareAt,
          ...(v.stock !== null ? { stock: v.stock } : {}),
          ...(v.minStock !== null ? { minStock: v.minStock } : {}),
          maxInstallments: v.installments ?? match?.max_installments ?? 10,
          weightGrams: v.weight ?? match?.weight_grams ?? null,
          widthMm: v.width ?? match?.width_mm ?? null,
          heightMm: v.height ?? match?.height_mm ?? null,
          lengthMm: v.length ?? match?.length_mm ?? null,
          active: true,
          ...(v.cash !== undefined ? { cashPrice: v.cash } : {}),
          ...(imageUrl !== undefined ? { imageUrl } : {}),
        });
      }
      payload.variants = variantsPayload;
      payload.options = optDefs;
      if (exist) {
        const dropped = mine.filter((x) => !used.has(x.id)).length;
        if (dropped > 0) warnings.push(`${dropped} ${dropped === 1 ? "variação existente não está" : "variações existentes não estão"} no arquivo e ${dropped === 1 ? "será desativada" : "serão desativadas"}.`);
      }
      const prices = vs.map((v) => v.price).filter((p): p is number => p !== null);
      if (prices.length) priceText = prices.length > 1 && Math.min(...prices) !== Math.max(...prices) ? `${money(Math.min(...prices))} a ${money(Math.max(...prices))}` : money(prices[0]);
      stockText = vs.every((v) => v.stock === null) ? (exist ? stockText : "—") : String(vs.reduce((s, v) => s + (v.stock ?? 0), 0));
      variantCount = vs.length;
    } else if (exist && vs.some((v) => v.stock !== null)) {
      // só estoque, sem preço: não mexemos nas variações (preço e opções ficam como estão)
      warnings.push("Linhas com estoque mas sem preço: o estoque só é gravado quando o preço da variação também vem no arquivo.");
    }
    if (exist && !wantsVariants && !payload.name && Object.keys(payload).length === 0) warnings.push("Nenhum campo para alterar neste produto.");

    // ---- antes → depois (somente o que dá para comparar com segurança)
    if (exist) {
      const diff = (label: string, before: string, after: string) => { if (before !== after) changes.push({ label, before: before || "—", after: after || "—" }); };
      if (payload.name) diff("Nome", exist.name, String(payload.name));
      if (payload.categoryId) diff("Categoria", exist.category ?? "", categoryLabel);
      if (payload.status) diff("Status", exist.status, status);
      if (payload.visibility) diff("Visibilidade", exist.visibility, visibility);
      if (payload.brand) diff("Marca", exist.brand ?? "", String(payload.brand));
      if (wantsVariants) {
        diff("Preço", exist.min_price != null ? money(Number(exist.min_price)) : "", priceText);
        diff("Estoque", String(exist.stock), stockText);
        diff("Variações", String(exist.variants), String(variantCount));
      }
      if (payload.media) diff("Imagens", String(exist.images), String((payload.media as unknown[]).length));
    }

    const item: ImportItem = {
      key, rows: rowsOf, action: errors.length ? "error" : isNew ? "create" : "update", sku: exist?.sku ?? skuRaw, name: name || exist?.name || "(sem nome)",
      category: categoryLabel, price: priceText, stock: stockText, variants: variantCount, errors, warnings, changes,
    };
    if (exist && !errors.length) payload.id = exist.id;
    prepared.push({ item, payload: errors.length ? null : payload });
  }

  const items = prepared.map((p) => p.item);
  return {
    analysis: {
      fileErrors: [], ignoredColumns, extras, totalRows: lines.length, items,
      counts: { create: items.filter((i) => i.action === "create").length, update: items.filter((i) => i.action === "update").length, error: items.filter((i) => i.action === "error").length },
    },
    prepared,
  };
}

/** Pré-visualização: o que seria criado, atualizado ou recusado. Nada é gravado. */
export async function previewImport(csv: string): Promise<ImportAnalysis> {
  return (await prepare(csv)).analysis;
}

export type ImportResult = { created: number; updated: number; failed: { sku: string; name: string; error: string }[]; skipped: number };

/** Confirma a importação: revalida o arquivo no servidor (o navegador não é confiável) e grava só os produtos sem erro. */
export async function applyImport(csv: string): Promise<{ result: ImportResult; analysis: ImportAnalysis }> {
  const { analysis, prepared } = await prepare(csv);
  const sql = await getSql();
  const result: ImportResult = { created: 0, updated: 0, failed: [], skipped: analysis.counts.error };
  const todo = prepared.filter((p) => p.payload);
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const { item, payload } = todo[next++];
      try {
        await sql.query("select save_product($1::jsonb) as saved", [JSON.stringify(payload)]);
        if (item.action === "create") result.created += 1; else result.updated += 1;
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Falha ao gravar.";
        result.failed.push({ sku: item.sku, name: item.name, error: raw.replace(/^.*?(ERROR:|error:)\s*/i, "").slice(0, 240) });
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  try {
    await sql.query("insert into audit_log (actor_id, action, entity, entity_id, changes) values (null, 'products_import', 'products', 'csv', $1::jsonb)", [
      JSON.stringify({ created: result.created, updated: result.updated, failed: result.failed.length, skipped: result.skipped }),
    ]);
  } catch {
    // a auditoria nunca impede a importação
  }
  return { result, analysis };
}
