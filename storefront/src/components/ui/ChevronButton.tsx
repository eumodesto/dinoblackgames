import { cn } from "@/lib/cn";

type ChevronButtonProps = {
  direction: "left" | "right";
  label: string;
  onClick: () => void;
  /** md: 40px (carrosséis e cards) · lg: 48px (banner principal). */
  size?: "md" | "lg";
  /** overlay: sobre imagem/card sempre escuro · surface: acompanha o tema da página. */
  variant?: "overlay" | "surface";
  className?: string;
};

const CIRCLE = {
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const ICON = {
  md: "h-6 w-6",
  lg: "h-7 w-7",
} as const;

const VARIANT = {
  overlay:
    "border-white/15 bg-white/10 text-white backdrop-blur hover:border-dino-red hover:bg-dino-red",
  surface:
    "border-gray-200 text-gray-600 hover:border-dino-red hover:bg-dino-red hover:text-white dark:border-zinc-700 dark:text-zinc-300",
} as const;

/** Seta de carrossel padrão da loja: círculo fixo, chevron grande dentro. */
export function ChevronButton({
  direction,
  label,
  onClick,
  size = "md",
  variant = "overlay",
  className,
}: ChevronButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dino-red active:scale-95",
        CIRCLE[size],
        VARIANT[variant],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={ICON[size]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
      </svg>
    </button>
  );
}
