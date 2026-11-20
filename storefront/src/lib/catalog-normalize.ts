// Limpeza de dados de catálogo, sem dependências: usada pelo admin, pela API e pelo importador
// (o importador roda com `node`, então aqui só entra sintaxe TypeScript apagável).

/** Minúsculas, sem acento e sem pontuação: chave para comparar textos. */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return fold(value).replace(/ /g, "-");
}

/** Código da opção de variação. Condição, Armazenamento e Cor usam os códigos que o carrinho e o checkout já conhecem. */
export function optionCode(name: string): string {
  const key = fold(name);
  return ({ condicao: "condition", armazenamento: "storage", cor: "color" } as Record<string, string>)[key] ?? (key.replace(/ /g, "_") || "opcao");
}

// ---------------------------------------------------------------------------- texto
const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&ordm;": "º", "&ordf;": "ª" };

/** HTML do WordPress → texto simples em parágrafos (sem tags, scripts, estilos ou imagens de terceiros). */
export function htmlToText(html: string): string {
  const text = (html ?? "")
    .replace(/\r?\\n/g, "\n") // "\n" literal que o export do WooCommerce deixa no texto
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|ul|ol|section|article)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? (/^&#(\d+);$/.test(e) ? String.fromCodePoint(Number(e.slice(2, -1))) : " "))
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

/** Resumo de uma linha (até `max` caracteres, cortando em palavra). */
export function summarize(text: string, max = 240): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).trim()}…`;
}

// ---------------------------------------------------------------------------- vídeo
export type VideoRef = { provider: "youtube" | "vimeo"; id: string; url: string; embed: string; thumbnail: string | null };

/** Aceita links do YouTube (watch, youtu.be, shorts, embed) e do Vimeo; devolve null para qualquer outra coisa. */
export function parseVideoUrl(raw: string | null | undefined): VideoRef | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else { const m = /^\/(?:embed|shorts|live|v)\/([^/?]+)/.exec(url.pathname); id = m?.[1] ?? ""; }
  }
  if (/^[\w-]{11}$/.test(id)) {
    return { provider: "youtube", id, url: `https://www.youtube.com/watch?v=${id}`, embed: `https://www.youtube-nocookie.com/embed/${id}`, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = /(\d{6,})/.exec(url.pathname);
    if (m) return { provider: "vimeo", id: m[1], url: `https://vimeo.com/${m[1]}`, embed: `https://player.vimeo.com/video/${m[1]}`, thumbnail: null };
  }
  return null;
}

// ---------------------------------------------------------------------------- tags
/** Palavras que não dizem nada sozinhas (a plataforma, o tipo e a condição já são filtros do produto). */
const NOISE = new Set([
  "jogo", "jogos", "usado", "usados", "jogo usado", "console usado", "console", "consoles", "semi novo", "seminovo", "semi novos", "novo", "play", "station",
  "ps", "x", "xone", "game", "games", "original", "lacrado", "midia fisica", "acessorio", "acessorios", "produto", "oferta",
]);

/** Sinônimos de plataforma: todos viram uma única tag canônica (ou nenhuma, quando a plataforma já é filtro). */
const PLATFORM_SYNONYMS: RegExp[] = [
  /^(ps ?[1-5]|psx|play ?station ?[1-5]?|playstation [1-5]|station [1-5])$/,
  /^(x ?360|xbox ?360|xbox one|xone|x one|xbox series( s| x| x s| s x)?|series x|series s|xbox)$/,
  /^(switch|nintendo switch|nintendo)$/,
  /^jogo (ps ?[1-5]|play ?station ?[1-5]|playstation [1-5]|x ?360|xbox 360|xbox one|switch)$/,
];

/** Tag feita só dessas palavras repete o que a categoria, o tipo e a plataforma já dizem. */
const REDUNDANT_WORDS = new Set([
  "console", "consoles", "controle", "controles", "jogo", "jogos", "usado", "usados", "seminovo", "semi", "novo", "original", "sony", "microsoft", "nintendo",
  "xbox", "ps", "ps1", "ps2", "ps3", "ps4", "ps5", "xone", "playstation", "play", "station", "x360", "psx", "1", "2", "3", "4", "5", "360", "one", "series", "x", "s", "slim", "fat", "super", "gamer", "sem", "fio", "manete", "joystick", "midia", "fisica", "de", "para", "e", "com",
]);

export type TagContext = { platform?: string; productType?: string; name?: string };

/**
 * Limpa as tags de um produto:
 *  - junta variações da mesma palavra (acento, caixa, pontuação) numa só, usando a grafia mais comum;
 *  - tira ruído genérico e sinônimos de plataforma (a plataforma vira UMA tag canônica);
 *  - tira tags que só repetem o nome do produto;
 *  - limita a `max` por produto, preferindo as mais compartilhadas (melhores para navegação e busca).
 */
export function normalizeTags(raw: string[], usage: Map<string, number> = new Map(), ctx: TagContext = {}, max = 8, minUsage = 2): string[] {
  const seen = new Map<string, string>();
  const nameFold = fold(ctx.name ?? "");
  for (const original of raw) {
    const display = original.replace(/\s+/g, " ").trim();
    if (!display) continue;
    const key = fold(display);
    if (!key || key.length < 2 || /^\d+$/.test(key)) continue;
    if (NOISE.has(key)) continue;
    if (PLATFORM_SYNONYMS.some((re) => re.test(key))) continue; // a plataforma já é um filtro do produto
    if (key.split(" ").every((w) => REDUNDANT_WORDS.has(w))) continue; // ex.: "Console PS4", "Controle PS5 Original"
    if (nameFold && key === nameFold) continue;
    if (!seen.has(key)) seen.set(key, display);
  }
  const score = (key: string) => usage.get(key) ?? 1;
  // Tag usada por um produto só não ajuda a navegar (o nome do produto já é pesquisável); só vale com a lista de uso.
  return [...seen.entries()]
    .filter(([key]) => usage.size === 0 || score(key) >= minUsage)
    .sort((a, b) => score(b[0]) - score(a[0]) || a[1].localeCompare(b[1], "pt-BR"))
    .slice(0, max)
    .map(([, display]) => display);
}

/** Conta em quantos produtos cada tag (já dobrada) aparece, para ordenar e descartar tags de uso único. */
export function countTagUsage(all: string[][]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const tags of all) for (const key of new Set(tags.map(fold))) usage.set(key, (usage.get(key) ?? 0) + 1);
  return usage;
}

// ---------------------------------------------------------------------------- imagens
/** Nome de arquivo para SEO: `<slug-do-produto>-<n>.webp`, no máximo 80 caracteres de slug. */
export function seoImageName(productName: string, index: number, ext = "webp"): string {
  const slug = slugify(productName).slice(0, 80).replace(/-+$/, "") || "produto";
  return `${slug}-${index + 1}.${ext}`;
}
