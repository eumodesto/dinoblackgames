import type { Metadata } from "next";
import Image from "next/image";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/admin-field/field";
import { ArrowUpRight, Box, Download, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Design system do admin · DinoBlack Games",
  robots: { index: false, follow: false },
};

// Cores do logotipo (referência) e como o admin as usa. Os tokens `--gd-*` mudam entre o tema claro e o escuro.
const BRAND = [
  { name: "Vermelho DINO", hex: "#da2230", use: "Acento: item ativo do dock, marca, atenção" },
  { name: "Preto BLACK", hex: "#15171a", use: "Botão primário, texto principal (tema claro)" },
  { name: "Grafite", hex: "#2a2f35", use: "Cartão de destaque, texto de gráficos" },
  { name: "Prata do controle", hex: "#e5e5e5", use: "Superfícies e botão primário (tema escuro)" },
  { name: "Ciano do controle", hex: "#5fc4e2", use: "Foco, informação e apoio (uso discreto)" },
];

const TOKENS = [
  ["--gd-ink", "Texto principal"],
  ["--gd-muted", "Texto secundário"],
  ["--gd-surface", "Superfície sólida (menus, diálogos)"],
  ["--gd-primary", "Botão primário"],
  ["--gd-coral", "Atenção / vermelho semântico"],
  ["--gd-teal", "Positivo / informação"],
  ["--gd-ochre", "Aviso"],
  ["--gd-focus", "Anel de foco"],
] as const;

function Section({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="gd-panel">
      <header className="gd-panel-head"><div><h2>{title}</h2>{lead && <p>{lead}</p>}</div></header>
      {children}
    </section>
  );
}

export default function AdminDesignSystemPage() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <header className="gd-view-head">
        <div>
          <h1>Design system</h1>
          <p style={{ color: "var(--gd-muted)", fontSize: 13, margin: "8px 0 0" }}>Cores do logotipo, tokens e componentes do painel. Use o botão de tema da barra para ver os dois modos.</p>
        </div>
      </header>

      <Section title="Marca" lead="Paleta derivada do logotipo: neutra e limpa, com o vermelho só como acento.">
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(160px, 220px) 1fr", alignItems: "center" }}>
          <Image src="/brand/logo.png" alt="Logotipo DinoBlack Games e Informática" width={220} height={110} />
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {BRAND.map((c) => (
              <div key={c.hex} style={{ display: "grid", gap: 6 }}>
                <span style={{ background: c.hex, height: 44, borderRadius: 12, border: "1px solid var(--gd-line)" }} aria-hidden="true" />
                <strong style={{ fontSize: 12 }}>{c.name} <span style={{ color: "var(--gd-muted)", fontWeight: 600 }}>{c.hex}</span></strong>
                <small style={{ color: "var(--gd-muted)", fontSize: 11 }}>{c.use}</small>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Tokens" lead="Variáveis CSS escopadas em .gd-app; trocam sozinhas com o tema.">
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
          {TOKENS.map(([token, label]) => (
            <div key={token} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: `var(${token})`, width: 30, height: 30, borderRadius: 9, border: "1px solid var(--gd-line)", flex: "none" }} aria-hidden="true" />
              <div><strong style={{ fontSize: 12 }}>{label}</strong><small style={{ display: "block", color: "var(--gd-muted)", fontSize: 11 }}>{token}</small></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Botões e estados">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button type="button" className="gd-primary">Primário <ArrowUpRight aria-hidden="true" /></button>
          <button type="button" className="gd-secondary"><Download aria-hidden="true" />Secundário</button>
          <span className="gd-status" data-state="teal"><i aria-hidden="true" />Pago</span>
          <span className="gd-status" data-state="ochre"><i aria-hidden="true" />Aguardando</span>
          <span className="gd-status" data-state="coral"><i aria-hidden="true" />Atenção</span>
          <span className="gd-status"><i aria-hidden="true" />Neutro</span>
        </div>
      </Section>

      <Section title="Cartões de métrica">
        <div className="gd-metric-grid">
          <article className="gd-metric" data-tone="featured">
            <div className="gd-metric-head"><span>Destaque</span><span className="gd-metric-icon" aria-hidden="true"><ShoppingBag /></span></div>
            <strong className="gd-metric-value">R$ 0,00</strong><div className="gd-metric-caption">Um por tela, no máximo</div>
          </article>
          <article className="gd-metric">
            <div className="gd-metric-head"><span>Padrão</span><span className="gd-metric-icon" aria-hidden="true"><Box /></span></div>
            <strong className="gd-metric-value">0</strong><div className="gd-metric-caption">Vidro claro, sem cor</div>
          </article>
        </div>
      </Section>

      <Section title="Formulário" lead="Texto e data são nativos e herdam o estilo; listas usam o Autocomplete (AdminSelect).">
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 700 }}>Nome<input type="text" placeholder="Ex.: PlayStation 5 Slim" className="px-3 py-2.5" /></label>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <AdminSelect defaultValue="draft" aria-label="Status" options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }, { value: "archived", label: "Arquivado" }]} />
            <FieldDescription>Campo com busca e lista suspensa (Autocomplete).</FieldDescription>
          </Field>
        </div>
      </Section>
    </div>
  );
}
