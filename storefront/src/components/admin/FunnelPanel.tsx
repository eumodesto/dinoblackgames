import type { Funnel } from "@/lib/server/analytics";
import { FunnelFilters } from "./FunnelFilters";
import { FunnelViz } from "./FunnelViz";

const nf = new Intl.NumberFormat("pt-BR");
const pct = (value: number | null) => (value === null ? "—" : `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: value < 0.1 ? 1 : 0 })}%`);
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const DEVICE: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };

export function FunnelPanel({ funnel, today }: { funnel: Funnel; today: string }) {
  const { steps, range, side, daily, segment, segmented } = funnel;
  const top = steps[0].count;
  const empty = top === 0 && funnel.paidOrders === 0;
  const carts = steps[2].count;
  const created = steps[5].count;
  const maxDay = Math.max(1, ...daily.map((d) => d.sessions));
  const segmentLabel = [segment.dispositivo && DEVICE[segment.dispositivo], segment.origem && (segment.origem === "direto" ? "origem direta" : `origem ${segment.origem}`)].filter(Boolean).join(" · ");

  const tiles: [string, string, string][] = [
    segmented
      ? ["Chegaram ao pagamento", pct(ratio(created, top)), "pagamento gerado ÷ sessões do segmento"]
      : ["Conversão geral", pct(ratio(funnel.paidOrders, top)), "compras pagas ÷ sessões"],
    ["Abandono de carrinho", pct(carts > 0 ? Math.max(0, (carts - created) / carts) : null), "colocaram no carrinho e não geraram pagamento"],
    segmented
      ? ["Pagamentos gerados", nf.format(created), "no segmento escolhido"]
      : ["Pagamentos gerados e não pagos", nf.format(Math.max(0, created - funnel.paidOrders)), "Pix não pago ou cartão recusado"],
    ["Busca usada", `${nf.format(side.searched)} sessões`, `${pct(ratio(side.searched, top))} das sessões`],
    ["Viram produto esgotado", `${nf.format(side.stockOut)} sessões`, "perda por estoque, não por interesse"],
    ["Cupom aplicado", `${nf.format(side.coupon)} sessões`, "chegaram ao checkout com cupom válido"],
  ];

  return (
    <section className="gd-panel" aria-labelledby="funnel-title">
      <header className="gd-panel-head" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 id="funnel-title">Funil da jornada</h2>
          <p>{range.label}{segmentLabel ? ` · ${segmentLabel}` : ""} · contagem por sessão (visita), horário de Brasília</p>
        </div>
        <FunnelFilters
          periodo={range.key} de={range.de} ate={range.ate} max={today}
          dispositivo={segment.dispositivo} origem={segment.origem}
          deviceOptions={funnel.deviceOptions} sourceOptions={funnel.sourceOptions}
        />
      </header>

      {empty && (
        <p role="status" style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 12, background: "var(--gd-card-light)", color: "var(--gd-muted)", fontSize: 13 }}>
          {segmented ? "Nenhuma sessão neste segmento e período." : "Ainda sem visitas neste período. Os eventos começam a ser gravados assim que o site recebe acessos (visitas ao painel admin e bots não contam)."}
        </p>
      )}

      <FunnelViz steps={steps.map((s) => ({ short: s.short, count: s.count }))} />

      {segmented && (
        <p style={{ margin: "8px 0 0", color: "var(--gd-muted)", fontSize: 12 }}>
          Com segmento ativo a etapa “Compra paga” não aparece: os pedidos não guardam o dispositivo nem a origem da sessão.
        </p>
      )}

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--gd-muted)", fontSize: 11, textAlign: "right" }}>
              <th style={{ textAlign: "left", fontWeight: 650, paddingBottom: 6 }}>Etapa</th>
              <th style={{ fontWeight: 650 }}>Sessões</th><th style={{ fontWeight: 650 }}>Da etapa anterior</th><th style={{ fontWeight: 650 }}>Perda</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, i) => {
              const prev = i > 0 ? steps[i - 1].count : null;
              const rate = prev === null ? null : ratio(step.count, prev);
              const invalid = rate !== null && rate > 1; // pedido pago sem sessão rastreada (ex.: antes do rastreamento)
              return (
                <tr key={step.id} style={{ borderTop: "1px solid var(--gd-line)", textAlign: "right" }}>
                  <td style={{ textAlign: "left", padding: "8px 0" }}>
                    <div style={{ fontWeight: 650 }}>{i + 1}. {step.label}</div>
                    <small style={{ color: "var(--gd-muted)" }}>{step.hint}</small>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: 15 }}>{nf.format(step.count)}</td>
                  <td>{prev === null ? "—" : invalid ? "sem sessão rastreada" : pct(rate)}</td>
                  <td style={{ color: "var(--gd-muted)" }}>{prev !== null && !invalid && prev - step.count > 0 ? `−${nf.format(prev - step.count)}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginTop: 16 }}>
        {tiles.map(([title, value, hint]) => (
          <div key={title} style={{ padding: "10px 12px", borderRadius: 14, background: "var(--gd-card-light)", border: "1px solid var(--gd-line)" }}>
            <small style={{ color: "var(--gd-muted)", fontWeight: 650 }}>{title}</small>
            <div style={{ fontSize: 18, fontWeight: 800, margin: "2px 0" }}>{value}</div>
            <small style={{ color: "var(--gd-muted)" }}>{hint}</small>
          </div>
        ))}
      </div>

      {daily.length > 1 && (
        <div style={{ marginTop: 16 }}>
          <small style={{ color: "var(--gd-muted)", fontWeight: 650 }}>Sessões por dia</small>
          <div role="img" aria-label="Sessões por dia" style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 56, marginTop: 6 }}>
            {daily.map((d) => (
              <div key={d.day} title={`${d.day.split("-").reverse().join("/")}: ${d.sessions}`} style={{ flex: 1, minWidth: 2, height: `${Math.max(6, (d.sessions / maxDay) * 100)}%`, background: "var(--gd-coral)", opacity: 0.8, borderRadius: 3 }} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
