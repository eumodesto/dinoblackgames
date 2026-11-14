**DINOBLACK  /  GAMES**

# Documento de desenvolvimento do e-commerce

Arquitetura de produto, jornadas e experiência UX/UI

> OBJETIVO  Transformar o escopo comercial em uma base de trabalho para descoberta, design, implementação, migração e lançamento, respeitando a operação de produtos novos, seminovos e raridades.

Versão 1.2  \|  30 de outubro de 2026

Baseado na proposta preliminar de e-commerce DinoBlack, no material visual da marca disponível, na conversa de WhatsApp de 30 de outubro de 2026 e nas definições posteriores de Modesto sobre início do projeto e categorias.

Status: especificação atualizada para desenvolvimento iniciado do zero, com categorias principais definidas, direção visual acordada e paleta aprovada. O design system inicial está documentado em Design_System_DinoBlack.md; seus demais fundamentos ainda são propostas. Plataforma, integrações, controles específicos de edição, conteúdo e condições comerciais ainda aguardam validação.

## 1. Resumo executivo

A DinoBlack precisa de uma loja digital que converta bem no celular, apresente produtos gamer com clareza e dê suporte à realidade de catálogo misto: produtos novos, seminovos unitários e itens raros. O site deve combinar descoberta rápida, confiança na condição do produto, composição de kits, checkout direto e automações de relacionamento com controles comerciais e de consentimento.

O projeto será iniciado do zero: frontend, backend, painel administrativo e integrações devem ser planejados, implementados ou configurados e homologados a partir desta especificação. Não há backend previamente desenvolvido a considerar como entrega ou avanço. A arquitetura poderá utilizar serviços ou uma plataforma de comércio consolidada, mediante validação de aderência, sem pressupor reaproveitamento da implementação anterior. A escolha deve considerar especialmente a autonomia do cliente para editar a aparência da loja.

> DECISÃO CENTRAL  Iniciar o desenvolvimento do zero, com descoberta técnica e operacional antes da implementação. Definir a arquitetura da nova loja, o editor visual e as integrações; avaliar dados e URLs da operação atual apenas para eventual migração e continuidade do negócio.

> **Atualização de 14/11/2026 — plataforma:** o desenvolvimento seguiu a opção headless própria (Next.js na Vercel, Postgres/Supabase e Mercado Pago). A escolha ainda precisa de validação com o cliente quanto a custo de operação e autonomia de edição visual, que continua sendo prioridade e ainda não foi implementada. Estado, backlog e decisões pendentes: [Desenvolvimento_Tecnico_DinoBlack.md](./Desenvolvimento_Tecnico_DinoBlack.md).

### Como usar este documento

Use os requisitos marcados como “base da proposta” para orientar o escopo; use as recomendações como hipóteses técnicas a validar; transforme os pontos em aberto em decisões registradas no workshop. As estimativas comerciais e de prazo da proposta permanecem preliminares.

## 2. Fonte, escopo e decisões pendentes

| Tipo | Conteúdo |
| --- | --- |
| Base da proposta | E-commerce mobile first; produtos novos e seminovos; raridades; kits configuráveis; compra de usados; pagamentos, frete, ERP/fiscal; automações; painel administrativo; SEO; migração e métricas. |
| Recomendação técnica | Auditar a loja atual, ERP, catálogo, APIs, hospedagem, SEO, analytics e custos antes de escolher plataforma. Reutilizar serviços consolidados quando viáveis. |
| Pendente de validação | Plataforma atual e dados disponíveis; ERP; gateway; transportadoras; emissão fiscal; política de troca/garantia; regras de kits; canais de comunicação; volume de itens e variantes; prazo e orçamento contratual. |
| Conflito comercial a resolver | A proposta detalhada arquivada marca investimento “a definir”. O material visual disponível exibe “R$ 2.000”. Confirmar qual condição está vigente antes de transformar preço ou parcelamento em compromisso. |

Limite do material analisado: o PDF “dinoblack.pdf” fornecido nesta conversa contém uma peça visual vertical da proposta. A proposta detalhada foi recuperada de uma cópia arquivada com conteúdo correspondente. O arquivo anexado originalmente com o nome “Proposta_Ecommerce_DinoBlack_Games.pdf” não ficou disponível; portanto, este documento não presume que sua versão seja idêntica em todos os detalhes.

### 2.1 Definições atualizadas — 30 de outubro de 2026

