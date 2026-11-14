# DinoBlack Games — Documento técnico de desenvolvimento

**Atualizado em:** 14/11/2026  
**Repositório:** `eumodesto/dinoblackgames`  
**Aplicação:** Next.js em `storefront/`  
**Produção:** `https://dinoblackgames.vercel.app`

> Este é o documento vivo do **estado e do plano de execução**. O escopo de produto, as jornadas e os critérios de aceite estão no [Documento de Desenvolvimento do E-commerce](./Documento_Desenvolvimento_Ecommerce_DinoBlack.md); o índice de toda a documentação está em [README.md](./README.md).

## 1. Objetivo

Concluir a transformação do storefront em uma operação de e-commerce confiável, com catálogo real, checkout integrado ao Mercado Pago, estoque consistente, frete rastreável, gestão administrativa e base preparada para contas de clientes.

## 2. Estado atual

**Decisão de plataforma (registrada):** o Documento de Desenvolvimento deixava a plataforma em aberto (tema pronto ou headless). O desenvolvimento seguiu a opção **headless própria: Next.js na Vercel + Postgres/Supabase + Mercado Pago**. A decisão ainda não foi validada formalmente com o cliente (custo de operação, editor visual e autonomia); ver seção 8.

**Pronto no código (branch `main`, commit `8c10b93`):**

- Loja: home, `/loja` com filtros e estado na URL, `/produto/[slug]`, carrinho persistido, `/checkout` e confirmação do pedido, rodapé com dados da loja, tema claro/escuro, página `/design-system`.
- Catálogo lido do banco em tempo de execução (`lib/server/catalog.ts`): home, loja, produto e admin. As páginas usam `dynamic = "force-dynamic"`, então `next build` funciona sem banco.
- Checkout: cotação, endereço, frete (SuperFrete com Melhor Envio de reserva e retirada na loja), cupom, reserva transacional de estoque, Payment Brick (cartão e Pix), webhook com `x-signature` e idempotência. Modo `simulated` para desenvolvimento.
- Banco: 4 migrations, seed fictício e suíte de 110 verificações em PGlite.
- Admin provisório: `/admin`, `/admin/pedidos` e `/admin/produtos`, protegidos por login com cookie HMAC. Usuário e senha vêm das variáveis `ADMIN_USER` e `ADMIN_PASSWORD`, que devem ser cadastradas também na Vercel. Aceita um único usuário e não tem limite de tentativas.
- Tela de conta (`/minhaconta`), ainda sem autenticação real.

**Ainda não está no ar:**

- Projeto Supabase de produção (não provisionado; o Access Hub não tem o alvo Supabase liberado).
- Variáveis de ambiente de produção na Vercel. **Sem `DATABASE_URL` (ou `CHECKOUT_DB=local` com `MP_MODE=simulated`, só para demonstração), `/`, `/loja` e `/produto/*` respondem 500**, embora o build passe.
- Termos, privacidade, trocas, devoluções e garantia (o checkout já cita esses textos).
- Mercado Pago em modo live, webhook oficial e expiração automática de pedidos.
- Login real de clientes e da equipe, e-mails transacionais, limite de requisições, estorno automático e nota fiscal.
- Editor visual de aparência, que é a prioridade expressa do cliente e ainda não existe.

**Infraestrutura:** dois projetos Vercel estão ligados ao mesmo repositório (`dinoblack/dinoblackgames`, do cliente, e `interjuria/dinoblackgames`). Falta definir qual serve o domínio público.

## 3. Arquitetura alvo

```text
Cliente
  └─ Next.js / Vercel
       ├─ Catálogo, produto, carrinho e checkout
       ├─ APIs do domínio comercial
       └─ Painel administrativo
              └─ Postgres/Supabase
                    ├─ produtos e variantes
                    ├─ estoque e reservas
                    ├─ pedidos e eventos
                    ├─ pagamentos, cupons e expedição

Mercado Pago ── webhook autenticado ──> API Next.js ──> pedido/estoque
Serviço de frete ── cotação ──> Checkout
Notificações ── eventos operacionais
```

