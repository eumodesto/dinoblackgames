"use client";

import { useEffect, useState } from "react";
import { FunnelChart, type FunnelStage } from "@/components/ui/funnel-chart";

export type FunnelVizStep = { short: string; count: number };

const pct = (p: number) => (p > 0 && p < 1 ? "<1%" : p < 10 && p % 1 !== 0 ? `${p.toFixed(1).replace(".", ",")}%` : `${Math.round(p)}%`);

/** Funil visual: horizontal em telas largas e vertical no celular. O % de cada etapa é sobre as sessões. */
export function FunnelViz({ steps }: { steps: FunnelVizStep[] }) {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const top = steps[0]?.count ?? 0;
  if (top <= 0) return null;
  // A forma nunca passa da largura inicial (pedido pago sem sessão rastreada); o número exibido é o real.
  const data: FunnelStage[] = steps.map((s, i) => ({
    label: s.short,
    value: Math.min(s.count, top),
    displayValue: s.count.toLocaleString("pt-BR"),
    ...(i === steps.length - 1 ? { color: "var(--gd-teal)" } : {}),
  }));

  return (
    <div className={wide ? "mx-auto w-full" : "mx-auto w-[78%] max-w-sm"}>
      <FunnelChart
        data={data}
        orientation={wide ? "horizontal" : "vertical"}
        color="var(--gd-coral)"
        layers={3}
        gap={wide ? 4 : 6}
        labelLayout="grouped"
        labelAlign="center"
        labelOrientation="vertical"
        formatPercentage={pct}
        style={wide ? { aspectRatio: "3.4 / 1" } : { aspectRatio: "1 / 2.4" }}
      />
    </div>
  );
}
