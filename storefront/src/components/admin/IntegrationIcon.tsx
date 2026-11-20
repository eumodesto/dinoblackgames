import { BRAND_ICONS } from "./brand-icons";

export type IntegrationSlug = keyof typeof BRAND_ICONS | "clarity";

const SIZES = { md: { tile: 44, icon: 24 }, lg: { tile: 56, icon: 30 } } as const;

/**
 * Ícone da integração dentro de um quadrado com a cor da marca.
 * Resend é preto no original; sobre o fundo escuro do painel ele aparece branco.
 * O Clarity não tem arquivo oficial no pacote usado: mostra um glifo genérico de mapa de calor na cor azul da Microsoft.
 */
export function IntegrationIcon({ slug, size = "md" }: { slug: IntegrationSlug; size?: keyof typeof SIZES }) {
  const { tile, icon } = SIZES[size];
  const brand = slug === "clarity" ? null : BRAND_ICONS[slug];
  const color = slug === "resend" ? "#ffffff" : brand?.hex ?? "#2D7FF9";
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-xl border" style={{ width: tile, height: tile, background: `${color}1f`, borderColor: `${color}40`, color }}>
      {brand ? (
        <svg viewBox="0 0 24 24" width={icon} height={icon} fill="currentColor" role="img"><path d={brand.path} /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width={icon} height={icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M7 15l3-4 3 2 4-5" /></svg>
      )}
    </span>
  );
}
