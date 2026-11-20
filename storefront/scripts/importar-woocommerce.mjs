// Importa o catálogo exportado do WooCommerce (CSV) para o Supabase da DinoBlack.
//
//   access-hub run -- node scripts/importar-woocommerce.mjs <csv> <ref-do-projeto> [--dry] [--limit N] [--sem-limpar-testes]
//
// - Preços, peso, medidas e estoque seguem o CSV (peso kg→g, cm→mm). Estoque: quantidade exata quando o CSV traz;
//   "em estoque" sem quantidade vira 1; sem estoque vira 0.
// - Produtos sem nenhuma imagem utilizável são descartados. Imagens: baixadas, reduzidas (máx. 1600 px),
//   convertidas para WebP e enviadas ao bucket público "produtos" com nome SEO: <sku>/<slug>-<n>.webp.
// - Tudo que é tema/plugin (Woodmart, Rank Math, Google Listings, Elementor, descontos de plugin) é ignorado.
// - Idempotente: o ID do WooCommerce vira products.legacy_id, então rodar de novo atualiza em vez de duplicar.
//
// Sem --dry usa SUPABASE_ACCESS_TOKEN (injetado pelo Access Hub). Nenhum segredo é impresso.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { htmlToText, summarize, parseVideoUrl, normalizeTags, countTagUsage, fold, slugify, seoImageName } from "../src/lib/catalog-normalize.ts";

const [csvPath, ref] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flag = (name) => process.argv.includes(`--${name}`);
const argValue = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const DRY = flag("dry");
const LIMIT = Number(argValue("limit") || 0);
if (!csvPath || (!DRY && !ref)) { console.error("uso: node scripts/importar-woocommerce.mjs <csv> <ref> [--dry] [--limit N]"); process.exit(1); }
const OUT = join(process.cwd(), ".importacao");
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------- CSV
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const raw = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const head = raw.shift();
const rows = raw.filter((r) => r.length > 5).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));

const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const money = (v) => { const n = num(v); return n == null ? null : Math.round(n * 100) / 100; };

// ---------------------------------------------------------------------------- árvore de categorias
const L3 = [["jogos", "Jogos", "jogo"], ["consoles", "Consoles", "console"], ["acessorios", "Acessórios", "acessorio"]];
const TREE = [
  { slug: "consoles", name: "Consoles" }, { slug: "pc-gamer", name: "PC Gamer" }, { slug: "retro", name: "Retro" }, { slug: "notebooks", name: "Notebooks" },
  { slug: "ps5", name: "PlayStation 5", parent: "consoles", platform: "PlayStation 5", full: true },
  { slug: "ps4", name: "PlayStation 4", parent: "consoles", platform: "PlayStation 4", full: true },
  { slug: "ps3", name: "PlayStation 3", parent: "consoles", platform: "PlayStation 3", full: true },
  { slug: "xbox-series", name: "Xbox Series S|X", parent: "consoles", platform: "Xbox Series S|X", full: true },
  { slug: "xbox-one", name: "Xbox One", parent: "consoles", platform: "Xbox One", full: true },
  { slug: "xbox-360", name: "Xbox 360", parent: "consoles", platform: "Xbox 360", full: true },
  { slug: "switch", name: "Nintendo Switch", parent: "consoles", platform: "Nintendo Switch", full: true },
  { slug: "switch-2", name: "Nintendo Switch 2", parent: "consoles", platform: "Nintendo Switch 2" },
  { slug: "gift-cards", name: "Gift Cards", parent: "consoles" },
  { slug: "pc-memoria-ram", name: "Memória RAM", parent: "pc-gamer" },
  { slug: "pc-placas-mae", name: "Placas-mãe", parent: "pc-gamer" },
  { slug: "pc-ssd", name: "SSD", parent: "pc-gamer" },
  { slug: "retro-ps1", name: "PlayStation 1", parent: "retro", platform: "PlayStation 1" },
  { slug: "retro-ps2", name: "PlayStation 2", parent: "retro", platform: "PlayStation 2" },
  { slug: "retro-nes", name: "NES", parent: "retro", platform: "NES" },
  { slug: "retro-3ds", name: "Nintendo 3DS", parent: "retro", platform: "Nintendo 3DS" },
  { slug: "retro-raros", name: "Raros", parent: "retro" },
];
const TREE_BY_SLUG = new Map(TREE.map((c) => [c.slug, c]));