| Tema | Definição | Origem e situação |
| --- | --- | --- |
| Ponto de partida | Desenvolvimento iniciado do zero, abrangendo a nova loja, backend, administração e integrações necessárias. | Orientação expressa de Modesto. |
| Categorias principais | Consoles; PC Gamer; Retro; Notebooks. | Categorias informadas por Modesto; nomes e ordem adotados nesta versão. |
| Visual geral | Referência no estilo do site da PlayStation, adaptada à identidade DinoBlack. | Pedido do cliente aceito por Modesto na conversa. |
| Página de produto | Referência na página de produto da Nintendo. | Pedido do cliente aceito por Modesto; detalhes de layout ainda serão definidos. |
| Administração visual | Edição fácil da aparência das páginas, usando a experiência de edição da Shopify como referência de usabilidade. | Prioridade explícita do cliente, que já utilizou Shopify por muitos anos. Não define a plataforma tecnológica. |
| Banners | Considerar as peças atuais do cliente, que seguem o padrão visual da PlayStation. | Informação do cliente; receber arquivos e validar formatos. |
| Referência rejeitada | Xbox não deve orientar a direção visual. | Preferência expressa do cliente. |
| Desempenho | A nova loja deve carregar com agilidade; o cliente relata lentidão ocasional no site da PlayStation. | Preocupação confirmada; não constitui medição técnica do site de referência. |
| Script de referência | Receber o script oferecido pelo cliente para compreender os controles administrativos que ele deseja. | Oferta registrada; envio e análise pendentes no material apresentado. |

A quantidade e o uso de vídeos permanecem em aberto. Reduzir ou evitar vídeos foi uma sugestão técnica durante a conversa, sem decisão final. As referências visuais indicam preferências do cliente; esta atualização não inclui inspeção técnica desses sites.

## 3. Visão do produto e objetivos

A loja deve funcionar como canal de venda, relacionamento e fidelização preparado para crescer sem aumentar a complexidade operacional na mesma proporção. A experiência deve reforçar a especialidade da DinoBlack em games, orientar a escolha e deixar explícito o que o cliente está comprando.

| Objetivo | Efeito esperado | Indicadores |
| --- | --- | --- |
| Reduzir atrito na compra | Busca, filtros, produto e checkout claros em telas pequenas. | Conversão; abandono por etapa; velocidade mobile. |
| Elevar o valor por pedido | Kits e complementos compatíveis com disponibilidade e margem. | Ticket médio; adesão a kit; itens por pedido. |
| Recuperar intenção de compra | Lembretes e mensagens transacionais nos momentos certos. | Carrinhos recuperados atribuídos; opt-outs; reclamações. |
| Dar autonomia na edição visual | Cliente consegue ajustar a apresentação da loja com facilidade, usando uma experiência familiar. | Conclusão das tarefas de edição; necessidade de suporte; tempo para atualizar uma campanha. |
| Controlar a operação | Painel coerente para catálogo, pedidos, estoque e promoções. | Erros de estoque; tempo de processamento; divergências. |
| Aumentar confiança | Condição, garantia, conteúdo da caixa e entrega visíveis. | Conversão por condição; contatos pré-venda; devoluções. |

## 4. Públicos e necessidades

| Perfil | Necessidade principal | Implicação de UX |
| --- | --- | --- |
| Comprador de console ou jogo | Comparar modelos, preço, disponibilidade, parcelamento e entrega. | Filtros simples, comparação legível e custo total transparente. |
| Comprador de seminovo/raridade | Entender o estado real e os itens incluídos antes de pagar. | Fotos reais por unidade, descrição objetiva da condição e garantia. |
| Montador de setup/kit | Escolher acessórios compatíveis sem pesquisar cada conexão. | Configurador guiado com compatibilidade, estoque e preço em tempo real. |
| Pessoa vendendo usado | Enviar informações e fotos e saber o próximo passo. | Formulário curto, status da avaliação e expectativa sem promessa de preço. |
| Equipe de operação | Atualizar catálogo, pedidos, promoções e conteúdo com baixo risco. | Admin com validações, permissões, histórico e alertas. |
| Cliente responsável pelo visual | Ajustar a aparência das páginas com facilidade e autonomia. | Editor com usabilidade inspirada na experiência conhecida da Shopify; controles específicos a validar com o cliente. |

## 5. Escopo funcional por fase

### Fase 0 — descoberta e auditoria

