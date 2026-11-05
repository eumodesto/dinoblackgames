# Plano da página de produto e da listagem com filtros

**DinoBlack Games e Informática** · Versão 0.1 · 5 de novembro de 2026
Status: proposta para validação. Baseada na leitura do documento de desenvolvimento (v1.2), do mapa do painel administrativo, do código do storefront e do modelo de página construído junto com este plano.

> **Como ler:** o que está marcado como **Fato** foi verificado no repositório ou nos documentos. **Proposta** é recomendação técnica ou de UX. **Validar** depende de uma decisão do cliente ou de dados que ainda não existem. Metas numéricas só viram compromisso depois do baseline, como o próprio documento de desenvolvimento determina.

---

## 1. Resumo executivo

1. A página de produto é onde a venda acontece. Hoje ela **não existe**: o banner, os cards e os carrosséis da home já apontam para `/produto/<slug>`, e essa rota dava 404. O modelo entregue resolve isso e serve de referência de layout e de comportamento.
2. O desenho segue a diretriz do documento: **visual geral inspirado na PlayStation e página de produto inspirada na Nintendo**, sempre com a identidade DinoBlack (vermelho, preto, grafite, alto contraste) e priorizando leitura, confiança e velocidade na área de compra.
3. A DinoBlack vende três coisas diferentes: **novo**, **seminovo de unidade única** e **raridade**. A página precisa de uma variante para cada uma. O seminovo muda a página inteira (laudo, fotos reais, "unidade única"), e é o maior diferencial de confiança da loja.
4. O maior risco técnico é o **modelo de dados**: o `Product` atual tem 12 campos e nenhum para condição, galeria, variações, especificações, garantia ou estoque por unidade. A seção 8 propõe o modelo, alinhado às entidades que o painel administrativo já prevê.
5. Antes de lançar, há **pendências de conteúdo e de decisão** (seção 12). As mais urgentes: fotos reais de cada produto, política de garantia e troca, regras de parcelamento e o mapeamento das categorias.

---

## 2. Diagnóstico do que existe

### 2.1 Estado do site (Fato)

| Área | Situação |
| --- | --- |
| Rotas existentes | `/` (home) e `/design-system`. Agora também `/produto/[slug]` (modelo). |
| Rotas linkadas que dão 404 | `/loja`, `/loja?categoria=…`, `/carrinho`, `/conta`, `/pedidos`, `/sobre`, `/contato`. A busca e as categorias também não levam a lugar nenhum. |
| Carrinho | Estado só no navegador, sem persistência (some ao recarregar) e **já iniciado com 2 itens de demonstração**. A linha do carrinho é identificada só pelo `id` do produto: dois produtos iguais com cores diferentes viram a mesma linha. |
| Modelo `Product` | `id, slug, name, price, compareAt, badge, discount, image, category, rating, sold, stockLeft`. Sem condição, galeria, variações, especificações, garantia, SKU ou unidade. |
| Imagens | Todas remotas do Unsplash, **uma por produto**. Algumas não combinam com o produto: a foto do "Nintendo Switch OLED" mostra um Xbox Series X; a do "Controle DualSense" mostra um controle preto de PS4; a do notebook é um laptop genérico. O cliente rejeitou o Xbox como referência visual. |
| Banco de dados e admin real | Não existem. O admin é um protótipo estático (`admin-preview`) com dados de demonstração. |
| Documento do design system | O `Design_System_DinoBlack.md` citado na seção 21 do documento de desenvolvimento **não está no repositório**. A página `/design-system` cobre parte disso. |
| Desempenho | Home com 162 kB de JavaScript no primeiro carregamento (build de produção). O cliente relatou lentidão em sites de referência e pede carregamento ágil. |

### 2.2 O que o documento de desenvolvimento exige da página de produto (Fato)

