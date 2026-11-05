import { PRODUCTS, type Product } from "@/data/demo";

/**
 * Dados de DEMONSTRAÇÃO da página de produto.
 * Em produção, tudo isto vem do catálogo (ver docs/Plano_Pagina_Produto.md,
 * seção "Modelo de dados"). Fotos, especificações, prazos e garantia abaixo
 * são ilustrativos e precisam ser substituídos pelos dados reais.
 */

export type Condition = "novo" | "seminovo" | "raridade" | "pre-venda";

export type GalleryImage = {
  src: string;
  alt: string;
  /** Recorte (object-position) para simular ângulos diferentes na demo. */
  position?: string;
};

export type OptionValue = { label: string; available: boolean };
export type ProductOption = { id: "color" | "storage"; name: string; values: OptionValue[] };

export type Highlight = { title: string; text: string };
export type SpecGroup = { group: string; rows: [label: string, value: string][] };
export type Faq = { q: string; a: string };

export type UnitReport = {
  grade: string;
  summary: string;
  included: string[];
  knownMarks: string[];
  tested: string[];
};

export type ProductDetail = {
  slug: string;
  sku: string;
  brand: string;
  platform: string;
  condition: Condition;
  tagline: string;
  gallery: GalleryImage[];
  options: ProductOption[];
  highlights: Highlight[];
  specs: SpecGroup[];
  inBox: string[];
  warranty: { months: number; text: string };
  faq: Faq[];
  /** Só para seminovo: laudo da unidade específica. */
  unit?: UnitReport;
};

export const CONDITION_LABEL: Record<Condition, string> = {
  novo: "Novo",
  seminovo: "Seminovo · unidade única",
  raridade: "Raridade",
  "pre-venda": "Pré-venda",
};

export const MAX_INSTALLMENTS = 10;

const COMMON_FAQ: Faq[] = [
  {
    q: "Como funciona a entrega?",
    a: "Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP, antes de pagar. Em Brasília e entorno também é possível retirar na loja, em Santa Maria.",
  },
  {
    q: "Posso trocar ou devolver?",
    a: "Sim. As regras de troca e devolução ficam na política da loja e valem para produtos novos e seminovos. Em caso de dúvida, fale com a gente pelo WhatsApp antes de comprar.",
  },
  {
    q: "Vocês compram usados?",
    a: "Sim, pelo Projeto Drop. Você envia as informações e fotos do item, nós avaliamos e respondemos com a próxima etapa. A avaliação não é uma oferta final de valor.",
  },
];

const gallery = (product: Product, name: string): GalleryImage[] => [
  { src: product.image, alt: name },
  { src: product.image, alt: `${name}, detalhe`, position: "20% 30%" },
  { src: product.image, alt: `${name}, vista lateral`, position: "85% 70%" },
];