- Mapear o site atual, indexação, URLs, conteúdo, analytics e tecnologias.
- Inventariar catálogo, variantes, itens serializados, regras de estoque e fluxo de compra.
- Mapear ERP, pagamentos, frete, fiscal, atendimento e marketing, incluindo API, custos e responsáveis.
- Definir metas de negócio, requisitos de conteúdo, política de seminovos e critérios de aceite.
- Receber o script de referência e detalhar as tarefas de edição visual que o cliente precisa executar.
- Organizar o catálogo nas quatro categorias principais: Consoles, PC Gamer, Retro e Notebooks.
- Planejar frontend, backend, administração e integrações desde o início, sem contabilizar componentes como já entregues.
- Validar arquitetura e plataforma com uma prova técnica das integrações críticas.
### MVP — venda confiável

- Home, categorias, busca, filtros, páginas de produto, carrinho, checkout e páginas institucionais.
- Cadastro de produtos novos e usados; estoque unitário quando uma unidade tiver condição própria.
- Integração de pagamento e cálculo de entrega escolhidos na descoberta; confirmação de pedido.
- Administração de catálogo, pedido, promoção e conteúdo, incluindo edição visual fácil para o cliente; validar a solução escolhida contra esse requisito antes da implementação.
- SEO técnico, analytics de eventos essenciais, acessibilidade, segurança e migração de URLs.
- Fluxos transacionais essenciais e consentimento para comunicações de marketing.
### Evolução posterior

- Configurador avançado de kits e regras de compatibilidade se não couber no MVP.
- Venda seu usado com acompanhamento completo, avaliação, negociação e eventual crédito.
- Lista de desejos e alertas de reposição/queda de preço.
- Segmentação de campanhas, fidelidade, indicação e recomendações personalizadas.
- Relatórios avançados, sincronização adicional com ERP e automações ampliadas.
> REGRA DE ESCOPO  Uma funcionalidade só entra no MVP quando houver regra de negócio, responsável pelo dado, tratamento de erro e critério de aceite definidos.

## 6. Arquitetura da informação

| Nível | Estrutura definida e itens propostos |
| --- | --- |
| Categorias principais | Consoles; PC Gamer; Retro; Notebooks. |
| Acessos complementares | Ofertas e Venda seu usado, conforme escopo validado; não são categorias principais. |
| Home | Campanha principal; atalhos para Consoles, PC Gamer, Retro e Notebooks; lançamentos; ofertas; seminovos em destaque; kits; confiança e atendimento. |
| Categoria e busca | Filtros por plataforma, tipo, condição, preço, armazenamento, disponibilidade e entrega. Ordenação por relevância, preço e novidade. |
| Produto | Título/modelo; condição; preço/parcelas; disponibilidade; entrega; garantia; conteúdo da caixa; mídia; especificações; compatibilidade; avaliações quando houver fonte confiável. |
| Pós-compra | Acompanhamento do pedido; política de entrega, troca e garantia; suporte; contato; privacidade. |
| Venda de usado | Como funciona; formulário; envio de fotos; consentimento; protocolo; etapas e status da avaliação. |

As quatro categorias principais estão definidas: Consoles, PC Gamer, Retro e Notebooks. Validar subcategorias, filtros e enquadramento de produtos com o cliente, sem introduzir novas categorias principais por suposição. Novo e seminovo devem ser tratados como condição do item; raridade pode ser um atributo ou coleção transversal. A regra de enquadramento em Retro deve ser detalhada. Jogos e acessórios, quando presentes no catálogo, precisam ter sua organização confirmada dentro dessa estrutura.

## 7. Jornadas principais

### 7.1 Descobrir e comprar um produto novo

1. Entrar por campanha, categoria, busca ou plataforma.
1. Refinar resultados com filtros relevantes e visíveis no celular.
1. Na página do produto, confirmar modelo, condição, garantia, conteúdo, parcelamento e entrega por CEP.
1. Adicionar ao carrinho; revisar itens, complementos opcionais e custo total.
1. Identificar-se e concluir pagamento com o menor número de etapas compatível com segurança.
1. Receber confirmação e eventos de pagamento, envio e entrega.
### 7.2 Comprar um seminovo unitário

A vitrine e a página do item devem deixar claro que se trata de unidade específica. Exibir fotos reais dessa unidade, descrição padronizada de condição, acessórios incluídos, defeitos ou marcas conhecidos, garantia aplicável e quantidade disponível. O item deve sair de circulação de forma atômica após a reserva/pagamento conforme a plataforma permita; falhas de sincronização precisam gerar alerta operacional.

### 7.3 Montar um kit gamer

O usuário escolhe uma base, recebe apenas opções compatíveis, vê acréscimos de preço e estoque atualizados e pode remover ou trocar componentes permitidos. Antes do carrinho, o sistema confirma a configuração completa. O pedido deve guardar um retrato imutável dos componentes, preços e regras vigentes na compra.

