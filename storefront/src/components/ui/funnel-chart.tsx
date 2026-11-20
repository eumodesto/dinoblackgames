"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Gráfico de funil em camadas (SVG + animação de mola). Adaptado do modelo enviado: usa as cores do
// painel admin (--gd-*) e o `cn` local, sem dependências extras além do `motion`.

export interface FunnelGradientStop { offset: string | number; color: string }

export interface FunnelStage {
  label: string;
  value: number;
  displayValue?: string;
  /** Texto do balão (title) ao passar o mouse sobre a etapa. */
  title?: string;
  color?: string;
  gradient?: FunnelGradientStop[];
}

export interface FunnelChartProps {
  data: FunnelStage[];
  orientation?: "horizontal" | "vertical";
  color?: string;
  layers?: number;
  className?: string;
  style?: CSSProperties;
  showPercentage?: boolean;
  showValues?: boolean;
  showLabels?: boolean;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  formatPercentage?: (pct: number) => string;
  formatValue?: (value: number) => string;
  staggerDelay?: number;
  gap?: number;
  renderPattern?: (id: string, color: string) => ReactNode;
  edges?: "curved" | "straight";
  labelLayout?: "spread" | "grouped";
  labelOrientation?: "vertical" | "horizontal";
  labelAlign?: "center" | "start" | "end";
  grid?: boolean | { bands?: boolean; bandColor?: string; lines?: boolean; lineColor?: string; lineOpacity?: number; lineWidth?: number };
}

const fmtPct = (p: number) => `${Math.round(p)}%`;
const fmtVal = (v: number) => v.toLocaleString("pt-BR");
const springConfig = { stiffness: 120, damping: 20, mass: 1 };
const hoverSpring = { stiffness: 300, damping: 24 };

function hSegmentPath(normStart: number, normEnd: number, segW: number, H: number, layerScale: number, straight = false) {
  const my = H / 2;
  const h0 = normStart * H * 0.44 * layerScale;
  const h1 = normEnd * H * 0.44 * layerScale;
  if (straight) return `M 0 ${my - h0} L ${segW} ${my - h1} L ${segW} ${my + h1} L 0 ${my + h0} Z`;
  const cx = segW * 0.55;
  const top = `M 0 ${my - h0} C ${cx} ${my - h0}, ${segW - cx} ${my - h1}, ${segW} ${my - h1}`;
  const bot = `L ${segW} ${my + h1} C ${segW - cx} ${my + h1}, ${cx} ${my + h0}, 0 ${my + h0}`;
  return `${top} ${bot} Z`;
}

function vSegmentPath(normStart: number, normEnd: number, segH: number, W: number, layerScale: number, straight = false) {
  const mx = W / 2;
  const w0 = normStart * W * 0.44 * layerScale;
  const w1 = normEnd * W * 0.44 * layerScale;
  if (straight) return `M ${mx - w0} 0 L ${mx - w1} ${segH} L ${mx + w1} ${segH} L ${mx + w0} 0 Z`;
  const cy = segH * 0.55;
  const left = `M ${mx - w0} 0 C ${mx - w0} ${cy}, ${mx - w1} ${segH - cy}, ${mx - w1} ${segH}`;
  const right = `L ${mx + w1} ${segH} C ${mx + w1} ${segH - cy}, ${mx + w0} ${cy}, ${mx + w0} 0`;
  return `${left} ${right} Z`;
}

/** Camada do segmento: cresce um pouco ao passar o mouse (mais nas camadas externas). */
function Ring({ axis, d, color, fill, opacity, hovered, ringIndex, totalRings }: { axis: "x" | "y"; d: string; color: string; fill?: string; opacity: number; hovered: boolean; ringIndex: number; totalRings: number }) {
  const extraScale = 1 + (ringIndex / Math.max(totalRings - 1, 1)) * 0.12;
  const scale = useSpring(1, { stiffness: 300 - ringIndex * 60, damping: 24 - ringIndex * 3 });
  useEffect(() => { scale.set(hovered ? extraScale : 1); }, [hovered, scale, extraScale]);
  return <motion.path d={d} fill={fill ?? color} opacity={opacity} style={axis === "y" ? { scaleY: scale, transformOrigin: "center center" } : { scaleX: scale, transformOrigin: "center center" }} />;
}