const BY_SLUG: Record<string, Omit<ProductDetail, "slug" | "gallery">> = {
  "playstation-5-slim-1tb": {
    sku: "DB-PS5-01",
    brand: "Sony",
    platform: "PlayStation",
    condition: "novo",
    tagline:
      "SSD ultrarrápido, DualSense e o catálogo exclusivo da PlayStation em um console mais compacto.",
    options: [
      { id: "storage", name: "Armazenamento", values: [{ label: "1 TB", available: true }] },
      {
        id: "color",
        name: "Cor",
        values: [
          { label: "Branco", available: true },
          { label: "Preto", available: false },
        ],
      },
    ],
    highlights: [
      {
        title: "Carregamento quase instantâneo",
        text: "O SSD de alta velocidade praticamente elimina as telas de espera e leva você direto para o jogo.",
      },
      {
        title: "DualSense: você sente o jogo",
        text: "Feedback tátil e gatilhos adaptáveis fazem cada ação ter uma resposta nas suas mãos.",
      },
      {
        title: "Imagem em até 4K",
        text: "Jogos em alta resolução e taxa de quadros elevada, compatível com TVs 4K e monitores modernos.",
      },
    ],
    specs: [
      {
        group: "Desempenho",
        rows: [
          ["Armazenamento", "SSD de 1 TB"],
          ["Resolução", "Até 4K"],
          ["Taxa de quadros", "Até 120 fps em jogos compatíveis"],
        ],
      },
      {
        group: "Conexões",
        rows: [
          ["Saída de vídeo", "HDMI 2.1"],
          ["USB", "Portas USB-A e USB-C"],
          ["Rede", "Wi-Fi e Ethernet"],
        ],
      },
      {
        group: "Geral",
        rows: [
          ["Marca", "Sony"],
          ["Condição", "Novo, lacrado"],
          ["Garantia", "12 meses"],
        ],
      },
    ],
    inBox: [
      "Console PlayStation 5 Slim",
      "1 controle DualSense",
      "Cabo HDMI",
      "Cabo de energia",
      "Cabo USB",
      "Base de apoio",
    ],
    warranty: {
      months: 12,
      text: "Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.",
    },
    faq: [
      {
        q: "O console vem lacrado e com nota fiscal?",
        a: "Sim. Produtos novos saem na embalagem original, com nota fiscal e garantia.",
      },
      ...COMMON_FAQ,
    ],
  },
  "nintendo-switch-oled": {
    sku: "DB-SWO-02",
    brand: "Nintendo",
    platform: "Nintendo",
    condition: "novo",
    tagline:
      "Tela OLED vibrante, base com porta de rede e a liberdade de jogar em casa ou na rua.",
    options: [
      {
        id: "color",
        name: "Cor",
        values: [
          { label: "Branco", available: true },
          { label: "Neon azul e vermelho", available: true },
        ],
      },
    ],
    highlights: [
      {
        title: "Tela OLED de 7 polegadas",
        text: "Cores intensas e pretos profundos, com bordas finas que deixam a imagem maior.",
      },
      {
        title: "Três modos, um console",
        text: "Jogue na TV, no modo portátil ou em cima da mesa com o suporte ajustável.",
      },
      {
        title: "Biblioteca Nintendo",
        text: "Exclusivos como Mario, Zelda e Pokémon, para jogar sozinho ou em grupo.",
      },
    ],
    specs: [
      {
        group: "Tela e jogo",
        rows: [
          ["Tela", "OLED de 7 polegadas"],
          ["Armazenamento", "64 GB (expansível por cartão microSD)"],
          ["Modos de jogo", "TV, portátil e de mesa"],
        ],
      },
      {
        group: "Conexões",
        rows: [
          ["Base (dock)", "HDMI, USB e porta LAN"],
          ["Controles", "Joy-Con (L) e (R) destacáveis"],
        ],
      },
      {
        group: "Geral",
        rows: [
          ["Marca", "Nintendo"],
          ["Condição", "Novo, lacrado"],
          ["Garantia", "12 meses"],
        ],
      },
    ],
    inBox: [
      "Console Nintendo Switch OLED",
      "2 controles Joy-Con",
      "Base (dock)",
      "Suporte para os Joy-Con",
      "Cabo HDMI",
      "Adaptador de energia",
    ],
    warranty: {
      months: 12,
      text: "Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.",
    },
    faq: [
      {
        q: "Qual a diferença para o Switch comum?",
        a: "A tela OLED é maior e mais vibrante, a base tem porta de rede e o suporte traseiro é ajustável. O desempenho dos jogos é o mesmo.",
      },
      ...COMMON_FAQ,
    ],
  },
  "dualsense-branco": {
    sku: "DB-DU-03",
    brand: "Sony",
    platform: "PlayStation",
    condition: "seminovo",
    tagline:
      "Unidade seminovo revisada pela DinoBlack, com laudo, fotos reais e garantia.",
    options: [],
    highlights: [
      {
        title: "Unidade única e revisada",
        text: "Você compra exatamente o controle das fotos. Testamos botões, gatilhos, analógicos e bateria.",
      },
      {
        title: "Feedback tátil",
        text: "Vibração de alta precisão e gatilhos adaptáveis em jogos compatíveis.",
      },
      {
        title: "Preço de seminovo",
        text: "Mais barato que um novo, com garantia e laudo para você saber o que está levando.",
      },
    ],
    specs: [
      {
        group: "Controle",
        rows: [
          ["Conexão", "Bluetooth e cabo USB-C"],
          ["Recursos", "Feedback tátil, gatilhos adaptáveis, microfone embutido"],
          ["Compatível com", "PlayStation 5 e PC"],
        ],
      },
      {
        group: "Geral",
        rows: [
          ["Marca", "Sony"],
          ["Condição", "Seminovo, unidade única"],
          ["Garantia", "90 dias"],
        ],
      },
    ],
    inBox: ["Controle DualSense", "Cabo USB-C"],
    warranty: {
      months: 3,
      text: "Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.",
    },
    unit: {
      grade: "Muito bom",
      summary: "Poucos sinais de uso, tudo funcionando.",
      tested: ["Botões e direcional", "Gatilhos adaptáveis", "Analógicos", "Bateria", "Conexão Bluetooth e USB"],
      included: ["Controle", "Cabo USB-C"],
      knownMarks: ["Pequenas marcas de uso na parte traseira, visíveis nas fotos"],
    },
    faq: [
      {
        q: "As fotos são do controle que vou receber?",
        a: "Sim. Em seminovos, cada anúncio é uma unidade específica, e as fotos mostram o item real.",
      },
      {
        q: "E se alguém comprar antes de mim?",
        a: "Como é unidade única, a disponibilidade é atualizada em tempo real. Se esgotar, avisamos e sugerimos alternativas.",
      },
      ...COMMON_FAQ,
    ],
  },
  "notebook-gamer-rtx4060": {
    sku: "DB-NB-04",
    brand: "Gamer",
    platform: "Windows",
    condition: "novo",
    tagline:
      "Placa de vídeo dedicada e 16 GB de memória para jogar em alto desempenho e criar sem travar.",
    options: [],
    highlights: [
      { title: "GPU dedicada RTX 4060", text: "Desempenho para jogos atuais em alta taxa de quadros." },
      { title: "16 GB de memória", text: "Espaço para jogar, transmitir e manter vários programas abertos." },
      { title: "Pronto para criação", text: "Boa base para edição de vídeo, modelagem e streaming." },
    ],
    specs: [
      {
        group: "Desempenho",
        rows: [
          ["Placa de vídeo", "NVIDIA GeForce RTX 4060"],
          ["Memória RAM", "16 GB"],
        ],
      },
      {
        group: "Geral",
        rows: [
          ["Condição", "Novo"],
          ["Garantia", "12 meses"],
        ],
      },
    ],
    inBox: ["Notebook", "Carregador", "Manual e documentos de garantia"],
    warranty: { months: 12, text: "Garantia de 12 meses, com suporte da DinoBlack." },
    faq: COMMON_FAQ,
  },
};