- **Seção 7.1:** confirmar modelo, condição, garantia, conteúdo da caixa, parcelamento e **entrega por CEP** na própria página.
- **Seção 7.2 (seminovo):** deixar claro que é uma **unidade específica**; fotos reais da unidade, descrição padronizada de condição, acessórios incluídos, defeitos ou marcas conhecidos, garantia e quantidade. O item sai de circulação de forma atômica após a reserva ou o pagamento.
- **Seção 7.3 (kit):** configurador com opções compatíveis, preço e estoque atualizados, snapshot imutável no pedido. Marcado como evolução posterior.
- **Seção 8, princípios:** hierarquia de compra (nome, condição, preço à vista e parcelado, estoque, entrega e CTA sem caça visual), transparência (frete, prazo, garantia, estado, conteúdo da caixa antes do pagamento), acessibilidade e performance visual.
- **Componentes:** cards que distinguem novo, seminovo, raridade, esgotado e promoção **sem depender só da cor**; **CTA persistente no mobile** sem cobrir informações; seletor de variações com estados de incompatibilidade e falta de estoque.
- **Seção 14 (métricas):** conversão, abandono por etapa, ticket médio, adesão a kit, saúde de estoque e Core Web Vitals.
- **Seção 13 (SEO):** preservar URLs, canonical, dados estruturados compatíveis com o catálogo, redirects 301.

### 2.3 O que o painel administrativo já prevê (Fato, `admin-map.json`)

Catálogo com **produtos, categorias, coleções e destaques, kits, atributos e condições** ("condições por item, especificações, acessórios incluídos e notas da unidade"). Estoque por produto/SKU e por unidade, com movimentações, ajustes, alertas e locais. Promoções e cupons, editor visual, banners, páginas institucionais, SEO e redirects. A página de produto deve ser um **espelho desses campos**, sem inventar nada que o admin não consiga editar.

### 2.4 Problemas encontrados na auditoria

| # | Problema | Gravidade | Ação |
| --- | --- | --- | --- |
| 1 | Foto do Switch OLED mostra um Xbox; foto do DualSense mostra um controle de PS4 | Alta (confiança e marca) | Substituir por fotos reais antes de divulgar |
| 2 | Carrinho identifica linha só pelo produto; ignora variação e quantidade | Alta | Criar `lineId` com produto + variação + unidade |
| 3 | Links da home, do header e do rodapé levam a 404 | Média | Criar as rotas ou esconder os links até existirem |
| 4 | O rodapé listava departamentos (PlayStation, Nintendo, Xbox, Variados, Pré-Vendas) diferentes das 4 categorias do documento (Consoles, PC Gamer, Retro, Notebooks) | Média | Decidir a estrutura de navegação com o cliente |
| 5 | Texto do rodapé em branco com 75% a 85% de opacidade sobre o vermelho dá cerca de 3,3:1 de contraste, abaixo dos 4,5:1 do WCAG AA | Média | Usar branco sólido (corrigido junto com este plano) |
| 6 | Três ícones animados (`user`, `sun`, `sun-moon`) ignoram `prefers-reduced-motion` | Baixa | Aplicar `useReducedMotion` |
| 7 | Cores `dino-black`, `graphite`, `silver`, `control` e `cyan` estão definidas mas não são usadas | Baixa | Usar no design system de produto ou remover |
| 8 | Imagens dependem de um host externo (Unsplash) | Média | Hospedar em CDN própria com formatos AVIF e WebP |
| 9 | `globals.css` mantém a animação `story-progress` da barra de stories removida | Baixa | Remover |

---

## 3. Objetivos e métricas

| Objetivo | Indicador | Observação |
| --- | --- | --- |
| Converter mais no celular | Taxa de "adicionar ao carrinho" por visita de produto; conversão por dispositivo | Metas depois do baseline |
| Reduzir dúvidas pré-venda | Cliques em "Tirar dúvida no WhatsApp" por 100 visitas; contatos sobre condição, garantia e frete | Queda esperada com laudo e FAQ |
| Aumentar confiança em seminovo | Conversão de seminovo vs. novo; devoluções por "diferente do anunciado" | Laudo e fotos reais por unidade |
| Rapidez | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (limiares "bom" do Core Web Vitals) em 4G médio | Proposta inicial, validar |
| Descoberta | Uso de filtros; saídas sem resultado; buscas sem clique | Instrumentar na fase de listagem |

---

## 4. Referências e princípios de design

As referências são as definidas pelo cliente: **PlayStation** para o visual geral e **Nintendo** para a página de produto. Esta análise **não inspecionou tecnicamente esses sites**, como o documento de desenvolvimento já observa, e eles não foram copiados. O que se aproveita são princípios de organização:

