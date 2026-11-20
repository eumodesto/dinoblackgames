import type { ReactNode } from "react";

/**
 * Texto formatado simples (um subconjunto de Markdown), renderizado como elementos React — nunca como
 * HTML —, então o conteúdo do admin não consegue injetar script ou estilo na loja.
 *
 *   ## Título        ### Subtítulo        **negrito**   *itálico*   [texto](https://link)
 *   - item           1. item              > citação     ---  (linha separadora)
 */

type Block =
  | { type: "h"; level: 3 | 4; text: string }
  | { type: "p"; lines: string[] }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "hr" };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.length) { blocks.push({ type: "p", lines: paragraph }); paragraph = []; } };
  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    let m: RegExpExecArray | null;
    if (/^-{3,}$/.test(trimmed)) { flush(); blocks.push({ type: "hr" }); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(trimmed))) { flush(); blocks.push({ type: "h", level: m[1].length >= 3 ? 4 : 3, text: m[2] }); continue; }
    if ((m = /^[-*•]\s+(.*)$/.exec(trimmed))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(m[1]); else blocks.push({ type: "ul", items: [m[1]] });
      continue;
    }
    if ((m = /^\d+[.)]\s+(.*)$/.exec(trimmed))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === "ol") last.items.push(m[1]); else blocks.push({ type: "ol", items: [m[1]] });
      continue;
    }
    if ((m = /^>\s?(.*)$/.exec(trimmed))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === "quote") last.lines.push(m[1]); else blocks.push({ type: "quote", lines: [m[1]] });
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k} className="font-bold text-gray-900 dark:text-white">{inline(m[1], k)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{inline(m[2], k)}</em>);
    else out.push(<a key={k} href={m[4]} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-dino-red underline underline-offset-2 hover:text-dino-red-hover">{m[3]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`space-y-4 text-sm leading-relaxed text-gray-700 dark:text-zinc-300 ${className}`}>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.type) {
          case "h":
            return block.level === 3
              ? <h3 key={key} className="pt-2 font-display text-lg font-black text-gray-900 dark:text-white">{inline(block.text, key)}</h3>
              : <h4 key={key} className="pt-1 text-base font-bold text-gray-900 dark:text-white">{inline(block.text, key)}</h4>;
          case "ul":
            return <ul key={key} className="list-disc space-y-1 pl-5 marker:text-dino-red">{block.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>)}</ul>;
          case "ol":
            return <ol key={key} className="list-decimal space-y-1 pl-5 marker:font-bold marker:text-dino-red">{block.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>)}</ol>;
          case "quote":
            return <blockquote key={key} className="border-l-4 border-dino-red/60 bg-gray-50 py-2 pl-4 pr-3 italic text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">{block.lines.map((l, j) => <span key={j} className="block">{inline(l, `${key}-${j}`)}</span>)}</blockquote>;
          case "hr":
            return <hr key={key} className="border-gray-200 dark:border-zinc-800" />;
          default:
            return <p key={key} className="break-words">{block.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l, `${key}-${j}`)}</span>)}</p>;
        }
      })}
    </div>
  );
}
