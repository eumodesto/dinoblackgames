"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { RichText } from "@/components/RichText";

type Props = { value: string; onChange: (value: string) => void; label?: string; placeholder?: string; maxLength?: number };

const btn = "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-dino-red";

/**
 * Editor de texto formatado do admin: barra de ferramentas sobre um campo de texto (Markdown simples),
 * atalhos Ctrl+B / Ctrl+I / Ctrl+K e pré-visualização exatamente como aparece na página do produto.
 */
export function RichTextEditor({ value, onChange, label = "Descrição", placeholder, maxLength = 20000 }: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  /** Aplica a mudança e devolve o foco/seleção ao campo no próximo quadro. */
  function apply(next: string, selStart: number, selEnd: number) {
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(selStart, selEnd); });
  }

  function wrap(before: string, after = before, fallback = "texto") {
    const el = area.current; if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const selected = value.slice(a, b) || fallback;
    apply(value.slice(0, a) + before + selected + after + value.slice(b), a + before.length, a + before.length + selected.length);
  }

  /** Prefixa cada linha selecionada (títulos, listas, citação); repetir remove o prefixo. */
  function prefixLines(prefix: string | ((index: number) => string)) {
    const el = area.current; if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const endIdx = value.indexOf("\n", el.selectionEnd);
    const end = endIdx === -1 ? value.length : endIdx;
    const lines = value.slice(start, end).split("\n");
    const pre = (i: number) => (typeof prefix === "function" ? prefix(i) : prefix);
    const allHave = lines.every((l, i) => l.startsWith(pre(i)));
    const strip = (l: string) => l.replace(/^(#{1,3}\s+|[-*•]\s+|\d+[.)]\s+|>\s?)/, "");
    const out = lines.map((l, i) => (allHave ? l.slice(pre(i).length) : pre(i) + strip(l))).join("\n");
    apply(value.slice(0, start) + out + value.slice(end), start, start + out.length);
  }

  function link() {
    const el = area.current; if (!el) return;
    const url = window.prompt("Endereço do link (https://...)", "https://");
    if (!url || !/^https?:\/\//i.test(url)) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const text = value.slice(a, b) || "texto do link";
    const md = `[${text}](${url.trim()})`;
    apply(value.slice(0, a) + md + value.slice(b), a, a + md.length);
  }

  function divider() {
    const el = area.current; if (!el) return;
    const a = el.selectionStart;
    const ins = `${a > 0 && value[a - 1] !== "\n" ? "\n\n" : ""}---\n\n`;
    apply(value.slice(0, a) + ins + value.slice(el.selectionEnd), a + ins.length, a + ins.length);
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const k = event.key.toLowerCase();
    if (k === "b") { event.preventDefault(); wrap("**"); }
    else if (k === "i") { event.preventDefault(); wrap("*"); }
    else if (k === "k") { event.preventDefault(); link(); }
  }

  const tool = (title: string, content: React.ReactNode, onClick: () => void) => (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={btn} disabled={tab === "preview"}>{content}</button>
  );

  return (
    <div className="md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</span>
        <div role="tablist" aria-label="Modo do editor" className="flex rounded-lg border border-zinc-700 p-0.5 text-xs font-bold">
          {([["edit", "Editar"], ["preview", "Pré-visualizar"]] as const).map(([id, text]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-md px-3 py-1.5 transition ${tab === id ? "bg-dino-red text-white" : "text-zinc-400 hover:text-white"}`}>{text}</button>
          ))}
        </div>
      </div>

      <div className="mt-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 focus-within:border-dino-red">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-800 bg-zinc-900/70 p-1.5" role="toolbar" aria-label="Formatação">
          {tool("Título (H2)", <span className="text-xs">H2</span>, () => prefixLines("## "))}
          {tool("Subtítulo (H3)", <span className="text-xs">H3</span>, () => prefixLines("### "))}
          <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden />
          {tool("Negrito (Ctrl+B)", <strong>B</strong>, () => wrap("**"))}
          {tool("Itálico (Ctrl+I)", <em className="font-serif">I</em>, () => wrap("*"))}
          <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden />
          {tool("Lista com marcadores", <span aria-hidden>• ―</span>, () => prefixLines("- "))}
          {tool("Lista numerada", <span aria-hidden className="text-xs">1.</span>, () => prefixLines((i) => `${i + 1}. `))}
          {tool("Citação", <span aria-hidden>❝</span>, () => prefixLines("> "))}
          <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden />
          {tool("Link (Ctrl+K)", <span aria-hidden>🔗</span>, link)}
          {tool("Linha separadora", <span aria-hidden>―</span>, divider)}
        </div>

        {tab === "edit" ? (
          <textarea
            ref={area}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            onKeyDown={onKey}
            placeholder={placeholder ?? "Escreva a descrição. Use a barra acima para títulos, negrito, listas e links."}
            aria-label={label}
            className="block h-64 w-full resize-y bg-transparent px-3 py-3 text-sm leading-relaxed text-white outline-none"
          />
        ) : (
          <div className="max-h-[28rem] min-h-[16rem] overflow-y-auto bg-white px-5 py-4 dark:bg-zinc-950">
            {value.trim() ? <RichText text={value} /> : <p className="text-sm text-gray-500">Nada para mostrar ainda.</p>}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">{value.length}/{maxLength} caracteres · <code>## Título</code>, <code>**negrito**</code>, <code>- lista</code>, <code>[texto](https://link)</code>. HTML não é aceito.</p>
    </div>
  );
}