## 4. Prioridades

### P0 — Segurança e venda real

1. Configurar Supabase de produção e executar migrations (sem rodar o seed padrão; usar `SEED_PASSWORD` próprio se houver dados de teste).
2. Configurar variáveis da Vercel sem expor segredos no cliente, incluindo `ADMIN_USER` e `ADMIN_PASSWORD`.
3. Rotacionar credenciais do Mercado Pago compartilhadas durante o desenvolvimento.
4. Exigir `MP_WEBHOOK_SECRET` no modo live. *(feito no código)*
5. Configurar e testar o webhook oficial do Mercado Pago.
6. Garantir que preço e estoque do checkout venham exclusivamente do banco. *(feito)*
7. Publicar termos, privacidade, trocas, devoluções e garantia.

### P1 — Operação do pedido

1. Integrar frete real. *(cotação feita; falta compra de etiqueta após o pagamento)*
2. Implementar expiração automática de reservas (`pg_cron` no Supabase a cada 5 minutos; a rota `/api/cron/expire-orders` fica como alternativa).
3. Enviar notificações de pedido e pagamento.
4. Implementar reembolso real e tratamento de chargeback.
5. Adicionar rate limiting, logs estruturados e monitoramento.
6. Processar consentimento de marketing sem bloquear um pedido já criado; falhas devem gerar alerta operacional.

### P2 — Produto e gestão

1. ~~Conectar todo o catálogo público ao banco.~~ *(feito)*
2. Finalizar painel de produtos, estoque, pedidos e cupons.
3. Integrar Supabase Auth para clientes e equipe, com papéis (hoje o admin tem um login único provisório).
4. Implementar pedidos, endereços e recuperação de senha.
5. Corrigir SEO (sitemap, redirects 301 e liberar o `noindex` da `/loja` quando houver catálogo real), acessibilidade e responsividade.
6. Editor visual de banners, textos e seções, com pré-visualização.

## 5. Critérios de aceite do checkout

- Pedido nunca é criado com preço vindo do navegador.
- Estoque é reservado de forma transacional.
- Compras simultâneas não vendem a mesma unidade.
- Webhook rejeita chamadas sem assinatura válida em produção.
- Eventos repetidos do Mercado Pago são idempotentes.
- Valor aprovado é comparado com o total do pedido.
- Pedido expirado libera estoque.
- PIX, cartão aprovado, recusado e pendente têm estados visíveis.
- Visitante consulta apenas o próprio pedido usando número e token.
- Nenhum segredo aparece no bundle público ou nos logs.

## 6. Endurecimento já aplicado

- O validador em `storefront/src/lib/server/mp.ts` aceita eventos sem assinatura só no modo simulado; no modo live, sem `MP_WEBHOOK_SECRET` o evento é rejeitado e a assinatura `x-signature` é comparada em tempo constante.
- A prontidão em `storefront/src/lib/server/env.ts` exige, no modo live, token privado, chave pública, segredo do webhook e URL HTTPS. Sem esses itens a API informa que o checkout ainda não está pronto.
- O banco local em memória é restrito ao modo simulado. No modo live, `DATABASE_URL` é obrigatório, evitando pagamentos reais sem persistência.
- O build de produção não depende de banco: páginas que consultam o catálogo renderizam em tempo de requisição (commits `fbc3e82` e `8c10b93`).

## 7. Backlog priorizado (próximas etapas)

A ordem respeita as dependências. Os itens 1 a 3 destravam todo o resto.