const PLATFORM_OF = {
  PlayStation: { "PlayStation 5": "ps5", "PlayStation 4": "ps4", "PlayStation 3": "ps3", "PlayStation 2": "retro-ps2", "PlayStation 1": "retro-ps1" },
  Xbox: { "Xbox 360": "xbox-360", "Xbox One": "xbox-one", "Xbox Series S|X": "xbox-series" },
  Nintendo: { "Switch 1": "switch", "Switch 2": "switch-2", NES: "retro-nes", "Nintendo 3DS": "retro-3ds" },
};
const typeOfSegment = (s) => (/^jogos/i.test(s ?? "") ? "jogo" : /^consoles/i.test(s ?? "") ? "console" : /^acess/i.test(s ?? "") ? "acessorio" : null);
const COLLECTION_SEGMENTS = /^(favoritos|greatest hits|platinum( hits)?|kinect)$/i;

function resolvePath(path) {
  const [a, b, c, d] = path;
  if (a === "Gift Card") return { slug: "gift-cards", type: "gift" };
  if (a === "Hardware") return { slug: b === "Memória Ram" ? "pc-memoria-ram" : b === "Placas-mãe" ? "pc-placas-mae" : b === "SSD" ? "pc-ssd" : "pc-gamer", type: "hardware" };
  if (a === "Raros") return { slug: "retro-raros", type: typeOfSegment(b), raro: true };
  const platform = PLATFORM_OF[a]?.[b];
  if (!platform) return null;
  return { slug: platform, type: typeOfSegment(c), collection: [c, d].find((s) => s && COLLECTION_SEGMENTS.test(s)) };
}
const ACCESSORY_RE = /controle|headset|fone|cabo|carregador|base |volante|memory card|cart[aã]o de mem|hd externo|\bhd\b|ssd|c[aâ]mera|suporte|capa |bateria|fonte|dock|sensor|pulseira|adaptador|joystick|gamepad|mouse|teclado|case |kit /i;
function inferType(name) { return /^console|^kit console/i.test(name) ? "console" : ACCESSORY_RE.test(name) ? "acessorio" : "jogo"; }

/** Produto cujas categorias do WooCommerce não dizem a plataforma: decide pelo nome. */
function fallbackByName(name) {
  if (/google play|gift card|c[oó]digo/i.test(name)) return { slug: "gift-cards", type: "gift" };
  if (/dreamcast|super nintendo|retr[oô]|mega drive|atari/i.test(name)) return { slug: "retro", type: /console|tv/i.test(name) ? "console" : null, raro: false };
  if (/hd externo|ssd|mem[oó]ria ram/i.test(name)) return { slug: "pc-gamer", type: "acessorio" };
  const platform = [[/playstation ?5|\bps5\b/i, "ps5"], [/playstation ?4|\bps4\b/i, "ps4"], [/playstation ?3|\bps3\b/i, "ps3"], [/xbox series/i, "xbox-series"], [/xbox one/i, "xbox-one"], [/xbox 360/i, "xbox-360"], [/switch/i, "switch"]].find(([re]) => re.test(name));
  return platform ? { slug: platform[1], type: null } : null;
}

function pickCategory(row) {
  const paths = row["Categorias"].split(",").map((s) => s.trim()).filter((s) => s && s !== "Todos os Produtos")
    .map((s) => s.split(">").map((x) => x.trim())).sort((a, b) => b.length - a.length);
  const found = paths.map(resolvePath).filter(Boolean);
  const best = found.find((f) => f.type) ?? found[0] ?? fallbackByName(row["Nome"]);
  if (!best) return null;
  const type = best.type ?? inferType(row["Nome"]);
  const def = TREE_BY_SLUG.get(best.slug);
  const split = def?.full || best.slug === "retro-ps2" || best.slug === "retro-raros";
  const slug = split && ["jogo", "console", "acessorio"].includes(type) ? `${best.slug}-${L3.find((l) => l[2] === type)[0]}` : best.slug;
  return { slug, platformSlug: best.slug, type, platform: def?.platform, raro: Boolean(best.raro), collection: best.collection };
}

