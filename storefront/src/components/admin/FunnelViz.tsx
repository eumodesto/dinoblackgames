"use client";

import { FunnelChart, type FunnelStage } from "@/components/ui/funnel-chart";

export type FunnelVizStep = { short: string; count: number; title?: string };

const pct = (p: number) => (p > 0 && p < 1 ? "<1%" : p < 10 && p % 1 !== 0 ? `${p.toFixed(1).replace(".", ",")}%` : `${Math.round(p)}%`);

/** Funil visual compacto, sempre na horizontal (em telas estreitas rola de lado). O % de cada etapa é sobre as sessões. */
export function FunnelViz({ steps }: { steps: FunnelVizStep[] }) {
  const top = steps[0]?.count ?? 0;
  if (top <= 0) return null;
  // A forma nunca passa da largura inicial (pedido pago sem sessão rastreada); o número exibido é o real.
  const data: FunnelStage[] = steps.map((s, i) => ({
    label: s.short,
    value: Math.min(s.count, top),
    displayValue: s.count.toLocaleString("pt-BR"),
    title: s.title,
    ...(i === steps.length - 1 ? { color: "var(--gd-teal)" } : {}),
  }));

  return (
    <div className="scrollbar-none mx-auto w-full overflow-x-auto">
      <div className="mx-auto min-w-[620px] w-full">
      <FunnelChart
        data={data}
        orientation="horizontal"
        color="var(--gd-coral)"
        layers={3}
        gap={3}
        labelLayout="grouped"
        labelAlign="center"
        labelOrientation="vertical"
        formatPercentage={pct}
        style={{ aspectRatio: "5 / 1" }}
      />
      </div>
    </div>
  );
}
