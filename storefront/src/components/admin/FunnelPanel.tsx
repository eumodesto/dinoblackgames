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

  // Detalhe de cada etapa no balão (passar o mouse): descrição, % da etapa anterior e perda.
  const vizSteps = steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1].count : null;
    const rate = prev === null ? null : ratio(step.count, prev);
    const detail = prev === null ? "" : rate !== null && rate > 1 ? " · sem sessão rastreada" : ` · ${pct(rate)} da etapa anterior${prev - step.count > 0 ? ` (−${nf.format(prev - step.count)})` : ""}`;
    return { short: step.short, count: step.count, title: `${step.label}: ${nf.format(step.count)}${detail}\n${step.hint}` };
  });

  const tiles: [string, string][] = [
    segmented ? ["Chegaram ao pagamento", pct(ratio(created, top))] : ["Conversão geral", pct(ratio(funnel.paidOrders, top))],
    ["Abandono de carrinho", pct(carts > 0 ? Math.max(0, (carts - created) / carts) : null)],
    segmented ? ["Pagamentos gerados", nf.format(created)] : ["Gerados e não pagos", nf.format(Math.max(0, created - funnel.paidOrders))],
    ["Busca usada", nf.format(side.searched)],
    ["Viram produto esgotado", nf.format(side.stockOut)],
    ["Cupom aplicado", nf.format(side.coupon)],
  ];
  const tileHint: Record<string, string> = {
    "Conversão geral": "Compras pagas ÷ sessões", "Chegaram ao pagamento": "Pagamento gerado ÷ sessões do segmento", "Abandono de carrinho": "Colocaram no carrinho e não geraram pagamento",
    "Gerados e não pagos": "Pix não pago ou cartão recusado", "Pagamentos gerados": "No segmento escolhido", "Busca usada": "Sessões que usaram a busca",
    "Viram produto esgotado": "Sessões — perda por estoque, não por interesse", "Cupom aplicado": "Sessões com cupom válido no checkout",
  };

  return (
    <section className="gd-panel" aria-labelledby="funnel-title">
      <header className="gd-panel-head" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 id="funnel-title">Funil da jornada</h2>
          <p>{range.label}{segmentLabel ? ` · ${segmentLabel}` : ""} · por sessão, horário de Brasília · passe o mouse nas etapas para ver a perda</p>
        </div>
        <FunnelFilters
          periodo={range.key} de={range.de} ate={range.ate} max={today}
          dispositivo={segment.dispositivo} origem={segment.origem}
          deviceOptions={funnel.deviceOptions} sourceOptions={funnel.sourceOptions}
        />
      </header>

      {empty && (
        <p role="status" style={{ margin: "0 0 8px", padding: "8px 12px", borderRadius: 12, background: "var(--gd-card-light)", color: "var(--gd-muted)", fontSize: 12 }}>
          {segmented ? "Nenhuma sessão neste segmento e período." : "Ainda sem visitas neste período. Os eventos começam a ser gravados assim que o site recebe acessos (visitas ao painel admin e bots não contam)."}
        </p>
      )}

      <FunnelViz steps={vizSteps} />

      {segmented && (
        <p style={{ margin: "4px 0 0", color: "var(--gd-muted)", fontSize: 11 }}>
          Com segmento ativo a etapa “Compra paga” não aparece: os pedidos não guardam o dispositivo nem a origem da sessão.
        </p>
      )}

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: 10 }}>
        {tiles.map(([title, value]) => (
          <div key={title} title={tileHint[title]} style={{ padding: "7px 10px", borderRadius: 12, background: "var(--gd-card-light)", border: "1px solid var(--gd-line)" }}>
            <small style={{ color: "var(--gd-muted)", fontWeight: 650 }}>{title}</small>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {daily.length > 1 && (
        <div role="img" aria-label="Sessões por dia" title="Sessões por dia" style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32, marginTop: 10 }}>
          {daily.map((d) => (
            <div key={d.day} title={`${d.day.split("-").reverse().join("/")}: ${d.sessions} sessões`} style={{ flex: 1, minWidth: 2, height: `${Math.max(8, (d.sessions / maxDay) * 100)}%`, background: "var(--gd-coral)", opacity: 0.8, borderRadius: 3 }} />
          ))}
        </div>
      )}
    </section>
  );
}