// ---------------------------------------------------------------------------- produtos
const byId = new Map(rows.map((r) => [r["ID"], r]));
const children = new Map();
for (const r of rows) if (r["Tipo"] === "variation") { const pid = r["Ascendente"].replace(/^id:/, ""); (children.get(pid) ?? children.set(pid, []).get(pid)).push(r); }
const topLevel = rows.filter((r) => r["Tipo"] !== "variation");

const label = (v) => v.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim().replace(/^semi-novo$/i, "Semi-novo").replace(/^novo$/i, "Novo");
const OPTION_CODE = { "condição": "condition", condicao: "condition", armazenamento: "storage", cor: "color" };
const optionCode = (name) => OPTION_CODE[fold(name)] ?? slugify(name);
const BRAND = (platform) => (/playstation/i.test(platform ?? "") ? "Sony" : /xbox/i.test(platform ?? "") ? "Microsoft" : /nintendo|switch|nes|3ds/i.test(platform ?? "") ? "Nintendo" : null);
const USED_TAGS = new Set(["usado", "jogo usado", "console usado", "semi novo", "seminovo"]);

function stockOf(r) {
  const qty = r["Estoque"] === "" ? null : Math.max(0, Math.trunc(num(r["Estoque"]) ?? 0));
  if (qty != null) return { qty, basis: "exata" };
  return r["Em estoque?"] === "1" ? { qty: 1, basis: "sem quantidade no CSV (em estoque = 1)" } : { qty: 0, basis: "sem estoque" };
}

function variantOf(r, parent, options) {
  const price = money(r["Preço promocional"]) ?? money(r["Preço"]);
  const regular = money(r["Preço"]);
  const dim = (k, f) => { const n = num(r[k] || parent[k]); return n ? Math.round(n * f) : null; };
  const s = stockOf(r);
  const opts = {};
  options.forEach((o, i) => { const v = r[`Valores do atributo ${i + 1}`]; if (v) opts[o.code] = label(v); });
  return {
    options: opts, price, compareAt: money(r["Preço promocional"]) != null && regular != null ? regular : null,
    weightGrams: dim("Peso (kg)", 1000), lengthMm: dim("Comprimento (cm)", 10), widthMm: dim("Largura (cm)", 10), heightMm: dim("Altura (cm)", 10),
    stock: s.qty, _stockBasis: s.basis, active: true,
  };
}

const rawTagsAll = topLevel.map((r) => r["Tags"].split(",").map((s) => s.trim()).filter(Boolean));
const tagUsage = countTagUsage(rawTagsAll);

const report = { csvRows: rows.length, produtos: 0, semImagem: [], semPreco: [], semCategoria: [], imagensFalhas: [], estoque: { exata: 0, "sem quantidade no CSV (em estoque = 1)": 0, "sem estoque": 0 }, tagsAntes: tagUsage.size, tagsDepois: 0, categorias: {}, tipos: {} };
const plans = [];
for (const r of topLevel) {
  const cat = pickCategory(r);
  if (!cat) { report.semCategoria.push(r["Nome"]); continue; }
  const imgs = [...new Set(r["Imagens"].split(",").map((s) => s.trim()).filter(Boolean))];
  if (!imgs.length) { report.semImagem.push({ id: r["ID"], nome: r["Nome"] }); continue; }
  const attrCount = r["Tipo"] === "variable" ? [1, 2, 3].filter((i) => r[`Nome do atributo ${i}`]).length : 0; // atributo de produto simples é só informativo
  const options = [];
  for (let i = 1; i <= attrCount; i++) {
    const name = r[`Nome do atributo ${i}`];
    options.push({ code: optionCode(name), name, values: r[`Valores do atributo ${i}`].split(",").map((v) => label(v)).filter(Boolean) });
  }
  let variants;
  if (r["Tipo"] === "variable") variants = (children.get(r["ID"]) ?? []).map((c) => variantOf(c, r, options));
  else variants = [variantOf(r, r, [])];
  variants = variants.filter((v) => v.price != null);
  if (!variants.length) { report.semPreco.push({ id: r["ID"], nome: r["Nome"] }); continue; }

  const rawTags = r["Tags"].split(",").map((s) => s.trim()).filter(Boolean);
  if (cat.collection) rawTags.push(cat.collection);
  const usedBy = r["Nome"].match(/semi[\s-]*novo|seminovo|usado/i) || rawTags.some((t) => USED_TAGS.has(fold(t)));
  const condition = cat.raro ? "raridade" : usedBy && r["Tipo"] !== "variable" ? "seminovo" : "novo";
  const tags = normalizeTags(rawTags, tagUsage, { name: r["Nome"] });
  const description = htmlToText(r["Descrição"]);
  const short = htmlToText(r["Descrição curta"]);
  const video = parseVideoUrl(r["Metadado: _woodmart_product_video"]);
  plans.push({
    csvId: r["ID"],
    images: imgs,
    payload: {
      legacyId: r["ID"], name: r["Nome"], categorySlug: cat.slug, productType: cat.type,
      typeLabel: { console: "Console", jogo: "Jogo", acessorio: "Acessório", gift: "Gift Card", hardware: "Hardware" }[cat.type],
      platform: cat.platform ?? "", brand: BRAND(cat.platform) ?? "", condition,
      status: r["Publicado"] === "1" ? "published" : "draft", visibility: r["Visibilidade no catálogo"] === "hidden" ? "hidden" : "visible",
      tagline: summarize(short || description, 240), description, videoUrl: video?.url ?? null, tags, options, variants,
    },
  });
  report.categorias[cat.slug] = (report.categorias[cat.slug] ?? 0) + 1;
  report.tipos[cat.type] = (report.tipos[cat.type] ?? 0) + 1;
  for (const v of variants) report.estoque[v._stockBasis]++;
}
report.produtos = plans.length;
report.tagsDepois = new Set(plans.flatMap((p) => p.payload.tags.map(fold))).size;
const selected = LIMIT ? plans.slice(0, LIMIT) : plans;