### 7.4 Enviar um usado para avaliação

Coletar dados mínimos do produto, estado, acessórios, fotos, contato e aceite dos termos de avaliação. Gerar protocolo, explicar o prazo esperado e permitir acompanhamento simples. A loja deve poder aceitar, pedir mais informações, propor valor ou recusar, sem tratar estimativa como oferta final automática.

## 8. Requisitos UX/UI

### Direção visual

A paleta de cores foi aprovada por Modesto e está registrada com códigos, origem e usos em **Design_System_DinoBlack.md**, versão 0.1. Utilizar essa paleta na evolução da interface. A tipografia e os demais fundamentos desse documento são propostas para validação; a aprovação das cores não os aprova automaticamente.

A direção acordada combina o estilo geral do site da PlayStation com a referência da Nintendo para páginas de produto. Aplicar essas referências à identidade própria da DinoBlack, com protótipos desktop e mobile para validação dos detalhes. O site do Xbox foi rejeitado como referência pelo cliente.

Os banners atuais do cliente seguem o padrão da PlayStation e devem orientar a compatibilidade visual das campanhas. Receber as peças antes de fixar proporções, recortes e áreas de texto.

Manter o reconhecimento da DinoBlack: logotipo oficial, vermelho e preto, grafite, alto contraste e a linguagem gamer com o dinossauro. Usar efeitos de brilho, textura, animação e elementos agressivos como acentos; priorizar leitura, confiança e velocidade nas áreas de compra. A identidade não deve reduzir contraste nem competir com preço, condição, entrega ou ação principal.

| Princípio | Aplicação |
| --- | --- |
| Mobile first real | Projetar primeiro para uma coluna e uso com polegar; testar em telas compactas, não apenas reduzir a versão desktop. |
| Hierarquia de compra | Nome, condição, preço à vista/parcelado, estoque, entrega e CTA aparecem sem caça visual. |
| Transparência | Frete, prazo, garantia, estado e conteúdo da embalagem apresentados antes do pagamento. |
| Orientação | Estados vazios e mensagens de erro explicam como seguir; nunca deixar carregamento ou falha sem resposta. |
| Acessibilidade | Contraste, foco visível, navegação por teclado, rótulos, texto alternativo e alvos de toque confortáveis. |
| Performance visual | Imagens responsivas, compressão, carregamento progressivo e movimento reduzido quando solicitado pelo sistema. |

### Autonomia para edição visual

A facilidade de ajustar a aparência das páginas é uma prioridade expressa do cliente. A experiência administrativa deve usar a familiaridade dele com a edição da Shopify como referência; isso não determina que a loja será construída nessa plataforma.

- Confirmado: o cliente precisa conseguir fazer ajustes visuais com facilidade.
- A detalhar: quais páginas e elementos serão editáveis, quais usuários poderão alterar e quais ações precisam de suporte.
- Proposta para validação: troca de banners, textos, links e imagens; organização de seções; pré-visualização antes de publicar; comportamento em desktop e celular. Esses controles ainda não foram confirmados individualmente pelo cliente.
- Receber e analisar o script oferecido para identificar os recursos administrativos que ele deseja manter como experiência de uso. O script é uma referência a avaliar; não constitui base técnica já escolhida.
- Homologar o editor com tarefas reais executadas pelo cliente, conforme controles e critérios acordados.

### Desempenho e mídia

O cliente aprecia o visual da PlayStation, mas relatou carregamento lento em algumas ocasiões. Usar a referência visual com uma implementação leve, imagens otimizadas e carregamento adequado das mídias. Vídeos e animações devem ser avaliados pelo impacto no uso em celular. Não há decisão sobre incluir, excluir ou limitar a quantidade de vídeos. Definir o orçamento de mídia e as metas de desempenho durante a descoberta e validar nas páginas implementadas.

### Componentes e estados necessários

- Cabeçalho responsivo com busca evidente, conta e carrinho; navegação mobile acessível.
- Cards de produto que distinguem novo, seminovo, raridade, esgotado e promoção sem depender só da cor.
- Filtros em drawer mobile com contagem, limpar filtros e resumo das seleções.
- Seletor de variações e configurador com estado de incompatibilidade, falta de estoque e atualização de preço.
- CTA persistente em produto no mobile sem cobrir informações nem controles do sistema.
- Formulários com validação junto ao campo, mensagens claras e recuperação sem apagar dados.
- Checkout com indicador de etapas e resumo do pedido persistente; estados de pagamento pendente, aprovado, recusado ou expirado.
## 9. Arquitetura técnica recomendada

