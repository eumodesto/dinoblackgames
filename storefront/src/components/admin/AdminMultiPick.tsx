"use client";

import { useMemo, useState } from "react";

export type PickOption = { id: string; label: string; hint?: string };

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista com busca e caixas de seleção para escolher vários itens (categorias, produtos…). */
export function AdminMultiPick({ options, value, onChange, placeholder = "Buscar…", emptyText = "Nada encontrado.", "aria-label": ariaLabel }: {
  options: PickOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  "aria-label"?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const shown = useMemo(() => {
    const terms = plain(query).split(/\s+/).filter(Boolean);
    return options.filter((option) => terms.every((term) => plain(`${option.label} ${option.hint ?? ""}`).includes(term)));
  }, [options, query]);

  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="rounded-xl border border-zinc-700 p-2">
      <div className="flex items-center gap-2">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label={ariaLabel ?? placeholder} className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white" />
        <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-400">{value.length} selecionado{value.length === 1 ? "" : "s"}</span>
        {value.length > 0 && <button type="button" onClick={() => onChange([])} className="shrink-0 text-xs font-bold text-zinc-400 hover:text-white">Limpar</button>}
      </div>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1" role="group" aria-label={ariaLabel}>
        {shown.map((option) => (
          <li key={option.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800">
              <input type="checkbox" checked={selected.has(option.id)} onChange={() => toggle(option.id)} />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.hint && <span className="shrink-0 font-mono text-xs text-zinc-500">{option.hint}</span>}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-3 text-sm text-zinc-500">{emptyText}</li>}
      </ul>
    </div>
  );
}