function Segment({ horizontal, index, normStart, normEnd, size, full, color, layers, staggerDelay, hovered, dimmed, renderPattern, straight, gradientStops }: {
  horizontal: boolean; index: number; normStart: number; normEnd: number; size: number; full: number; color: string; layers: number; staggerDelay: number;
  hovered: boolean; dimmed: boolean; renderPattern?: (id: string, color: string) => ReactNode; straight: boolean; gradientStops?: FunnelGradientStop[];
}) {
  const dir = horizontal ? "h" : "v";
  const patternId = `funnel-${dir}-pattern-${index}`;
  const gradientId = `funnel-${dir}-grad-${index}`;
  const grow = useSpring(0, springConfig);
  const entrance = useTransform(grow, [0, 1], [0, 1]);
  const dimOpacity = useSpring(1, hoverSpring);

  useEffect(() => { dimOpacity.set(dimmed ? 0.4 : 1); }, [dimmed, dimOpacity]);
  useEffect(() => {
    const timeout = setTimeout(() => grow.set(1), index * staggerDelay * 1000);
    return () => clearTimeout(timeout);
  }, [grow, index, staggerDelay]);

  const rings = Array.from({ length: layers }, (_, l) => {
    const scale = 1 - (l / layers) * 0.35;
    const opacity = 0.18 + (l / (layers - 1 || 1)) * 0.65;
    return { d: horizontal ? hSegmentPath(normStart, normEnd, size, full, scale, straight) : vSegmentPath(normStart, normEnd, size, full, scale, straight), opacity };
  });

  return (
    <motion.div className="pointer-events-none relative shrink-0 overflow-visible" style={{ width: horizontal ? size : full, height: horizontal ? full : size, zIndex: hovered ? 10 : 1, opacity: dimOpacity }}>
      <motion.div className="absolute inset-0 overflow-visible" style={{ scaleX: entrance, scaleY: entrance, transformOrigin: horizontal ? "left center" : "center top" }}>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" role="presentation" viewBox={horizontal ? `0 0 ${size} ${full}` : `0 0 ${full} ${size}`}>
          <defs>
            {gradientStops && (
              <linearGradient id={gradientId} x1="0" x2={horizontal ? "1" : "0"} y1="0" y2={horizontal ? "0" : "1"}>
                {gradientStops.map((stop) => (
                  <stop key={`${stop.offset}-${stop.color}`} offset={typeof stop.offset === "number" ? `${stop.offset * 100}%` : stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
            )}
            {renderPattern?.(patternId, color)}
          </defs>
          {rings.map((r, i) => {
            const innermost = i === rings.length - 1;
            const fill = innermost && renderPattern ? `url(#${patternId})` : innermost && gradientStops ? `url(#${gradientId})` : undefined;
            return <Ring key={`${dir}-ring-${r.opacity.toFixed(2)}`} axis={horizontal ? "y" : "x"} color={color} d={r.d} fill={fill} hovered={hovered} opacity={r.opacity} ringIndex={i} totalRings={layers} />;
          })}
        </svg>
      </motion.div>
    </motion.div>
  );
}

function SegmentLabel({ stage, pct, isHorizontal, showValues, showPercentage, showLabels, formatPercentage, formatValue, index, staggerDelay, layout = "spread", orientation, align = "center" }: {
  stage: FunnelStage; pct: number; isHorizontal: boolean; showValues: boolean; showPercentage: boolean; showLabels: boolean;
  formatPercentage: (p: number) => string; formatValue: (v: number) => string; index: number; staggerDelay: number;
  layout?: "spread" | "grouped"; orientation?: "vertical" | "horizontal"; align?: "center" | "start" | "end";
}) {
  const display = stage.displayValue ?? formatValue(stage.value);
  const valueEl = showValues && <span className="whitespace-nowrap text-sm font-semibold text-[color:var(--gd-ink)]">{display}</span>;
  const pctEl = showPercentage && <span className="rounded-full bg-[color:var(--gd-primary)] px-3 py-1 text-xs font-bold text-[color:var(--gd-primary-ink)] shadow-sm">{formatPercentage(pct)}</span>;
  const labelEl = showLabels && <span className="whitespace-nowrap text-xs font-medium text-[color:var(--gd-muted)]">{stage.label}</span>;
  const transition = { delay: index * staggerDelay + 0.25, duration: 0.35, ease: "easeOut" as const };

  if (layout === "spread") {
    return (
      <motion.div animate={{ opacity: 1 }} className={cn("absolute inset-0 flex", isHorizontal ? "flex-col items-center" : "flex-row items-center")} initial={{ opacity: 0 }} transition={transition}>
        {isHorizontal ? (
          <>
            <div className="flex h-[16%] items-end justify-center pb-1">{valueEl}</div>
            <div className="flex flex-1 items-center justify-center">{pctEl}</div>
            <div className="flex h-[16%] items-start justify-center pt-1">{labelEl}</div>
          </>
        ) : (
          <>
            <div className="flex w-[16%] items-center justify-end pr-2">{valueEl}</div>
            <div className="flex flex-1 items-center justify-center">{pctEl}</div>
            <div className="flex w-[16%] items-center justify-start pl-2">{labelEl}</div>
          </>
        )}
      </motion.div>
    );
  }

  const stack = (orientation ?? (isHorizontal ? "vertical" : "horizontal")) === "vertical";
  const justify = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;
  const items = { start: "items-start", center: "items-center", end: "items-end" } as const;
  return (
    <motion.div animate={{ opacity: 1 }} className={cn("absolute inset-0 flex", isHorizontal ? cn("flex-col items-center", justify[align]) : cn("flex-row items-center", justify[align]))} initial={{ opacity: 0 }} style={{ padding: isHorizontal ? "8% 0" : "0 8%" }} transition={transition}>
      <div className={cn("flex gap-1.5", stack ? cn("flex-col", items[isHorizontal ? "center" : align]) : cn("flex-row", items.center))}>
        {valueEl}{pctEl}{labelEl}
      </div>
    </motion.div>
  );
}

export function FunnelChart({
  data, orientation = "horizontal", color = "var(--gd-coral)", layers = 3, className, style, showPercentage = true, showValues = true, showLabels = true,
  hoveredIndex: hoveredIndexProp, onHoverChange, formatPercentage = fmtPct, formatValue = fmtVal, staggerDelay = 0.12, gap = 4, renderPattern,
  edges = "curved", labelLayout = "spread", labelOrientation, labelAlign = "center", grid: gridProp = false,
}: FunnelChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState({ w: 0, h: 0 });
  const [internalHovered, setInternalHovered] = useState<number | null>(null);
  const controlled = hoveredIndexProp !== undefined;
  const hoveredIndex = controlled ? hoveredIndexProp : internalHovered;
  const setHovered = useCallback((i: number | null) => { if (controlled) onHoverChange?.(i); else setInternalHovered(i); }, [controlled, onHoverChange]);

  const measure = useCallback(() => {
    if (!ref.current) return;
    const { width: w, height: h } = ref.current.getBoundingClientRect();
    if (w > 0 && h > 0) setSz({ w, h });
  }, []);
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  const first = data[0];
  if (!first || first.value <= 0) return null;

  const max = first.value;
  const n = data.length;
  const norms = data.map((d) => d.value / max);
  const horiz = orientation === "horizontal";
  const { w: W, h: H } = sz;
  const segW = (W - (horiz ? gap * (n - 1) : 0)) / n;
  const segH = (H - (horiz ? 0 : gap * (n - 1))) / n;

  const gridEnabled = gridProp !== false;
  const gridCfg = typeof gridProp === "object" ? gridProp : {};
  const showBands = gridEnabled && (gridCfg.bands ?? true);
  const bandColor = gridCfg.bandColor ?? "var(--gd-card-light)";
  const showGridLines = gridEnabled && (gridCfg.lines ?? true);
  const gridLineColor = gridCfg.lineColor ?? "var(--gd-line)";
  const gridLineOpacity = gridCfg.lineOpacity ?? 1;
  const gridLineWidth = gridCfg.lineWidth ?? 1;

  return (
    <div className={cn("relative w-full select-none overflow-visible", className)} ref={ref} style={{ aspectRatio: horiz ? "2.2 / 1" : "1 / 1.8", ...style }}>
      {W > 0 && H > 0 && (
        <>
          {gridEnabled && showBands && (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" role="presentation" viewBox={`0 0 ${W} ${H}`}>
              {data.map((stage, i) => {
                if (i % 2 !== 0) return null;
                return horiz
                  ? <rect fill={bandColor} height={H} key={`band-${stage.label}`} width={segW} x={(segW + gap) * i} y={0} />
                  : <rect fill={bandColor} height={segH} key={`band-${stage.label}`} width={W} x={0} y={(segH + gap) * i} />;
              })}
            </svg>
          )}

          <div className={cn("absolute inset-0 flex overflow-visible", horiz ? "flex-row" : "flex-col")} style={{ gap }}>
            {data.map((stage, i) => {
              const normStart = norms[i] ?? 0;
              const normEnd = norms[Math.min(i + 1, n - 1)] ?? 0;
              const firstStop = stage.gradient?.[0];
              return (
                <Segment key={stage.label} color={firstStop ? firstStop.color : (stage.color ?? color)} dimmed={hoveredIndex !== null && hoveredIndex !== i}
                  full={horiz ? H : W} gradientStops={stage.gradient} hovered={hoveredIndex === i} horizontal={horiz} index={i} layers={layers}
                  normEnd={normEnd} normStart={normStart} renderPattern={renderPattern} size={horiz ? segW : segH} staggerDelay={staggerDelay} straight={edges === "straight"} />
              );
            })}
          </div>

          {gridEnabled && showGridLines && (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" role="presentation" viewBox={`0 0 ${W} ${H}`}>
              {Array.from({ length: n - 1 }, (_, i) => {
                const idx = i + 1;
                if (horiz) {
                  const x = segW * idx + gap * i + gap / 2;
                  return <line key={`grid-${idx}`} stroke={gridLineColor} strokeOpacity={gridLineOpacity} strokeWidth={gridLineWidth} x1={x} x2={x} y1={0} y2={H} />;
                }
                const y = segH * idx + gap * i + gap / 2;
                return <line key={`grid-${idx}`} stroke={gridLineColor} strokeOpacity={gridLineOpacity} strokeWidth={gridLineWidth} x1={0} x2={W} y1={y} y2={y} />;
              })}
            </svg>
          )}

          {data.map((stage, i) => {
            const pct = (stage.value / max) * 100;
            const pos: CSSProperties = horiz ? { left: (segW + gap) * i, width: segW, top: 0, height: H } : { top: (segH + gap) * i, height: segH, left: 0, width: W };
            const dimmed = hoveredIndex !== null && hoveredIndex !== i;
            return (
              <motion.div animate={{ opacity: dimmed ? 0.4 : 1 }} className="absolute cursor-pointer" key={`lbl-${stage.label}`} title={stage.title} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                style={{ ...pos, zIndex: 20 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
                <SegmentLabel align={labelAlign} formatPercentage={formatPercentage} formatValue={formatValue} index={i} isHorizontal={horiz} layout={labelLayout} orientation={labelOrientation}
                  pct={pct} showLabels={showLabels} showPercentage={showPercentage} showValues={showValues} stage={stage} staggerDelay={staggerDelay} />
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
}

FunnelChart.displayName = "FunnelChart";

export default FunnelChart;