1. **Mídia grande e limpa.** A foto do produto domina a primeira dobra. Galeria com miniaturas, contador, zoom e teclado.
2. **Uma coisa por vez.** Depois do bloco de compra, a página se divide em seções claras (visão geral, especificações, caixa, entrega, perguntas), navegáveis por uma barra fixa.
3. **Imersão controlada.** Faixas escuras com imagem e destaques curtos para contar o produto, com efeitos só como acento. Preço, condição, entrega e botão nunca competem com efeito visual.
4. **Compra sempre ao alcance.** Preço e botão no quadro lateral no desktop; barra fixa no rodapé no celular quando o botão principal sai da tela.
5. **Transparência antes do pagamento.** Frete, prazo, garantia, condição e conteúdo da caixa visíveis sem sair da página.
6. **Identidade DinoBlack.** Vermelho para ação, preto e grafite como base, tipografia Rubik nos títulos e Nunito Sans no texto, cantos arredondados grandes (28px nos cartões principais).

---

## 5. Anatomia da página de produto

### 5.1 Desktop (a partir de 1024px)

```
┌───────────────────────────────────────────────────────────┐
│ Início › Consoles › PlayStation 5 Slim · 1 TB             │  breadcrumb
├──────────────────────────────┬────────────────────────────┤
│                              │ ● NOVO              SKU …   │
│   GALERIA (fixa ao rolar)    │ Título (h1)                 │
│   foto grande 4:3            │ Frase de apoio              │
│   zoom no hover, setas, 1/3  │ ★ 4,9 · 120+ vendidos       │
│                              │ ┌─────────────────────────┐ │
│   [mini][mini][mini]         │ │ R$ 4.299  −9%           │ │
│                              │ │ R$ 3.899,00             │ │
│                              │ │ ou 10x de R$ 389,90     │ │
│                              │ └─────────────────────────┘ │
│                              │ Opções (cor, armazenamento) │
│                              │ Estoque / Unidade única     │
│                              │ [−1+] [ADICIONAR AO CARRINHO]│
│                              │ Tirar dúvida no WhatsApp    │
│                              │ Calcule prazo e frete (CEP) │
│                              │ Garantia · Envio · Troca    │
├──────────────────────────────┴────────────────────────────┤
│ Visão geral | Laudo | Especificações | Na caixa | … (fixa)│  navegação de seções
├───────────────────────────────────────────────────────────┤
│ VISÃO GERAL   faixa escura com imagem + 3 destaques       │
│ LAUDO DA UNIDADE   (só seminovo)                          │
│ ESPECIFICAÇÕES   cartões por grupo                        │
│ O QUE VEM NA CAIXA                                        │
│ ENTREGA, GARANTIA E TROCA  + convite "Venda seu usado"    │
│ PERGUNTAS FREQUENTES                                      │
│ QUEM VIU ESTE PRODUTO TAMBÉM VIU   (carrossel)            │
└───────────────────────────────────────────────────────────┘
```

A galeria fica fixa enquanto o quadro de compra rola. O contrário (quadro fixo) não funciona bem porque o quadro de compra é mais alto que a tela.

### 5.2 Celular (uma coluna)

Ordem: breadcrumb, galeria (deslizável), selo de condição, título, preço e parcelas, opções, estoque, botão, CEP, confiança, navegação de seções, seções. Quando o botão principal sai da tela, aparece uma **barra fixa** com nome, preço e "Adicionar". Alvos de toque de pelo menos 40px, e 44px nos controles principais (opções, quantidade, botão).

### 5.3 Zonas, conteúdo e fonte dos dados

| Zona | Conteúdo | Fonte (admin) | Estados a tratar |
| --- | --- | --- | --- |
| Galeria | 5 a 8 fotos, ordem definida, texto alternativo, recorte | Catálogo > Mídia | Carregando (esqueleto), sem foto, falha de imagem |
| Cabeçalho do quadro | Selo de condição, SKU, título, frase de apoio, avaliação | Produto, atributos | Sem avaliação: omitir a linha (não inventar) |
| Preço | De/por, desconto, parcelamento | Oferta, promoção | Promoção expirada, sem preço, vigência |
| Opções | Cor, armazenamento, edição, cada uma com estado | Variações (SKU) | Esgotada, incompatível, única opção |
| Estoque | "Só N no estoque" ou "Unidade única" | Estoque, unidade | Última unidade, reservada por outro cliente, esgotado |
| Compra | Quantidade, adicionar ao carrinho, WhatsApp | Carrinho | Adicionado, erro, limite de estoque, "Avise-me" |
| Frete | CEP, opções de entrega, retirada na loja | Integração de frete | CEP inválido, indisponível, falha da cotação |
| Confiança | Garantia, envio, troca | Políticas | Texto por tipo (novo/seminovo) |
| Visão geral | Frase e 3 destaques | Conteúdo editorial | Sem destaques: ocultar a seção |
| Laudo (seminovo) | Condição, testes, marcas, itens incluídos | Unidade de estoque | Laudo ausente bloqueia a publicação |
| Especificações | Grupos de linhas rótulo/valor | Atributos por categoria | Linha vazia não aparece |
| Na caixa | Lista de itens | Atributos | |
| Perguntas | FAQ comum + do produto | Conteúdo | |
| Relacionados | Mesma categoria primeiro | Coleções, regras | Poucos itens: completar com destaques |