console.log(`CSV: ${rows.length} linhas | produtos (sem variações): ${topLevel.length} | importáveis: ${plans.length}`);
console.log(`Sem imagem (descartados): ${report.semImagem.length} | sem preço: ${report.semPreco.length} | sem categoria: ${report.semCategoria.length}`);
console.log(`Tags: ${report.tagsAntes} → ${report.tagsDepois} | Estoque:`, report.estoque);
console.log("Categorias:", report.categorias);
console.log("Tipos:", report.tipos);
writeFileSync(join(OUT, "plano.json"), JSON.stringify(selected.map((p) => ({ ...p, images: p.images.length })), null, 1));
if (DRY) { writeFileSync(join(OUT, "relatorio-dry.json"), JSON.stringify(report, null, 1)); console.log("dry-run: nada foi enviado. Plano em .importacao/plano.json"); process.exit(0); }

// ---------------------------------------------------------------------------- Supabase
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error("SUPABASE_ACCESS_TOKEN ausente (rode via access-hub run)."); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, init = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (i + 1)); continue; }
    return res;
  }
  throw new Error(`API ${path} indisponível`);
}
async function sql(query) {
  const res = await api("/database/query", { method: "POST", body: JSON.stringify({ query }) });
  const body = await res.text();
  if (!res.ok) throw new Error(`SQL ${res.status}: ${body.slice(0, 600)}`);
  return JSON.parse(body);
}
const dollar = (value) => { const s = JSON.stringify(value); if (s.includes("$j$")) throw new Error("JSON contém $j$"); return `$j$${s}$j$::jsonb`; };
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const keys = await (await api("/api-keys?reveal=true")).json();
const serviceKey = keys.find((k) => k.name === "service_role" || k.type === "secret")?.api_key;
if (!serviceKey) throw new Error("service_role não encontrada");
const SUPA = `https://${ref}.supabase.co`;

// limpeza dos dados de teste e árvore de categorias
if (!flag("sem-limpar-testes")) {
  await sql(`
    delete from inventory_movements where variant_id in (select v.id from product_variants v join products p on p.id = v.product_id where p.sku = 'TESTE-001');
    delete from products where sku = 'TESTE-001';
    delete from categories where slug = 'categoria-teste';`);
  console.log("dados de teste removidos");
}
{
  const used = new Set(selected.map((p) => p.payload.categorySlug));
  const stmts = []; let pos = 0;
  const add = (c, position) => stmts.push(`insert into categories (slug, name, position, parent_id, is_active) values (${q(c.slug)}, ${q(c.name)}, ${position}, ${c.parent ? `(select id from categories where slug = ${q(c.parent)})` : "null"}, true)
    on conflict (slug) do update set name = excluded.name, position = excluded.position, parent_id = excluded.parent_id, is_active = true;`);
  for (const c of TREE) {
    add(c, ++pos);
    if (c.full || used.has(`${c.slug}-jogos`) || used.has(`${c.slug}-consoles`) || used.has(`${c.slug}-acessorios`)) {
      L3.forEach(([s, n], i) => { if (c.full || used.has(`${c.slug}-${s}`)) add({ slug: `${c.slug}-${s}`, name: n, parent: c.slug }, i + 1); });
    }
  }
  await sql(stmts.join("\n"));
  console.log(`categorias: ${stmts.length} gravadas`);
}