Premissa: iniciar a implementação do zero, sem considerar backend, frontend ou painel como previamente concluídos. Avaliar uma plataforma ou serviços de comércio consolidados para catálogo, carrinho, pedidos, promoções e checkout quando cobrirem os requisitos. Uma solução customizada ou headless depende da validação de identidade, desempenho, integrações, custo de operação e facilidade de edição visual. A referência de usabilidade da Shopify não equivale à seleção dessa plataforma.

| Camada | Responsabilidade | Diretriz |
| --- | --- | --- |
| Storefront | Home, busca, categoria, produto, carrinho e conteúdo. | Tema da plataforma se suficiente; Next.js/headless após validação de SEO, API, custo e equipe. |
| Commerce core/backend | Catálogo, preço, carrinho, pedido, promoções e checkout. | Planejar e implementar ou configurar desde o início, validando a solução de comércio escolhida e sem pressupor backend pronto. |
| Administração e editor visual | Gestão operacional e ajustes na aparência das páginas. | Usabilidade familiar ao cliente, inspirada na edição da Shopify; controles definidos na descoberta e homologados com tarefas reais. |
| Integração | Conectar ERP, pagamento, frete, fiscal e CRM. | APIs/webhooks documentados, idempotência, retries e fila/registro de falhas conforme necessidade. |
| Dados e mídia | Produtos, imagens, conteúdo, redirects e analytics. | Fonte canônica definida; importação validada; controle de acesso e retenção. |
| Observabilidade | Erros de checkout, integração, performance e disponibilidade. | Alertas acionáveis e trilha de eventos sem expor dados pessoais ou segredos. |

### Critérios de escolha de plataforma

- Facilidade de edição visual pelo próprio cliente e capacidade de validar as tarefas administrativas antes da adoção.
- Aderência à estrutura de categorias: Consoles, PC Gamer, Retro e Notebooks.
- Compatibilidade com o ERP/estoque e frequência de sincronização.
- Gestão de item usado único, condição por unidade e reserva de estoque.
- Facilidade e confiabilidade do checkout e meios de pagamento locais.
- SEO, URLs, conteúdo editorial, redirecionamentos e propriedade dos dados.
- Custo total: licenças, gateway, apps, desenvolvimento, manutenção e operação.
- Capacidade de configurar kits com preço, disponibilidade e composição gravada no pedido.
- Exportabilidade dos dados, suporte, segurança e limites de API.
## 10. Modelo de domínio e regras de dados

| Entidade | Campos/regras relevantes |
| --- | --- |
| Produto | SKU; nome; categoria principal (Consoles, PC Gamer, Retro ou Notebooks), subcategoria a validar e plataforma; descrição; imagens; especificações; tipo (novo/usado/raridade); atributos e status. |
| Unidade de estoque | Produto/SKU; identificador interno ou serial quando aplicável; condição e notas próprias; localização; estado (disponível/reservado/vendido). |
| Oferta | Preço; preço promocional; vigência; elegibilidade; estoque; regras comerciais. |
| Configuração de kit | Produto base; componentes permitidos; compatibilidade; preço adicional; limites; snapshot dos itens no pedido. |
| Pedido e item | Identificação; itens e quantidades; endereço; subtotal, desconto, frete e total; snapshots de nome, condição, componentes e preço. |
| Cliente e consentimento | Contato mínimo; preferências por canal; finalidade, data e origem do consentimento; solicitações de privacidade. |
| Avaliação de usado | Protocolo; produto; estado declarado; anexos; status; proposta; histórico de alterações; acesso restrito. |

> INTEGRIDADE DE ESTOQUE  Para item único, definir uma fonte oficial de disponibilidade e comportamento de reserva para impedir venda duplicada em canais diferentes.

## 11. Integrações e fluxos

| Domínio | Fluxo mínimo | Falhas a tratar |
| --- | --- | --- |
| Pagamento | Criar cobrança; redirecionar/autorizar; receber webhook; atualizar pedido. | Webhook duplicado ou atrasado; divergência de status; expiração; conciliação. |
| Frete | Cotação por CEP e peso/dimensões; seleção; etiqueta/rastreamento quando suportado. | CEP inválido; serviço indisponível; mudança de prazo; diferença entre cotação e despacho. |
| ERP/estoque | Sincronizar produto, preço, saldo e pedido segundo fonte canônica acordada. | Conflito de saldo; SKU desconhecido; lote falho; reprocessamento auditável. |
| Fiscal | Enviar dados necessários para emissão e acompanhar resultado. | Rejeição fiscal; pedido retido; correção sem duplicidade. |
| E-mail/WhatsApp | Mensagens transacionais; marketing apenas com base legal e preferência aplicável. | Falha de entrega; opt-out; frequência; duplicidade; registro de consentimento. |
| Analytics/ads | Eventos de visualização, busca, produto, carrinho, checkout e compra. | Consentimento/cookies conforme política; deduplicação; exclusão de dados sensíveis. |