| # | Entrega | Depende de | Pronto quando |
|---|---|---|---|
| 1 | Definir qual projeto Vercel serve o domínio e liberar os alvos Vercel e Supabase no Access Hub | Cliente | Deploy do `main` aparece verde no projeto escolhido |
| 2 | Provisionar Supabase (dev/teste primeiro), aplicar migrations e definir `DATABASE_URL` com pooler em modo transação | 1 | `/`, `/loja` e `/produto/*` respondem 200 na Vercel |
| 3 | Cadastrar variáveis na Vercel (`ADMIN_*`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, frete); manter `MP_MODE=simulated` | 2 | `/api/checkout/config` informa `ok` e o login do admin funciona |
| 4 | Rotacionar o Access Token do Mercado Pago e cadastrar o webhook oficial | 3 | Pagamento de teste com conta de teste atualiza o pedido |
| 5 | Agendar a expiração de pedidos (`pg_cron`) | 2 | Pedido não pago libera o estoque em até 30 minutos |
| 6 | Páginas legais: termos, privacidade, trocas, devoluções e garantia | Cliente (textos) | Links do checkout abrem páginas revisadas |
| 7 | Rate limiting nas rotas públicas e logs estruturados | 3 | Excesso de chamadas retorna 429 e aparece no log |
| 8 | E-mails transacionais (confirmação, Pix, envio) | Provedor de e-mail | Pedido de teste dispara os e-mails |
| 9 | Supabase Auth: login de clientes e da equipe com papéis, `/minhaconta` e `/pedidos` reais | 2 | Cliente vê só os próprios pedidos; admin respeita papéis |
| 10 | Painel real por módulo (pedidos, catálogo, estoque, cupons) | 9 | Equipe opera sem o seed e sem tocar no banco |
| 11 | Editor visual de banners e seções | Script de referência do cliente | Cliente executa as tarefas acordadas em homologação |
| 12 | SEO e migração: redirects 301, sitemap, JSON-LD, analytics; `/loja` segue com `noindex` e `/produto/*` já está indexável, então decidir quando liberar | Catálogo real | Amostra de URLs antigas redireciona ao produto certo |
| 13 | Compra de etiqueta de frete e estorno automático | 4 | Pedido pago gera etiqueta; estorno sai pelo painel da loja |
| 14 | Teste de concorrência (duas compras da última unidade) em Postgres real e teste do Supabase Auth real | 2 e 9 | Só uma compra conclui |
| 15 | Ativar `MP_MODE=live` seguindo o checklist de lançamento | 1 a 8 | Compra real de baixo valor aprovada e estornada |

## 8. Decisões pendentes (cliente)

- Plataforma: validar com o cliente a escolha headless (Next.js + Supabase), custo de operação e autonomia de edição.
- Preço vigente da proposta (R$ 2.000 ou "a definir").
- Política de garantia, troca e devolução.
- Parcelamento real (hoje até 10x sem juros no código) e desconto no Pix.
- Escala de condição do seminovo e quem a define.
- Fonte canônica do estoque: banco da loja ou ERP.
- Retirada na loja (Santa Maria/DF) e prazo.
- Login: só e-mail e senha ou também Google.
- Compra sem cadastro no MVP (o checkout atual já é só para visitante).
- Vídeos nos produtos e responsável pelas fotos reais.
- Script de referência do editor visual (ainda não recebido).
- Retenção de dados e política de privacidade antes de guardar documentos e fotos de usados.

## 9. Riscos conhecidos

- Repositório público: segredos nunca entram no Git.
- Dois projetos Vercel no mesmo repositório podem publicar versões diferentes do site.
- O login do admin é provisório: usuário único, sem limite de tentativas e sem papéis.
- Conta de cliente ainda é somente visual.
- Fotos de demonstração (Unsplash) não combinam com alguns produtos, e as páginas `/produto/*` não têm mais `noindex` (só `/loja`, checkout, conta e admin têm), então dados de demonstração podem ser indexados.
- Cron da Vercel não deve ser o único mecanismo de expiração.
- O plano Hobby da Vercel deve ser validado para uso comercial.
- Concorrência real e Supabase Auth não foram testados, só PGlite com stub.

## 10. Registro

| Data | Mudança |
|---|---|
| 13/11/2026 | Documento criado e validação do webhook live endurecida. |
| 14/11/2026 | Build corrigido para funcionar sem banco (`8c10b93`). Estado, backlog priorizado, decisões pendentes e riscos reescritos; catálogo no banco e decisão de plataforma registrados. |