const DEFAULT_DETAIL: Omit<ProductDetail, "slug" | "gallery"> = {
  sku: "DB-0000",
  brand: "DinoBlack",
  platform: "Multi",
  condition: "novo",
  tagline: "Produto selecionado pela DinoBlack, com garantia e envio para todo o Brasil.",
  options: [],
  highlights: [
    { title: "Selecionado pela DinoBlack", text: "Curadoria de quem entende de games e tecnologia." },
    { title: "Envio para todo o Brasil", text: "Calcule prazo e valor pelo CEP antes de pagar." },
    { title: "Suporte de verdade", text: "Tire dúvidas antes e depois da compra pelo WhatsApp." },
  ],
  specs: [
    {
      group: "Geral",
      rows: [
        ["Condição", "Novo"],
        ["Garantia", "12 meses"],
      ],
    },
  ],
  inBox: ["Produto", "Manual e documentos de garantia"],
  warranty: { months: 12, text: "Garantia de 12 meses, com suporte da DinoBlack." },
  faq: COMMON_FAQ,
};

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductDetail(product: Product): ProductDetail {
  const base = BY_SLUG[product.slug] ?? DEFAULT_DETAIL;
  return {
    ...base,
    sku: BY_SLUG[product.slug] ? base.sku : `DB-${product.id.padStart(4, "0")}`,
    slug: product.slug,
    gallery: gallery(product, product.name),
  };
}

export function getRelatedProducts(product: Product, limit = 6): Product[] {
  const same = PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category);
  const others = PRODUCTS.filter((p) => p.id !== product.id && p.category !== product.category);
  return [...same, ...others].slice(0, limit);
}

export function installmentValue(price: number, times = MAX_INSTALLMENTS) {
  return Math.round((price / times) * 100) / 100;
}