Não fixar fornecedores antes do inventário de contratos, APIs, custos e titularidade das contas. Integrações devem ter ambiente de homologação quando disponível e um procedimento manual de contingência documentado.

## 12. Segurança, privacidade e confiança

- Aplicar menor privilégio para contas administrativas, autenticação forte e revogação de acessos de ex-colaboradores.
- Manter segredos fora do código e de documentos; usar armazenamento de segredos da plataforma/ambiente.
- Coletar apenas dados necessários e definir acesso, retenção, descarte e canal para solicitações de titulares.
- Registrar consentimento e preferências por canal; separar mensagens operacionais de campanhas.
- Proteger uploads do fluxo de usados: validação de tipo/tamanho, acesso restrito, expiração e remoção programada.
- Garantir TLS, atualizações, backups, recuperação e monitoramento de vulnerabilidades dos componentes escolhidos.
- Definir regras claras de preço, disponibilidade, política de troca, garantia e tratamento de produtos seminovos.
Revisar textos e fluxos com responsáveis da DinoBlack e assessoria competente antes da publicação. Este documento orienta requisitos de produto e não substitui validação jurídica.

## 13. SEO, migração e conteúdo

- Inventariar URLs indexadas, páginas relevantes, metadados, produtos, imagens e desempenho orgânico antes da mudança.
- Preservar URLs quando possível; mapear cada URL descontinuada para destino relevante com redirecionamento 301.
- Evitar redirecionamento genérico para a home; manter páginas de produto descontinuado úteis quando houver alternativa.
- Validar canonical, sitemap, robots, dados estruturados compatíveis com o catálogo e renderização indexável.
- Migrar conteúdo e catálogo com amostra piloto; comparar contagens, preços, imagens, condição, estoque e campos obrigatórios.
- Verificar Search Console, analytics, tags de campanha e eventos após publicação.
- Preparar página de política, sobre, contato e conteúdo que explique a compra de usados e o estado dos seminovos.
## 14. Métricas e instrumentação

| Indicador | Definição operacional inicial |
| --- | --- |
| Conversão | Pedidos pagos / sessões elegíveis, segmentado por dispositivo, canal e categoria. |
| Abandono de checkout | Checkouts iniciados sem pedido concluído; observar por etapa e motivo disponível. |
| Ticket médio | Receita líquida de pedidos / pedidos, com convenção contábil acordada. |
| Recuperação atribuída | Pedidos atribuídos a fluxo de recuperação conforme janela definida, separados de conversão orgânica. |
| Adesão a kit | Pedidos com configurador/kit / pedidos elegíveis; acompanhar margem e cancelamento. |
| Saúde de estoque | Divergências, oversell, tempo de sincronização e pedidos cancelados por indisponibilidade. |
| Performance | Core Web Vitals e tempo de resposta nas páginas de entrada e compra, por dispositivo. |

Metas numéricas só devem ser fixadas depois de revisar dados históricos e baseline, como a própria proposta recomenda.

## 15. Fases, entregáveis e critérios de aceite

| Fase indicativa | Entregáveis | Gate de saída |
| --- | --- | --- |
| 1. Descoberta (1–2 sem.) | Auditoria da operação; mapa de sistemas; catálogo nas quatro categorias; regras; jornadas; tarefas de edição visual; riscos; arquitetura da nova loja. | Dono de cada integração, solução de administração validada, plataforma aprovada e backlog priorizado. |
| 2. UX/UI (2–3 sem.) | Arquitetura da informação; wireframes; design system; protótipo desktop/mobile com referência geral PlayStation e produto Nintendo; fluxo do editor. | Jornadas críticas testadas, direção detalhada e estados de interface aprovados. |
| 3. Construção (5–8 sem.) | Frontend, backend e admin/editor construídos ou configurados desde o início; integrações; conteúdo; eventual migração em ambiente de teste. | Cenários críticos funcionam com dados representativos e falhas tratadas. |
| 4. Homologação e lançamento (2–3 sem.) | QA; SEO; analytics; migração final; treinamento; publicação assistida. | Checklist assinado, backup/reversão prontos e monitoramento ativo. |

