# DinoBlack Games — Guia de desenvolvimento por tarefas

**Status:** ativo
**Última atualização:** 18/11/2026
**Aplicação:** Next.js em `storefront/`
**Backend:** Supabase/Postgres
**Produção:** `https://dinoblackgames.vercel.app`

Este é o documento operacional do desenvolvimento. Cada entrega deve partir de uma tarefa deste guia, atualizar o status da tarefa e registrar o resultado no histórico. O código, as migrations, os testes e este documento devem evoluir juntos.

## 1. Como usar este guia

Status permitidos:

- `[ ]` pendente
- `[~]` em andamento
- `[x]` concluído e validado
- `[!]` bloqueado ou aguardando decisão externa

Regras para cada tarefa:

1. Confirmar dependências e critérios de aceite antes de editar o código.
2. Marcar a tarefa como `[~]` no início.
3. Implementar Front, API, banco e permissões como uma unidade.
4. Adicionar ou atualizar migration quando houver alteração persistente.
5. Testar o fluxo real e os estados de erro.
6. Marcar como `[x]` somente com evidência de teste.
7. Registrar arquivos alterados, comando de validação e pendências no histórico.
8. Nunca colocar tokens, senhas, chaves ou `.env` no Git ou neste documento.

## 2. Estado inicial auditado

### Já existente

- `[x]` Catálogo público conectado ao banco.
- `[x]` Cadastro/login de cliente com Supabase Auth.
- `[x]` CRUD básico de produtos.
- `[x]` Checkout com reserva de estoque.
- `[x]` Cupons aplicados no checkout.
- `[x]` Cotação de frete no checkout.
- `[x]` Cotação com SuperFrete e fallback para Melhor Envio.
- `[~]` Resend: página administrativa, templates e disparos básicos implementados localmente.
- `[~]` Sidebar administrativa básica com Dashboard, Produtos, Pedidos e Configurações.

### Lacunas principais

- `[ ]` Detalhe completo do pedido na área administrativa.
- `[ ]` CRUD de cupons.
- `[ ]` CRUD de categorias.
- `[ ]` Gestão de tags e busca avançada.
- `[ ]` Peso e dimensões editáveis em produto/variante.
- `[ ]` Cotação da página de produto usando a variante e suas dimensões.
- `[ ]` Compra de etiqueta, rastreamento e webhooks de logística.
- `[ ]` Integração Correios.
- `[ ]` Integração Mandaê.
- `[ ]` Google Analytics/GTM.
- `[ ]` Google Ads e conversões.
- `[ ]` Pixel da Meta e Conversions API.
- `[ ]` Consentimento LGPD integrado aos eventos de marketing.
- `[ ]` Deploy e aplicação remota das migrations desta frente.

## 3. Arquitetura de referência

```text
Sidebar Admin
├── Dashboard
├── Pedidos
│   └── Detalhe, pagamento, envio, timeline e documentos
├── Catálogo
│   ├── Produtos
│   ├── Categorias
│   ├── Tags
│   └── Cupons
├── Estoque
│   ├── Saldos
│   ├── Unidades seminovas
│   └── Movimentações
├── Integrações
│   ├── E-mail / Resend
│   ├── Analytics / GTM
│   ├── Google Ads
│   ├── Meta Pixel
│   └── Frete / transportadoras
└── Configurações
    ├── Loja
    ├── Embalagens padrão
    ├── Usuários e permissões
    └── LGPD

Front público → APIs de domínio → serviços de aplicação → Supabase/Postgres
                                      ├── pagamentos
                                      ├── frete
                                      ├── e-mail
                                      └── marketing/analytics
```

Princípios:

- O navegador nunca define preço, desconto, estoque, frete final ou status de pagamento.
- A API valida novamente tudo que foi informado pelo Front.
- Tokens ficam em variáveis de ambiente/secret manager; o banco guarda somente configuração não sensível.
- Eventos externos precisam de idempotência, logs e tratamento de retry.
- Toda ação administrativa relevante gera `audit_log`.

## 4. Sidebar administrativa obrigatória

### Tarefa ADM-001 — Estruturar a sidebar

**Status:** `[~]`

Itens finais:

