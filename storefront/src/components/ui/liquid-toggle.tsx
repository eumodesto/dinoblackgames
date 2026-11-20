"use client";

import { cn } from "@/lib/cn";

/** Botão de liga/desliga com efeito "líquido". Controlado pelo pai (`checked` + `onCheckedChange`). */
const styles = {
  switch: `relative block shrink-0 cursor-pointer
    [--c-active:#275EFE]
    [--c-success:#10B981]
    [--c-warning:#F59E0B]
    [--c-danger:#EF4444]
    [--c-default:#52525b]
    [--c-default-dark:#71717a]
    [transform:translateZ(0)]
    [backface-visibility:hidden]`,
  input: `h-full w-full cursor-pointer appearance-none rounded-full
    bg-(--c-default) outline-none transition-colors duration-500
    hover:bg-(--c-default-dark)
    focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
    disabled:cursor-wait disabled:opacity-60
    data-[checked=true]:bg-(--c-background)`,
  svg: "pointer-events-none absolute inset-0 fill-white",
  circle: "transform-gpu transition-transform duration-500 [backface-visibility:hidden]",
  dropCircle: "transform-gpu transition-transform duration-700",
};

const variantStyles = {
  default: "[--c-background:var(--c-active)]",
  success: "[--c-background:var(--c-success)]",
  warning: "[--c-background:var(--c-warning)]",
  danger: "[--c-background:var(--c-danger)]",
};

type ToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  variant?: keyof typeof variantStyles;
  /** md: 52×32 · sm: 39×24 (mesma proporção; acompanha a altura de um selo de status). */
  size?: "md" | "sm";
};

const sizes = { md: "h-8 w-[52px]", sm: "h-6 w-[39px]" };

export function Toggle({ checked, onCheckedChange, label, disabled, className, variant = "default", size = "md" }: ToggleProps) {
  return (
    <label className={cn(styles.switch, sizes[size], className)}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-checked={checked}
        className={cn(styles.input, variantStyles[variant])}
      />
      <svg viewBox="0 0 52 32" filter="url(#goo)" className={styles.svg} aria-hidden>
        <circle className={styles.circle} cx="16" cy="16" r="10" style={{ transformOrigin: "16px 16px", transform: `translateX(${checked ? "12px" : "0px"}) scale(${checked ? "0" : "1"})` }} />
        <circle className={styles.circle} cx="36" cy="16" r="10" style={{ transformOrigin: "36px 16px", transform: `translateX(${checked ? "0px" : "-12px"}) scale(${checked ? "1" : "0"})` }} />
        {checked && <circle className={styles.dropCircle} cx="35" cy="-1" r="2.5" />}
      </svg>
    </label>
  );
}

/** Filtro SVG do efeito; coloque uma vez por página, junto dos botões. */
export function GooeyFilter() {
  return (
    <svg className="fixed h-0 w-0" aria-hidden>
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
