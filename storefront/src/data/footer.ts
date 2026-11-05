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

export type FooterLink = { label: string; href: string };
export type FooterColumn = {
  title: string;
  /** Quando existe, o título da coluna também é um link. */
  href?: string;
  links: FooterLink[];
};

// Os links apontam para o site atual (dinoblackgames.com.br) enquanto as
// páginas equivalentes da loja nova não existem. Troque por rotas internas
// conforme forem criadas.
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Departamentos",
    href: "https://dinoblackgames.com.br/loja/",
    links: [
      { label: "PlayStation", href: "https://dinoblackgames.com.br/categoria-produto/playstation/" },
      { label: "Nintendo", href: "https://dinoblackgames.com.br/categoria-produto/nintendo/" },
      { label: "Xbox", href: "https://dinoblackgames.com.br/categoria-produto/xbox/" },
      { label: "Variados", href: "https://dinoblackgames.com.br/categoria-produto/variados/" },
      { label: "Pré-Vendas", href: "https://dinoblackgames.com.br/categoria-produto/pre-vendas/" },
    ],
  },
  {
    title: "Institucional",
    links: [
      {
        label: "Projeto Drop - A DinoBlack Compra seu Usado!",
        href: "https://dinoblackgames.com.br/como-vender-seu-jogo-usado-para-a-shock-games-reload/",
      },
      { label: "Quem Somos", href: "https://dinoblackgames.com.br/quem-somos" },
      { label: "Trabalhe Conosco", href: "https://dinoblackgames.com.br/trabalhe-conosco/" },
      {
        label: "Políticas de Troca e Devoluções",
        href: "https://dinoblackgames.com.br/politicas-de-troca-ou-devolucao",
      },
      {
        label: "Políticas de Privacidade",
        href: "https://dinoblackgames.com.br/politicas-de-privacidade/",
      },
    ],
  },
  {
    title: "Minha conta",
    links: [
      { label: "Minha Conta", href: "https://dinoblackgames.com.br/minha-conta/" },
      { label: "Meus Pedidos", href: "https://dinoblackgames.com.br/minha-conta/pedidos/" },
    ],
  },
  {
    title: "Novidade e promoções",
    links: [
      {
        label: "Regulamento Promoção - Site Novo Premiado",
        href: "https://dinoblackgames.com.br/regulamento-promocao-site-novo-premiado/",
      },
    ],
  },
];
