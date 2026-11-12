export const FOOTER_BRAND = "DinoBlack Games e Informática";

export const FOOTER_DESCRIPTION =
  "Excelência em vendas, manutenção e suporte. Produtos de qualidade, envio para todo o Brasil e compra de usados. Tecnologia, games e confiança em um só lugar!";

export const FOOTER_ADDRESS = "Qr 117 Conjunto Q, 05 - Santa Maria, Brasília - DF.";
export const FOOTER_MAPS_URL = "https://maps.app.goo.gl/Kte3czHkyV267t836";

export const SOCIAL_LINKS = [
  {
    id: "youtube",
    label: "YouTube DinoBlack Games",
    href: "https://www.youtube.com/@DinoBlackGames",
  },
  {
    id: "tiktok",
    label: "TikTok DinoBlack Games",
    href: "https://www.tiktok.com/@dinoblack.games",
  },
  {
    id: "facebook",
    label: "Facebook DinoBlack Games",
    href: "https://www.facebook.com/dinoblackgames",
  },
] as const;

export type FooterLink = {
  label: string;
  /** Rota interna. Sem href, o item aparece como texto até a página existir. */
  href?: string;
};
export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

// Sem links externos: a loja nova ainda não tem estas páginas. Quando cada uma
// existir, basta preencher o href com a rota interna (ex.: "/loja").
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Departamentos",
    links: [
      { label: "PlayStation" },
      { label: "Nintendo" },
      { label: "Xbox" },
      { label: "Variados" },
      { label: "Pré-Vendas" },
    ],
  },
  {
    title: "Institucional",
    links: [
      {
        label: "Projeto Drop - A DinoBlack Compra seu Usado!",
      },
      { label: "Quem Somos" },
      { label: "Trabalhe Conosco" },
      {
        label: "Políticas de Troca e Devoluções",
      },
      {
        label: "Políticas de Privacidade",
      },
    ],
  },
  {
    title: "Minha conta",
    links: [
      { label: "Minha Conta", href: "/minhaconta" },
      { label: "Meus Pedidos", href: "/minhaconta" },
    ],
  },
  {
    title: "Novidade e promoções",
    links: [
      {
        label: "Regulamento Promoção - Site Novo Premiado",
      },
    ],
  },
];