---

## 6. Variantes por tipo de produto

| Variante | O que muda na página |
| --- | --- |
| **Novo** | Selo "Novo"; estoque por quantidade (barra "só N"); seletor de quantidade; garantia do fabricante e da loja. |
| **Seminovo (unidade única)** | Selo âmbar com losango "Seminovo · unidade única"; **sem seletor de quantidade**; aviso "você recebe o item das fotos"; **fotos reais da unidade**; seção **Laudo da unidade** (condição, o que foi testado, marcas conhecidas, itens incluídos); garantia própria da loja. Disponibilidade atualizada em tempo real e reserva atômica. |
| **Raridade** | Como o seminovo, mais ano, edição, região e estado de conservação (com caixa, manual, lacre); selo próprio; destaque de procedência. |
| **Pré-venda** | Selo "Pré-venda"; data prevista; botão "Reservar"; política de cancelamento e de cobrança visíveis. |
| **Esgotado** | Botão vira "Avise-me quando chegar" (consentimento por canal); sugere alternativas; mantém a URL e o conteúdo para SEO. |
| **Kit / configurador** (evolução) | Base + opções compatíveis, preço somando, estoque por componente, retrato imutável no pedido (seção 7.3 do documento). |

A condição **nunca depende só de cor**: sempre há texto e símbolo (● novo, ◆ seminovo).

Templates de especificação por categoria (**Validar** com o cliente, seção 17 do documento):

- **Consoles:** armazenamento, resolução e taxa de quadros, conexões, edição (digital ou com leitor), compatibilidade, o que vem na caixa.
- **PC Gamer:** processador, placa de vídeo, memória, armazenamento, placa-mãe, fonte, gabinete, sistema operacional, conexões.
- **Notebooks:** processador, placa de vídeo, memória, armazenamento, tela (tamanho, resolução, taxa de atualização), bateria, peso, portas.
- **Retro:** plataforma original, região, ano, estado de conservação, acompanha caixa ou manual, autenticidade.

---

## 7. Filtros e listagem de produtos

A listagem (`/loja`, `/categoria/[slug]`) é a porta de entrada da página de produto e hoje não existe. Princípios do documento: filtros **relevantes e visíveis no celular**, em drawer, com **contagem**, **limpar filtros** e **resumo das seleções**.

### 7.1 Comportamento

- **Desktop:** coluna de filtros à esquerda, ordenação e total no topo, grade de 3 a 4 cards.
- **Celular:** botão "Filtrar" fixo abre um drawer em tela cheia; chips das seleções ativas acima da grade; "Ver N produtos" no rodapé do drawer.
- **Estado na URL** (`?condicao=seminovo&preco=0-500&ordem=menor-preco`): link compartilhável, botão voltar funcional, SEO controlado (canonical para a página sem filtro, `noindex` em combinações profundas).
- **Contagens** ao lado de cada opção, atualizadas conforme as outras seleções; opções com 0 resultado ficam desabilitadas, não somem.
- **Ordenação:** relevância, menor preço, maior preço, mais vendidos, novidades, maior desconto.
- **Estados:** carregando (esqueleto), sem resultados (sugere remover filtros e mostra populares), erro (tentar de novo), paginação ou "carregar mais" com URL.
- **Card de produto** com condição em texto, preço, parcelas, estoque baixo e promoção, sem depender só de cor.

### 7.2 Filtros por categoria (proposta, **validar**)