- `[x]` Dashboard
- `[x]` Produtos
- `[ ]` Pedidos com contador de pendentes
- `[ ]` Catálogo expansível
- `[ ]` Categorias
- `[ ]` Tags
- `[ ]` Cupons
- `[ ]` Estoque
- `[x]` Configurações
- `[x]` Integrações > E-mail
- `[ ]` Integrações > Analytics
- `[ ]` Integrações > Google Ads
- `[ ]` Integrações > Meta Pixel
- `[ ]` Integrações > Frete
- `[ ]` Usuários e permissões

Critérios de aceite:

- Sidebar desktop fixa e responsiva.
- Menu mobile acessível por botão.
- Item ativo identificado pela rota atual.
- Submenus expansíveis sem perder a rota.
- Usuário vê apenas módulos autorizados pelo papel.
- Navegação não depende de dados do catálogo.

Arquivos esperados:

- `storefront/src/app/admin/layout.tsx`
- `storefront/src/components/admin/AdminSidebar.tsx`
- `storefront/src/lib/server/admin-permissions.ts`

## 5. Fase 1 — Pedidos e operação administrativa

### Tarefa ORD-001 — Detalhe do pedido

**Status:** `[~]`

Criar `/admin/pedidos/[id]` e API protegida para retornar:

- Cliente e contato.
- Endereço e modalidade de entrega.
- Itens, variantes, quantidade e snapshot do produto.
- Subtotal, desconto, cupom, frete e total.
- Pagamento, parcelas, referência do gateway e status.
- Shipment, transportadora, serviço e rastreio.
- Timeline de `order_events`.
- Trocas, devoluções e observações.

Critérios de aceite:

- Pedido inexistente retorna 404.
- Apenas equipe autorizada acessa dados pessoais.
- Nenhum token público do pedido é exibido desnecessariamente.
- A tela funciona para pedido de visitante e cliente autenticado.
- A listagem contém link para o detalhe.

### Tarefa ORD-002 — Busca, filtros e paginação

**Status:** `[x]`

- Busca por número, nome, e-mail e SKU.
- Filtro por status, período, pagamento e transportadora.
- Paginação baseada em cursor ou limite seguro.
- Exportação CSV sem segredos.

Implementado nesta entrega: busca por número, cliente, e-mail e SKU; filtros de status do pedido,
status de pagamento, transportadora e intervalo de datas; paginação segura de 25 registros por página;
exportação CSV protegida, limitada a 100 pedidos por solicitação e sanitizada contra fórmulas de planilha.

### Tarefa ORD-003 — Alteração de status e timeline

**Status:** `[ ]`

- Transições permitidas por estado.
- Confirmação antes de cancelar ou devolver.
- Registro em `order_events` e `audit_log`.
- Atualização de estoque ao cancelar.
- Disparo de e-mail conforme o novo status.

### Tarefa ORD-004 — Pagamento e expedição

**Status:** `[ ]`

- Visualizar pagamento e webhook recebido.
- Criar remessa após pagamento confirmado.
- Informar transportadora e rastreio.
- Reenviar notificação ao cliente.
- Preparar reembolso e devolução.

## 6. Fase 2 — Produto, embalagem e frete

### Tarefa SHP-001 — Dimensões por variante

**Status:** `[ ]`

Adicionar ao formulário de produto:

- Peso.
- Altura.
- Largura.
- Comprimento.
- Valor segurado opcional.
- Embalagem padrão.

Persistir em unidades canônicas:

- Peso: gramas.
- Dimensões: milímetros.

Critérios de aceite:

- Campos aparecem na criação e edição.
- Validação rejeita valores negativos ou fora do limite.
- Variantes diferentes podem ter dimensões diferentes.
- Produto sem dimensão exibe aviso administrativo.
- O checkout não depende de dimensões enviadas pelo navegador.

### Tarefa SHP-002 — Configuração de embalagem padrão

**Status:** `[ ]`

Criar configuração em `store_settings` para:

- Peso padrão.
- Altura padrão.
- Largura padrão.
- Comprimento padrão.
- CEP de origem.
- Margem de seguro.

O sistema deve informar quando aplicou o padrão, em vez de ocultar a ausência de cadastro.

### Tarefa SHP-003 — Frete na página do produto

**Status:** `[ ]`

