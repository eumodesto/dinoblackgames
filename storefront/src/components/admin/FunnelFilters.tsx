"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { AdminSelect, type SelectOption } from "./AdminSelect";

const PERIODS = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"], ["90d", "90 dias"], ["custom", "Personalizado"]] as const;
const DEVICE_LABEL: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };
// No celular só estes períodos aparecem; os demais ficam para telas maiores.
const MOBILE_PERIODS = new Set(["hoje", "ontem", "custom"]);

const ICON_PROPS = { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function DeviceIcon({ device }: { device: string }) {
  if (device === "mobile") return <svg {...ICON_PROPS}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>;
  if (device === "tablet") return <svg {...ICON_PROPS}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M11 17h2" /></svg>;
  if (device === "desktop") return <svg {...ICON_PROPS}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
  return <svg {...ICON_PROPS}><rect x="2" y="4" width="15" height="11" rx="2" /><path d="M6 19h7M9.5 15v4" /><rect x="18" y="9" width="4" height="10" rx="1" /></svg>;
}

function OriginIcon() {
  return <svg {...ICON_PROPS}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
}

/** Botão só com ícone que abre o seletor nativo do aparelho; fica destacado quando há um filtro ativo. */
function IconPicker({ label, value, options, onChange, children }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; children: ReactNode }) {
  const active = value !== "";
  const current = options.find((o) => o.value === value)?.label ?? "";
  return (
    <label
      className="relative grid h-9 w-9 place-items-center rounded-full border"
      style={active ? { background: "var(--gd-primary)", color: "var(--gd-primary-ink)", borderColor: "transparent" } : { background: "var(--gd-card-light)", color: "var(--gd-ink)", borderColor: "var(--gd-line)" }}
    >
      {children}
      <select
        aria-label={active ? `${label}: ${current}` : label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        style={{ fontSize: 16 }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

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
      <div role="group" aria-label="Segmento do funil" className="flex items-center gap-2 md:hidden">
        {pending && <span role="status" style={{ color: "var(--gd-muted)", fontSize: 12 }}>Atualizando…</span>}
        {(dispositivo || origem) && (
          <button type="button" onClick={() => go({ dispositivo: "", origem: "" })} className={chip} style={dateStyle}>Limpar</button>
        )}
        <IconPicker label="Filtrar funil por dispositivo" value={dispositivo} options={deviceChoices} onChange={(value) => go({ dispositivo: value })}>
          <DeviceIcon device={dispositivo} />
        </IconPicker>
        <IconPicker label="Filtrar funil por origem" value={origem} options={sourceChoices} onChange={(value) => go({ origem: value })}>
          <OriginIcon />
        </IconPicker>
      </div>
      <div role="group" aria-label="Período do funil" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        {PERIODS.map(([key, text]) => {
          const on = key === "custom" ? custom : !custom && periodo === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => { if (key === "custom") setCustom(true); else { setCustom(false); go({ periodo: key }); } }}
              className={MOBILE_PERIODS.has(key) ? chip : `${chip} max-md:hidden`}
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
      <div role="group" aria-label="Segmento do funil" className="flex flex-wrap items-center justify-end gap-2 max-md:hidden">
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