| Filtro | Consoles | PC Gamer | Retro | Notebooks |
| --- | :-: | :-: | :-: | :-: |
| Condição (novo, seminovo, raridade) | ✓ | ✓ | ✓ | ✓ |
| Preço (faixa) | ✓ | ✓ | ✓ | ✓ |
| Disponibilidade (em estoque, pré-venda) | ✓ | ✓ | ✓ | ✓ |
| Em promoção | ✓ | ✓ | ✓ | ✓ |
| Marca | ✓ | ✓ | | ✓ |
| Plataforma (PlayStation, Nintendo, etc.) | ✓ | | ✓ | |
| Tipo (console, controle, jogo, acessório) | ✓ | ✓ | ✓ | |
| Armazenamento | ✓ | ✓ | | ✓ |
| Edição (digital ou com leitor) | ✓ | | | |
| Processador | | ✓ | | ✓ |
| Placa de vídeo | | ✓ | | ✓ |
| Memória RAM | | ✓ | | ✓ |
| Tela (tamanho e taxa de atualização) | | | | ✓ |
| Região e ano | | | ✓ | |
| Estado de conservação (com caixa, manual) | | | ✓ | |
| Retirada na loja hoje | ✓ | ✓ | ✓ | ✓ |

**Decisão pendente:** o rodapé trazia "PlayStation, Nintendo, Xbox, Variados, Pré-Vendas" como departamentos, e o documento define 4 categorias principais. Proposta: manter as 4 categorias como navegação principal e tratar **plataforma** como **filtro** e como **coleção** (transversal), nunca como categoria extra.

---

## 8. Modelo de dados proposto

Alinhado às entidades da seção 10 do documento e às telas do painel. Em TypeScript, como contrato entre o catálogo e a página.

```ts
type Condition = "novo" | "seminovo" | "raridade" | "pre-venda";

type Product = {
  id: string;
  slug: string;                       // URL estável, preservar do site antigo quando possível
  sku: string;
  name: string;
  brand: string;
  category: "consoles" | "pc-gamer" | "retro" | "notebooks";
  platform?: string;                  // atributo/coleção, não categoria
  condition: Condition;
  tagline: string;
  media: { src: string; alt: string; kind: "image" | "video"; order: number }[];
  options: { id: string; name: string; values: { label: string; sku: string; available: boolean }[] }[];
  specs: { group: string; rows: [label: string, value: string][] }[];
  inBox: string[];
  highlights: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  warranty: { months: number; text: string };
  seo: { title: string; description: string; canonical?: string };
};

type Offer = {                        // preço e promoção, com vigência
  productId: string;
  price: number;
  compareAt?: number;
  validFrom?: string;
  validTo?: string;
  maxInstallments: number;            // política de parcelamento: validar com o cliente
};

type InventoryUnit = {                // obrigatório para seminovo e raridade
  id: string;
  productId: string;
  serial?: string;
  status: "disponivel" | "reservado" | "vendido";
  grade: string;                      // padronizado: ex. "Excelente", "Muito bom", "Bom"
  report: { tested: string[]; included: string[]; knownMarks: string[] };
  photos: string[];                   // fotos reais DESTA unidade
  warrantyDays: number;
};

type CartLine = {
  lineId: string;                     // produto + variação (+ unidade, se única)
  productId: string;
  unitId?: string;
  options: Record<string, string>;
  qty: number;
  snapshot: { name: string; price: number; condition: Condition };  // o pedido guarda o retrato
};
```

Regras: item **único** nunca tem quantidade maior que 1; o preço e a condição do carrinho vêm do **servidor** na hora da compra (nunca só do navegador); o pedido guarda o **snapshot** do que foi anunciado.

---

## 9. Arquitetura técnica