- Enviar `variantId` na calculadora do produto.
- Recalcular ao trocar opção, cor ou armazenamento.
- Usar dimensões da variante no servidor.
- Exibir serviço, prazo, valor e transportadora.
- Reutilizar o mesmo contrato do checkout.

### Tarefa SHP-004 — Adaptador comum de transportadoras

**Status:** `[ ]`

Contrato:

```text
quote()
createShipment()
buyLabel()
track()
cancelShipment()
handleWebhook()
```

Implementação:

- `[x]` SuperFrete — cotação.
- `[x]` Melhor Envio — cotação/fallback.
- `[ ]` Correios — preço, prazo, serviços e rastreio.
- `[ ]` Mandaê — cotação, pedido, etiqueta, rastreamento e webhook.

Cada provedor deve possuir sandbox, timeout, retry, log sanitizado e status na tela de Integrações.

## 7. Fase 3 — Catálogo, categorias e tags

### Tarefa CAT-001 — CRUD de categorias

**Status:** `[~]`

- Nome, slug, descrição, imagem e posição.
- SEO title e description.
- Ativo/inativo.
- Categoria pai opcional.
- Associação com produtos, coleções e banners.
- Preview da página pública.

### Tarefa CAT-002 — Tags

**Status:** `[~]`

- Tabela `tags` e relação `product_tags`.
- CRUD de tags.
- Tags automáticas e manuais.
- Sugestões no formulário de produto.
- Filtro e URL persistida na loja.
- Slug e canonicalização.

### Tarefa CAT-003 — Busca avançada

**Status:** `[ ]`

- Busca por nome, SKU, marca, plataforma, tag e descrição.
- Índice full-text no Postgres.
- Ordenação por relevância, preço e atualização.
- Estado vazio e correção de termos.
- Telemetria de buscas sem guardar dados pessoais desnecessários.

## 8. Fase 4 — Cupons e promoções

### Tarefa CUP-001 — CRUD administrativo

**Status:** `[~]`

Campos:

- Código.
- Tipo: percentual, valor fixo ou frete grátis.
- Valor.
- Valor mínimo.
- Período de validade.
- Limite total.
- Limite por cliente/e-mail.
- Primeira compra.
- Ativo/inativo.
- Acumula ou não com outras promoções.
- Escopo: loja, categoria, coleção ou produto.

### Tarefa CUP-002 — Segurança e cálculo

**Status:** `[ ]`

- Cálculo exclusivamente no Postgres/servidor.
- Operação atômica para evitar uso acima do limite.
- Registro de cada resgate.
- Idempotência no checkout.
- Mensagens sem revelar regras internas indevidas.
- Testes de concorrência.

### Tarefa CUP-003 — Relatórios

**Status:** `[ ]`

- Usos por cupom.
- Receita bruta e desconto concedido.
- Clientes alcançados.
- Pedidos cancelados com cupom.
- Exportação.

## 9. Fase 5 — Integrações e comunicação

### Tarefa INT-001 — Hub de integrações

**Status:** `[ ]`

Criar `/admin/configuracoes/integracoes` com cards, estado, teste e logs para cada provedor.

Configuração sensível:

- Chaves e tokens: ambiente/secret manager.
- IDs públicos: banco ou configuração pública controlada.
- Nunca exibir o valor completo de um segredo.
- Mostrar somente “configurado”, “ausente” ou “falhando”.

### Tarefa INT-002 — Resend

**Status:** `[~]`

- `[x]` Templates administrativos.
- `[x]` Teste de envio.
- `[x]` Nova conta e nova compra.
- `[ ]` Migração aplicada no Supabase remoto.
- `[ ]` `RESEND_API_KEY` configurada na Vercel.
- `[ ]` Domínio remetente verificado.
- `[ ]` Eventos de pagamento, envio, entrega e troca.
- `[ ]` Log de entrega, rejeição e retry.

### Tarefa INT-003 — Google Analytics/GTM

**Status:** `[ ]`

- ID da propriedade/contêiner.
- Consentimento antes do carregamento.
- Eventos de comércio eletrônico.
- Evento server-side após compra confirmada.
- Diagnóstico de eventos.

### Tarefa INT-004 — Google Ads

**Status:** `[ ]`