// ---------------------------------------------------------------------------- imagens
async function fetchImage(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "DinoBlackImport/1.0" } });
      if (res.status === 404 || res.status === 410) return null;
      if (!res.ok) throw new Error(String(res.status));
      return Buffer.from(await res.arrayBuffer());
    } catch (e) { if (i === 2) throw e; await sleep(1500 * (i + 1)); }
  }
}
async function processImages(plan, sku) {
  const media = [];
  let n = 0;
  for (const url of plan.images) {
    try {
      const buf = await fetchImage(url);
      if (!buf) { report.imagensFalhas.push({ id: plan.csvId, url, motivo: "404" }); continue; }
      const img = sharp(buf, { failOn: "none" }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
      const { data, info } = await img.webp({ quality: 80, effort: 5 }).toBuffer({ resolveWithObject: true });
      const path = `${sku.toLowerCase()}/${seoImageName(plan.payload.name, n)}`;
      const up = await fetch(`${SUPA}/storage/v1/object/produtos/${path}`, { method: "POST", headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "image/webp", "x-upsert": "true", "cache-control": "max-age=31536000" }, body: data });
      if (!up.ok) throw new Error(`upload ${up.status} ${(await up.text()).slice(0, 120)}`);
      media.push({ url: `${SUPA}/storage/v1/object/public/produtos/${path}`, alt: n === 0 ? plan.payload.name : `${plan.payload.name} - imagem ${n + 1}`, width: info.width, height: info.height, bytes: info.size });
      n++;
    } catch (e) { report.imagensFalhas.push({ id: plan.csvId, url, motivo: String(e.message ?? e).slice(0, 160) }); }
  }
  return media;
}

// ---------------------------------------------------------------------------- produtos
const done = new Map();
const statePath = join(OUT, "estado.json");
if (existsSync(statePath)) for (const [k, v] of Object.entries(JSON.parse(readFileSync(statePath, "utf8")))) done.set(k, v);
const results = { criados: 0, pulados: 0, semImagemFinal: [], erros: [] };
let cursor = 0, finished = 0;
async function worker() {
  while (cursor < selected.length) {
    const plan = selected[cursor++];
    try {
      if (done.has(plan.csvId) && !flag("refazer")) { results.pulados++; continue; }
      // SKU reservado antes das imagens (a pasta usa o ID próprio); save_product reaproveita pelo legacy_id
      const [{ sku }] = await sql(`select coalesce((select sku from products where legacy_id = ${q(plan.csvId)}), next_dino_sku(${q(plan.payload.productType)})) as sku`);
      const media = await processImages(plan, sku);
      if (!media.length) { results.semImagemFinal.push({ id: plan.csvId, nome: plan.payload.name }); continue; }
      const variants = plan.payload.variants.map(({ _stockBasis, ...v }) => v);
      const [row] = await sql(`select save_product(${dollar({ ...plan.payload, sku, media, variants })}) as r`);
      done.set(plan.csvId, row.r.sku);
      results.criados++;
    } catch (e) { results.erros.push({ id: plan.csvId, nome: plan.payload.name, erro: String(e.message ?? e).slice(0, 300) }); }
    if (++finished % 10 === 0) { console.log(`… ${finished}/${selected.length}`); writeFileSync(statePath, JSON.stringify(Object.fromEntries(done))); }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
writeFileSync(statePath, JSON.stringify(Object.fromEntries(done)));
report.resultado = results;
writeFileSync(join(OUT, "relatorio.json"), JSON.stringify(report, null, 1));
console.log(`\nconcluído: ${results.criados} gravados, ${results.pulados} já feitos, ${results.semImagemFinal.length} sem imagem utilizável, ${results.erros.length} erros, ${report.imagensFalhas.length} imagens com falha`);
for (const e of results.erros.slice(0, 10)) console.log("ERRO", e.id, e.nome, "→", e.erro);
