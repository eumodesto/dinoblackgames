# DinoBlack Games — Documento técnico de desenvolvimento

**Atualizado em:** 13/11/2026  
**Repositório:** `eumodesto/dinoblackgames`  
**Aplicação:** Next.js em `storefront/`  
**Produção:** `https://dinoblackgames.vercel.app`

## 1. Objetivo

Concluir a transformação do storefront em uma operação de e-commerce confiável, com catálogo real, checkout integrado ao Mercado Pago, estoque consistente, frete rastreável, gestão administrativa e base preparada para contas de clientes.

## 2. Estado atual

- Frontend Next.js publicado na Vercel.
- Branch `main` no commit `b5764a3`.
- Checkout implementado com cotação, endereço, frete, cupom, reserva de estoque, pagamento e confirmação.
- Modo local/simulado disponível para desenvolvimento.
- Migrations e seed do domínio comercial presentes no repositório.
- Tela de conta criada, mas ainda sem Supabase Auth.
- Catálogo público ainda precisa usar integralmente a mesma fonte de dados do checkout.
- Projeto Supabase e variáveis de produção precisam ser confirmados no ambiente do cliente.

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

1. Configurar Supabase de produção e executar migrations.
2. Configurar variáveis da Vercel sem expor segredos no cliente.
3. Rotacionar credenciais do Mercado Pago compartilhadas durante o desenvolvimento.
4. Exigir `MP_WEBHOOK_SECRET` no modo live.
5. Configurar e testar o webhook oficial do Mercado Pago.
6. Garantir que preço e estoque do checkout venham exclusivamente do banco.
7. Publicar termos, privacidade, trocas, devoluções e garantia.

### P1 — Operação do pedido

1. Integrar frete real.
2. Implementar expiração automática de reservas.
3. Enviar notificações de pedido e pagamento.
4. Implementar reembolso real e tratamento de chargeback.
5. Adicionar rate limiting, logs estruturados e monitoramento.
6. Processar consentimento de marketing sem bloquear um pedido já criado; falhas devem gerar alerta operacional.

### P2 — Produto e gestão

1. Conectar todo o catálogo público ao banco.
2. Finalizar painel de produtos, estoque, pedidos e cupons.
3. Integrar Supabase Auth para clientes e equipe.
4. Implementar pedidos, endereços e recuperação de senha.
5. Corrigir SEO, acessibilidade e responsividade.

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

## 6. Desenvolvimento iniciado

O validador em `storefront/src/lib/server/mp.ts` foi endurecido:

- modo simulado continua livre para testes locais;
- modo live sem `MP_WEBHOOK_SECRET` rejeita o evento;
- modo live valida `x-signature` com comparação em tempo constante.

A prontidão em `storefront/src/lib/server/env.ts` também passou a exigir, no
modo live, token privado, chave pública, segredo do webhook e URL HTTPS. Sem
esses quatro itens a API informa que o checkout ainda não está pronto.

O banco local em memória também ficou restrito ao modo simulado. Em modo live,
`DATABASE_URL` passa a ser obrigatório, evitando pagamentos reais sem
persistência.

## 7. Próximas etapas

1. Rodar lint, build e testes.
2. Revisar APIs contra o schema real do Supabase.
3. Preparar staging com variáveis sem dados reais.
4. Testar Mercado Pago em ambiente controlado.
5. Conectar catálogo, estoque e frete reais.
6. Ativar `MP_MODE=live` somente após checklist de lançamento.

## 8. Riscos conhecidos

- Repositório público: segredos nunca entram no Git.
- Conta de cliente ainda é somente visual.
- Catálogo demonstrativo pode divergir do inventário real.
- Cron da Vercel não deve ser o único mecanismo de expiração.
- O plano Hobby da Vercel deve ser validado para uso comercial.

## 9. Registro

| Data | Mudança |
|---|---|
| 13/11/2026 | Documento criado e validação do webhook live endurecida. |