- Conversion ID e label.
- `gclid`/identificador de clique.
- Cadastro de ações de conversão.
- `purchase`, `sign_up` e `begin_checkout`.
- Conversões aprimoradas com consentimento.

### Tarefa INT-005 — Meta Pixel

**Status:** `[ ]`

- Pixel ID.
- `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout` e `Purchase`.
- Conversions API opcional.
- `event_id` para deduplicação.
- Consentimento de marketing.

## 10. Fase 6 — Privacidade, observabilidade e qualidade

### Tarefa OPS-001 — Consentimento LGPD

**Status:** `[ ]`

- Banner de consentimento por finalidade.
- Necessário, analytics, marketing e recuperação separados.
- Persistência do consentimento.
- Bloqueio de tags antes da autorização.
- Política de privacidade atualizada.

### Tarefa OPS-002 — Observabilidade

**Status:** `[ ]`

- Logs estruturados.
- `integration_events` para webhooks e provedores.
- Alertas administrativos.
- Tempo de resposta e taxa de erro.
- Correlation ID por pedido.
- Sanitização de e-mail, tokens e payloads sensíveis.

### Tarefa OPS-003 — Testes de aceitação

**Status:** `[ ]`

- Criar cliente.
- Criar produto com variante e dimensões.
- Calcular frete na página do produto.
- Aplicar cupom válido e inválido.
- Finalizar compra.
- Confirmar pagamento.
- Criar etiqueta.
- Atualizar rastreio.
- Receber e-mail transacional.
- Medir evento de compra.
- Abrir pedido no Admin.
- Cancelar pedido e liberar estoque.

## 11. Definição de pronto

Uma tarefa só pode ser marcada como concluída quando:

- Front e API estão implementados.
- Banco/migration está versionado, quando aplicável.
- Permissão e validação foram testadas.
- Estados de erro foram tratados.
- Não há segredo no código.
- TypeScript, lint e build passam.
- O fluxo foi testado no ambiente adequado.
- O documento foi atualizado com status, evidência e pendências.

## 12. Registro de execução

| Data | Tarefa | Status | Evidência | Próximo passo |
|---|---|---|---|---|
| 18/11/2026 | Auditoria inicial | `[x]` | Schema, rotas, páginas e integrações revisados | Executar ADM-001 e ORD-001 |
| 18/11/2026 | ADM-001 Sidebar | `[~]` | Sidebar modular criada; links de módulos futuros aguardam as respectivas telas | Finalizar responsividade móvel e permissões por papel |
| 18/11/2026 | ORD-001 Detalhe do pedido | `[x]` | Página, API protegida, itens, cliente, entrega, financeiro, pagamentos, envios, timeline e alteração segura de status implementados; TypeScript, ESLint e build aprovados | Evoluir para rastreio, etiqueta e ações de expedição |
| 18/11/2026 | ORD-002 Busca, filtros e paginação | `[x]` | Busca, filtros operacionais, paginação segura e exportação CSV protegida implementados; CSV sanitizado contra fórmulas | Evoluir para relatórios operacionais avançados |
| 18/11/2026 | CAT-001 Categorias | `[~]` | CRUD administrativo de categorias criado com ativação, posição e slug | Adicionar SEO completo, hierarquia e preview público |
| 18/11/2026 | CAT-002 Tags | `[~]` | Tabelas `tags`/`product_tags`, CRUD e contagem de produtos criados | Associar tags ao formulário de produto e ativar filtros públicos |
| 18/11/2026 | CUP-001 Cupons | `[~]` | CRUD administrativo de cupons percentuais/fixos, validade, limites e contador de usos criado | Adicionar frete grátis, escopos e regras de acúmulo |
| 18/11/2026 | INT-002 Resend | `[~]` | Página e templates locais; falta ativação remota | Aplicar migration, configurar ambiente e testar |
| 18/11/2026 | Preço promocional | `[x]` | Formulário diferencia preço promocional e original | Commitar junto da próxima entrega |

## 13. Formato obrigatório para atualizar este guia

Ao concluir uma tarefa, adicionar ao registro:

```text
Data:
Tarefa:
Status:
Arquivos alterados:
Migration:
Testes executados:
Resultado:
Pendências:
```