| Tema | Proposta |
| --- | --- |
| Rotas | `/produto/[slug]` (preservar o padrão de URL do site atual quando o mapeamento for confirmado); `/categoria/[slug]` e `/loja` para listagem. Pelos padrões de URL do site atual (`categoria-produto`, `minha-conta`), ele parece rodar em WordPress com WooCommerce: **validar** na auditoria. |
| Renderização | Página de produto **estática com revalidação** (ISR) e invalidação por evento do catálogo (preço, estoque, publicação). Só o quadro de compra e o estoque são dinâmicos no navegador. |
| Camada de dados | Uma **interface de repositório** (`getProduct`, `listProducts`, `getUnit`) com implementação de demonstração hoje e adaptador da plataforma de comércio escolhida depois. A página não conhece o fornecedor. |
| Estoque de unidade única | Fonte oficial de disponibilidade e **reserva atômica** no checkout; falha de sincronização gera alerta operacional (documento, seções 7.2 e 10). |
| Frete | Cotação por CEP, peso e dimensões via integração; retirada na loja como opção. O modelo mostra uma **simulação** claramente identificada. |
| Imagens | Hospedagem própria em CDN, AVIF e WebP, `sizes` corretos, prioridade só na primeira foto, proporção fixa para evitar salto de layout. Orçamento: primeira foto abaixo de 150 kB. |
| Vídeo | Opcional e sob demanda (clique para carregar); sem autoplay. Decisão sobre uso de vídeos continua aberta no documento. |
| SEO | `Product` em JSON-LD (já no modelo) com `Offer`, disponibilidade e condição; título e descrição editáveis; canonical; breadcrumb estruturado; sitemap; redirects 301 do site antigo. Hoje a página do modelo está com `noindex` porque os dados são de demonstração. |
| Analytics | Eventos `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `shipping_calculated`, `whatsapp_click`, `filter_applied`; **sem dados pessoais** e respeitando o consentimento. |
| Observabilidade | Erros de frete, de estoque e de carrinho com alerta; Core Web Vitals por rota e dispositivo. |
| Segurança | Preço e estoque validados no servidor; limites de quantidade; sem segredos no cliente. |

---

## 10. UX detalhado

### 10.1 Microcopy

- Botão: "Adicionar ao carrinho" → "Adicionado ao carrinho ✓" (2 s, `aria-live`).
- Esgotado: "Avise-me quando chegar". Seminovo: "Unidade única: você recebe o item das fotos."
- CEP inválido: "Digite um CEP com 8 números." (junto ao campo, sem apagar o que foi digitado).
- Frete simulado: "Simulação para demonstração. O valor real virá da integração de frete." (remover em produção).
- Usado do cliente: "Avaliamos e respondemos com a próxima etapa, sem promessa de valor." (o documento proíbe tratar estimativa como oferta final).

### 10.2 Acessibilidade (WCAG 2.1 AA)

- Contraste mínimo 4,5:1 em texto; o rodapé foi corrigido para branco sólido.
- Seletores de variação como `radiogroup`, estado esgotado com texto "Esgotado" e não só cor.
- Galeria operável por teclado (setas) e com texto alternativo por foto; botões só com ícone com `aria-label`.
- Foco visível em todos os controles; barra de seções com `aria-current`.
- Barra fixa do celular não cobre campos nem controles do sistema e fica fora do foco quando oculta.
- Respeitar `prefers-reduced-motion` (corrigir os 3 ícones pendentes).

### 10.3 Desempenho

- Fontes já otimizadas via `next/font`; manter só os pesos usados.
- Sem bibliotecas de galeria ou de carrossel pesadas: galeria própria, sem dependências extras.
- Cartões e seções abaixo da dobra com carregamento tardio.
- O shader do rodapé carrega só no navegador e depois do conteúdo; avaliar desligar em celulares fracos.

---

## 11. Roadmap com critérios de aceite

Estimativas indicativas, sujeitas a dados, acessos e aprovações.

| Fase | Entrega | Critério de aceite |
| --- | --- | --- |
| **0. Modelo (feito)** | Página `/produto/[slug]` com galeria, opções, CEP simulado, carrinho, laudo de seminovo, seções, FAQ, relacionados e barra fixa no celular | Funciona nos dois temas e em 375px, sem rolagem horizontal; carrinho recebe a quantidade escolhida |
| **A. Base técnica** (1 a 2 sem.) | Tipos da seção 8; repositório com adaptador de demonstração; `lineId` no carrinho; esqueletos e estados de erro; imagens em CDN própria; correções da seção 2.4 | Linha do carrinho distingue variações; nenhuma página sem estado vazio ou de erro; contraste e movimento reduzido corrigidos |
| **B. Listagem e filtros** (2 a 3 sem.) | `/loja` e `/categoria/[slug]` com filtros por categoria, drawer no celular, estado na URL, contagens, ordenação, paginação | Filtros combinados dão resultados corretos; link compartilhável reproduz a seleção; sem resultados orienta o próximo passo |
| **C. Integrações** (depende do cliente) | Frete real por CEP; estoque e reserva de unidade única; parcelamento do gateway; "Avise-me" com consentimento | Duas compras simultâneas da última unidade: só uma conclui; cotação de frete falha com mensagem útil |
| **D. SEO e migração** (2 a 3 sem.) | URLs e redirects 301; JSON-LD validado; sitemap; analytics; remover `noindex` | Amostra de URLs antigas redireciona ao produto equivalente; eventos medidos sem dados pessoais |
| **E. Evolução** | Configurador de kits, comparador, vídeo, avaliações de clientes (só com fonte confiável), troca de usado como parte do pagamento | Cada item só entra com regra, dono do dado, tratamento de erro e critério de aceite (regra de escopo do documento) |

### Plano de testes (resumo)

| Área | Cenários |
| --- | --- |
| Compra | Variação esgotada, quantidade acima do estoque, última unidade, produto removido do carrinho após esgotar |
| Seminovo | Fotos e laudo da unidade; unidade vendida enquanto a página está aberta; garantia exibida corretamente |
| Frete | CEP inválido, CEP sem cobertura, serviço fora do ar, retirada na loja |
| Filtros | Combinações, contagens, estado na URL, botão voltar, nenhum resultado |
| Acessibilidade | Teclado, leitor de tela, contraste, foco, movimento reduzido, zoom a 200% |
| Desempenho | LCP, INP e CLS em celular de gama média; peso da primeira foto |
| Navegadores | Chrome, Safari iOS, Chrome Android, Firefox, Edge |

---

## 12. Riscos e decisões pendentes

| Risco | Mitigação |
| --- | --- |
| Fotos genéricas ou erradas reduzem a confiança, principalmente em seminovo | Sessão de fotos padronizada; sem foto real da unidade, o item não publica |
| Plataforma de comércio ainda não escolhida | Camada de dados por interface; página independente do fornecedor |
| Venda duplicada de unidade única | Reserva atômica, fonte oficial de estoque e alerta operacional |
| Promessas de garantia, troca e parcelamento sem política aprovada | Textos do modelo são de demonstração; aprovar com o cliente e com assessoria jurídica antes do lançamento |
| Peso das mídias e dos efeitos | Orçamento de imagens, vídeo sob demanda, medir Core Web Vitals por rota |

**Perguntas para o cliente:**

1. Qual é a **política de garantia** (novo e seminovo) e a de **troca e devolução**?
2. Qual é o **parcelamento** (máximo de parcelas, juros) e há desconto à vista ou no Pix?
3. Como padronizar a **condição** do seminovo (escala de graus, critérios, o que conta como marca de uso)?
4. As categorias principais continuam **Consoles, PC Gamer, Retro e Notebooks**, com plataforma como filtro?
5. Quais **filtros** o cliente usa hoje e sente falta? (seção 7.2 é uma proposta)
6. Haverá **vídeo** nos produtos? Quem produz as **fotos**?
7. **Avaliações** de clientes: existe fonte confiável? Sem ela, não exibir.
8. A **retirada na loja** (Santa Maria, Brasília) deve ser oferecida com prazo no mesmo dia?
9. Quando o cliente enviar o **script de referência** do editor visual, quais seções da página de produto ele quer editar sozinho?

---

## 13. O modelo de página entregue

- **Endereço:** `/produto/<slug>`. Exemplos: `/produto/playstation-5-slim-1tb` (novo), `/produto/nintendo-switch-oled` (novo, com cores) e `/produto/dualsense-branco` (**seminovo de unidade única**, com laudo).
- **Código:** [`app/produto/[slug]/page.tsx`](../storefront/src/app/produto/[slug]/page.tsx), componentes em [`components/product/`](../storefront/src/components/product/) e dados de demonstração em [`data/product-details.ts`](../storefront/src/data/product-details.ts).
- **O que funciona:** galeria com zoom e teclado, seletor de opções com estado esgotado, quantidade, adicionar ao carrinho (respeita a quantidade), CEP com máscara e validação, barra fixa no celular, navegação por seções com destaque, laudo do seminovo, FAQ, relacionados e JSON-LD.
- **O que é demonstração:** fotos (reaproveitadas, em recortes diferentes), especificações, garantia, parcelas, prazos e valores de frete, FAQ. A página está com `noindex` até o catálogo real alimentar os dados.
- **O que ainda não existe:** `/loja`, `/carrinho` e checkout, "Avise-me", avaliações, vídeo, comparador e kits.