A proposta estima globalmente 10–16 semanas e observa sobreposição de atividades e dependências. O cronograma é indicativo, não contratual, até confirmar acessos, disponibilidade dos fornecedores, qualidade dos dados e aprovações.

### Critérios mínimos de aceite do MVP

- É possível navegar por Consoles, PC Gamer, Retro e Notebooks, buscar, filtrar e comprar produtos em celular e desktop.
- Home e páginas gerais seguem a direção visual acordada com referência PlayStation; páginas de produto seguem a referência Nintendo, conforme protótipo aprovado e identidade DinoBlack.
- O cliente consegue executar as tarefas de edição visual acordadas, com facilidade validada em homologação.
- O desempenho da nova loja é verificado em celular e desktop segundo metas definidas na descoberta, incluindo o impacto das mídias.
- Produtos novos e seminovos mostram condição, preço, entrega, garantia e conteúdo conforme a regra definida.
- Um pedido pago atualiza status e estoque de forma consistente, inclusive após webhook repetido.
- Falhas de pagamento, frete e ERP aparecem com instrução operacional e podem ser reprocessadas com segurança.
- A migração preserva URLs acordadas e redirects foram validados em amostra e relatório.
- Eventos essenciais são medidos e não enviam dados sensíveis indevidos.
- Administração, acessibilidade, performance, segurança, backups e treinamento foram verificados no checklist acordado.
## 16. Plano de testes

| Área | Cenários representativos |
| --- | --- |
| Compra | Pix pendente/aprovado/expirado; cartão aprovado/recusado; cupom válido/inválido; frete indisponível. |
| Estoque | Última unidade; venda simultânea; erro de sincronização; cancelamento e devolução. |
| Seminovo | Fotos e condição da unidade; indisponibilidade após venda; garantia e conteúdo da caixa. |
| Configurador | Compatibilidade; componente esgotado; troca de opção; recalcular preço; gravar composição no pedido. |
| Operação | Alterar produto/preço; pausar promoção; localizar pedido; corrigir integração sem duplicar ação. |
| Editor visual | Cliente executa tarefas acordadas; verifica resultado em desktop/mobile; publica alterações conforme fluxo aprovado; permissões são respeitadas. |
| Categorias e identidade | Navegar nas quatro categorias definidas; conferir enquadramento; validar páginas com o protótipo aprovado e banners representativos. |
| Qualidade | Teclado e leitor de tela; telas pequenas; navegação; imagens; SEO; redirects; permissões; recuperação de backup. |

## 17. Workshop de descoberta — agenda e perguntas

| Tema | Perguntas que precisam de resposta |
| --- | --- |
| Operação atual | Qual plataforma mantém a loja? Quem atualiza produtos, preços, estoque e pedidos? Quais dores geram retrabalho? |
| Sistemas | Qual ERP e módulo fiscal? Quais gateways, transportadoras, CRM, e-mail e WhatsApp estão contratados? Há API e sandbox? |
| Catálogo | Quantos produtos, variantes e unidades usadas? Como são cadastrados estado, garantia, serial, fotos e compatibilidade? |
| Comercial | Entre Consoles, PC Gamer, Retro e Notebooks, quais campanhas e destaques são prioritários? Como aplicar desconto sem comprometer margem? Qual política de parcelamento e cupom? |
| Edição visual | Quais ajustes o cliente faz na Shopify e quer reproduzir? Quais telas e controles do script servem de referência? Quem edita, revisa e publica? |
| Categorias | Quais subcategorias e filtros existem em Consoles, PC Gamer, Retro e Notebooks? Como organizar jogos, acessórios e itens que possam pertencer a mais de um grupo? |
| Kits | Quais composições são fixas ou configuráveis? Quais incompatibilidades? O cliente pode trocar itens? Como calcular preço e estoque? |
| Venda de usados | A DinoBlack compra, oferece crédito ou ambos? Como avalia, negocia, recebe e recusa um produto? Prazo de resposta? |
| Marca e conteúdo | Quais ativos oficiais, tom de voz, fotos e textos podem ser usados? Quem aprova? Como descrever condição de seminovo? |
| Migração | Quais URLs e dados precisam permanecer? Quais dados pessoais e pedidos podem ser migrados? Quais acessos e responsáveis? |
| Sucesso | Quais metas e baseline existem? Quem é responsável por conversão, atendimento, operação e conteúdo após o lançamento? |
| Comercial | Confirmar preço vigente, parcelas, itens incluídos, custos de terceiros, suporte, manutenção e critérios de mudança de escopo. |

