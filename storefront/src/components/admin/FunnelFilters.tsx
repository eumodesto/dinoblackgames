"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminSelect, type SelectOption } from "./AdminSelect";

const PERIODS = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"], ["90d", "90 dias"], ["custom", "Personalizado"]] as const;
const DEVICE_LABEL: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };

type Props = {
  periodo: string; de: string; ate: string; max: string;
  dispositivo: string; origem: string;
  deviceOptions: { name: string; sessions: number }[];
  sourceOptions: { name: string; sessions: number }[];
};

/**
 * Filtros do funil: período (chips; o personalizado aplica ao preencher as duas datas) e segmento
 * (dispositivo e origem). Tudo vai para a URL, então o link do painel reproduz a mesma visão.
 */
export function FunnelFilters({ periodo, de, ate, max, dispositivo, origem, deviceOptions, sourceOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(de);
  const [to, setTo] = useState(ate);
  const [custom, setCustom] = useState(periodo === "custom");

  const go = (next: { periodo?: string; de?: string; ate?: string; dispositivo?: string; origem?: string }) => {
    const merged = { periodo, de, ate, dispositivo, origem, ...next };
    const params = new URLSearchParams();
    params.set("periodo", merged.periodo);
    if (merged.periodo === "custom") { params.set("de", merged.de); params.set("ate", merged.ate); }
    if (merged.dispositivo) params.set("dispositivo", merged.dispositivo);
    if (merged.origem) params.set("origem", merged.origem);
    start(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  const deviceChoices: SelectOption[] = [{ value: "", label: "Todos os dispositivos" }, ...deviceOptions.map((d) => ({ value: d.name, label: `${DEVICE_LABEL[d.name] ?? d.name} (${d.sessions})` }))];
  const sourceChoices: SelectOption[] = [{ value: "", label: "Todas as origens" }, ...sourceOptions.map((s) => ({ value: s.name, label: `${s.name === "direto" ? "Direto" : s.name} (${s.sessions})` }))];
  // um filtro ativo que não tem sessões no novo período continua aparecendo na lista
  if (dispositivo && !deviceOptions.some((d) => d.name === dispositivo)) deviceChoices.push({ value: dispositivo, label: DEVICE_LABEL[dispositivo] ?? dispositivo });
  if (origem && !sourceOptions.some((s) => s.name === origem)) sourceChoices.push({ value: origem, label: origem });

  const chip = "rounded-full border px-3.5 py-1.5 text-xs font-bold transition";
  const dateInput = "rounded-xl border px-2.5 py-1.5 text-xs";
  const dateStyle = { background: "var(--gd-card-light)", color: "var(--gd-ink)", borderColor: "var(--gd-line)" } as const;

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }} aria-busy={pending}>
      <div role="group" aria-label="Período do funil" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        {PERIODS.map(([key, text]) => {
          const on = key === "custom" ? custom : !custom && periodo === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => { if (key === "custom") setCustom(true); else { setCustom(false); go({ periodo: key }); } }}
              className={chip}
              style={on ? { background: "var(--gd-primary)", color: "var(--gd-primary-ink)", borderColor: "transparent" } : dateStyle}
            >
              {text}
            </button>
          );
        })}
        {custom && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="date" aria-label="De" value={from} max={max} onChange={(e) => { setFrom(e.target.value); if (e.target.value && to) go({ periodo: "custom", de: e.target.value, ate: to }); }} className={dateInput} style={dateStyle} />
            <span style={{ color: "var(--gd-muted)", fontSize: 12 }}>até</span>
            <input type="date" aria-label="Até" value={to} max={max} onChange={(e) => { setTo(e.target.value); if (from && e.target.value) go({ periodo: "custom", de: from, ate: e.target.value }); }} className={dateInput} style={dateStyle} />
          </span>
        )}
      </div>
      <div role="group" aria-label="Segmento do funil" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <div style={{ minWidth: 190 }}><AdminSelect options={deviceChoices} value={dispositivo} onValueChange={(value) => go({ dispositivo: value })} aria-label="Filtrar funil por dispositivo" /></div>
        <div style={{ minWidth: 190 }}><AdminSelect options={sourceChoices} value={origem} onValueChange={(value) => go({ origem: value })} aria-label="Filtrar funil por origem" /></div>
        {(dispositivo || origem) && (
          <button type="button" onClick={() => go({ dispositivo: "", origem: "" })} className={chip} style={dateStyle}>Limpar segmento</button>
        )}
        {pending && <span role="status" style={{ color: "var(--gd-muted)", fontSize: 12 }}>Atualizando…</span>}
      </div>
    </div>
  );
}