## 18. Riscos e mitigação

| Risco | Mitigação proposta |
| --- | --- |
| Escolha de plataforma antes de entender operação | Fazer auditoria e prova de integração antes da decisão final. |
| Estoque de unidade única diverge entre loja e ERP | Definir fonte canônica, estratégia de reserva e alertas de oversell. |
| Escopo de automações cresce sem governança | Entregar primeiro mensagens transacionais; controlar consentimento, frequência e atribuição. |
| Dados de migração incompletos ou inconsistentes | Limpar e validar catálogo; piloto; relatório de reconciliação; reversão planejada. |
| Editor não atende à autonomia esperada | Validar tarefas reais com o cliente antes de fechar a solução e homologar os controles acordados. |
| Uso excessivo de mídia prejudica carregamento | Validar imagens, vídeos e animações contra as metas de desempenho da nova loja. |
| Headless eleva custo e carga operacional | Exigir justificativa mensurável e capacidade de manter storefront e commerce em conjunto. |
| Métricas sem baseline geram metas arbitrárias | Instrumentar eventos e estabelecer linha de base antes de prometer uplift. |
| Expectativa comercial desalinhada | Resolver a divergência de preço e explicitar entregáveis, dependências e exclusões antes do contrato. |

## 19. Decisões para aprovação

- Confirmar a versão vigente da proposta e o investimento acordado.
- Autorizar auditoria read-only da loja atual, analytics, catálogo e integrações, com acessos apropriados.
- Nomear responsáveis do cliente para produto, operação, conteúdo e sistemas.
- Escolher as prioridades do MVP e confirmar o que pode ficar para uma fase posterior.
- Definir plataforma, provedores, orçamento recorrente e condições de suporte após discovery.
- Detalhar a direção visual já acordada — geral PlayStation e produto Nintendo — em protótipo aprovado.
- Confirmar os controles de edição visual e analisar o script quando recebido.
- Detalhar subcategorias e filtros das quatro categorias principais já definidas.
- Aprovar jornadas, protótipo, critérios de aceite, eventual migração e plano de lançamento antes da implementação final.
> PRÓXIMO PASSO  Realizar o workshop de descoberta e auditoria técnica. O resultado deve ser uma arquitetura fechada, backlog priorizado, protótipo de jornadas críticas, plano de migração e proposta comercial/cronograma revisados.


## 20. Histórico de atualização

| Versão | Data | Alterações |
| --- | --- | --- |
| 1.0 | 30/10/2026 | Especificação inicial de produto, arquitetura, jornadas e UX/UI. |
| 1.1 | 30/10/2026 | Registrado início do desenvolvimento do zero; definidas as categorias Consoles, PC Gamer, Retro e Notebooks; incorporadas referências PlayStation e Nintendo, prioridade de edição visual com familiaridade Shopify, preocupação com desempenho e pendência do script; ajustados arquitetura, escopo, aceite e testes. |
| 1.2 | 30/10/2026 | Registradas aprovação da paleta, adoção da UI/UX Pro Max como apoio e referência ao documento inicial do design system, com demais fundamentos propostos para validação. |


## 21. Design system antes do desenvolvimento

A próxima etapa é desenvolver e validar o design system antes de implementar a loja. A base complementar é **Design_System_DinoBlack.md**, versão 0.1, de 30/10/2026.

- **Paleta aprovada:** vermelho #DA2230, preto #000000, prata #E5E5E5, cinza do controle #D7D9D8, grafite #2A2F35 e detalhe ciano #5FC4E2; cores de apoio e funcionais conforme tabela completa do design system.
- **Método solicitado:** UI/UX Pro Max, de nextlevelbuilder, como apoio à definição e revisão. Recomendações automáticas devem respeitar a identidade e as decisões aprovadas.
- **Propostas iniciais:** tipografia Rubik + Nunito Sans, escala de espaçamento, grid responsivo, formas, iconografia, componentes e estados, com aplicação à loja e ao painel.
- **Validação seguinte:** apresentar uma prancha visual dos fundamentos e componentes; aplicar e ajustar na home, categoria, produto e tarefa de edição de banner. Aprovar antes de usar como referência final de implementação.
- **Permanecem em aberto:** plataforma e stack, layouts detalhados, controles específicos do editor e uso de vídeos. A seleção de uma skill não fecha essas decisões.

Esta etapa produz especificação de design; não representa desenvolvimento ou homologação de funcionalidades.
