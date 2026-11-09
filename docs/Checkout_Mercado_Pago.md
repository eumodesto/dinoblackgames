# Checkout com Mercado Pago

**DinoBlack Games e Informática** · 6 de novembro de 2026
Status: **funciona de ponta a ponta no ambiente local**, com o banco real (migrations + dados fictícios) e o Mercado Pago em modo simulado ou falso. **Não foi testado com cobrança real** e **não está ativo no site publicado** (faltam o banco e as variáveis de ambiente lá; ver seção 7).

---

## 1. O que existe

| Parte | O que faz |
| --- | --- |
| **`/checkout`** | Dados do cliente (sem precisar de cadastro), entrega por CEP com busca de endereço, forma de entrega, cupom, resumo fixo, aceite de termos e pagamento com o **Payment Brick** do Mercado Pago (cartão e Pix). |
| **`/checkout/confirmacao/[número]`** | Status do pedido ao vivo: Pix com QR e copia e cola, aprovado, cancelado. Só abre com o token do pedido. |
| **Carrinho** | Passou a ser salvo no navegador e a distinguir cor e armazenamento. Começa **vazio** (antes vinha com 2 itens de demonstração). A gaveta leva a **Finalizar compra**. `/carrinho` redireciona ao checkout. |
| **API** (`/api/checkout/*`, `/api/webhooks/mercadopago`, `/api/cron/expire-orders`) | Cotação, criar pedido, pagar, consultar e cancelar, webhook e expiração. |
| **Banco** (migration 4) | Funções que fazem o trabalho de verdade: cotação, criação do pedido com reserva de estoque, sincronização do pagamento. |

---

## 2. Como funciona

```mermaid
sequenceDiagram
  participant C as Cliente (navegador)
  participant S as Servidor (Next.js)
  participant B as Banco (Postgres)
  participant M as Mercado Pago
  C->>S: cotação (itens, CEP, cupom)
  S->>B: checkout_quote()
  B-->>S: preços do banco, estoque, cupom
  S-->>C: valores, frete estimado
  C->>S: criar pedido (dados, endereço, entrega, termos)
  S->>B: create_checkout_order() reserva estoque, congela preço
  B-->>S: número + token + total
  C->>M: dados do cartão (direto, via Brick)
  M-->>C: token do cartão
  C->>S: pagar (número, token do pedido, token do cartão)
  S->>M: POST /v1/payments (valor do PEDIDO, não do navegador)
  M-->>S: aprovado, pendente (Pix) ou recusado
  S->>B: sync_mp_payment() grava o pagamento; se aprovado, baixa o estoque
  M->>S: webhook (depois)
  S->>M: GET /v1/payments/{id} (nunca confia no corpo)
  S->>B: sync_mp_payment() (idempotente)
```

Pontos de desenho:

- **O pedido nasce antes do pagamento** e reserva o estoque por **30 minutos**. Sem pagar no prazo, o pedido é cancelado e o estoque volta.
- **O valor cobrado vem do pedido gravado no servidor.** O que o navegador mandar como valor é ignorado.
- **Pagamento aprovado com valor diferente do pedido não libera o pedido**: vira alerta para a equipe.
- **Webhook e consulta de status usam a mesma função** (`sync_mp_payment`), que é idempotente por pagamento e status. Notificação repetida ou fora de ordem não desfaz nada.
- Pedido pago depois do prazo (Pix tardio) **não reabre sozinho**: gera alerta para estornar ou reativar.
- O cliente pode **tentar de novo** com outro cartão enquanto o pedido está pendente; cada tentativa fica registrada.

---

## 3. Modos e variáveis de ambiente

Arquivo `storefront/.env.local` (ignorado pelo Git; modelo em `storefront/.env.example`).

| Variável | Para que serve | Segredo? |
| --- | --- | :-: |
| `MP_MODE` | `simulated` (padrão): **sem chamar o Mercado Pago e sem cobrança**. Cartão aprova, Pix fica pendente e há um botão de simular pagamento. `live`: cria pagamentos **reais**. | não |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Chave pública do Mercado Pago, usada no navegador pelo Brick. | não |
| `MP_ACCESS_TOKEN` | Access Token, usado só no servidor. | **sim** |
| `MP_WEBHOOK_SECRET` | Segredo da assinatura dos webhooks (recomendado em produção). | **sim** |
| `DATABASE_URL` | Conexão do Postgres do Supabase (pooler, modo transação). | **sim** |
| `CHECKOUT_DB=local` | **Só desenvolvimento**: Postgres em memória com migrations e seed fictício. Os dados somem ao reiniciar. | não |
| `NEXT_PUBLIC_SITE_URL` | Endereço público. As notificações do Mercado Pago só são pedidas se começar com `https://`. | não |
| `CRON_SECRET` | Protege `/api/cron/expire-orders`. | **sim** |
| `MP_API_BASE` | Só para testes: aponta para um Mercado Pago falso. | não |

**Credenciais que você enviou:** estão apenas no `.env.local` desta máquina (confirmado: nunca entraram no Git). O Access Token é de uma conta de vendedor **real** do Mercado Pago (Brasil, ativa), ou seja, **credencial de produção**. Por isso o modo padrão é `simulated`: nenhuma compra de teste cobra de verdade. Só mude para `live` de propósito.

---

## 4. Rotas

| Rota | Método | O que faz |
| --- | --- | --- |
| `/api/checkout/config` | GET | O que o navegador precisa (modo, chave pública, se está pronto). Sem segredos. |
| `/api/checkout/quote` | POST | Preço, estoque, cupom e frete para os itens. Nunca grava. |
| `/api/checkout/order` | POST | Valida e cria o pedido, reservando o estoque. Devolve número e token. |
| `/api/checkout/pay` | POST | Cria o pagamento no Mercado Pago e grava o resultado. |
| `/api/checkout/order/[número]?t=token` | GET | Status do pedido; se há pagamento pendente, confere no Mercado Pago. |
| `/api/checkout/order/[número]?t=token` | DELETE | Cliente cancela o pedido pendente (voltar para editar). |
| `/api/checkout/simulate/[número]?t=token` | POST | **Só no modo simulado**: aprova o Pix pendente. |
| `/api/webhooks/mercadopago` | POST | Notificações do Mercado Pago. |
| `/api/cron/expire-orders` | GET | Cancela pedidos vencidos. Exige `CRON_SECRET`. |

---

## 5. O que o checkout grava no banco

| Passo | Funções e tabelas |
| --- | --- |
| Cotação | `checkout_quote` → lê `products`, `product_variants`, `inventory_levels`, `inventory_units`, `promotions`, `coupons`. Nada é gravado. |
| Criar pedido | `create_checkout_order` → `orders` (com `public_token`), `order_items` (retrato do item), `inventory_levels.reserved` ou `inventory_units.status`, `inventory_movements`, `coupon_redemptions`, `order_events`. Consentimento de e-mail em `consents`. |
| Pagar | `sync_mp_payment` → `payments` (uma linha por tentativa, com o Pix copia e cola em `provider_data`), `integration_events`, `order_events`. |
| Pagamento aprovado | `confirm_payment` → `orders.status = paid`, baixa de `on_hand`, `inventory_movements`, `shipments`, `products.sold_count`. |
| Problemas | `admin_notifications`: valor divergente, estorno, pagamento em pedido cancelado. |
| Cancelar ou vencer | `cancel_order` → devolve estoque, expira pagamentos pendentes. |

Dados pessoais: nome, e-mail e telefone ficam no pedido; **o CPF nunca é gravado** (vai direto ao Mercado Pago). O token do cartão não passa por nenhuma tabela.

---

## 6. Segurança

- **Credenciais fora do código**: o token só é lido de variável de ambiente no servidor (`server-only`); a rota de configuração nunca o devolve.
- **Preço, estoque, frete e cupom decididos no servidor**; o navegador só sugere.
- **Frete recalculado no servidor** pelo CEP e pelo peso real dos itens.
- **Pedido protegido por token** (UUID) no link: sem ele, nem o status nem o pagamento abrem (devolve 404).
- **Webhook**: valida a assinatura (`x-signature`) quando `MP_WEBHOOK_SECRET` está definido, e **sempre consulta o pagamento na API** em vez de confiar no corpo.
- **Idempotência**: chave por pedido e tentativa evita cobrança dupla; notificações repetidas são ignoradas.
- **Dados do cartão não passam pelo servidor** (o Brick envia direto ao Mercado Pago).
- **Mensagens de erro seguras**: erros inesperados do banco viram "tente novamente" e o detalhe vai só ao log.
- O site publicado hoje **não tem as variáveis**, então o checkout lá responde "ainda não está ativo". É a configuração segura enquanto o catálogo é de demonstração.

---

## 7. Como testar

```bash
# desenvolvimento (modo simulado, banco local com dados fictícios)
cd storefront && npm run dev          # http://localhost:3110/checkout
node scripts/checkout-e2e.mjs simulated http://localhost:3110

# caminho "live" contra um Mercado Pago FALSO (nada real é chamado)
node scripts/fake-mp.mjs 4010 &
MP_MODE=live MP_API_BASE=http://localhost:4010 MP_ACCESS_TOKEN=fake-token npx next start -p 3120
node scripts/checkout-e2e.mjs live http://localhost:3120 http://localhost:4010

# banco: migrations, seed e regras (110 verificações)
cd ../supabase/tools && npm run validate
```

Resultado desta entrega: **110 verificações no banco, 35 ponta a ponta em modo simulado e 46 no caminho live** (o modo live inclui o webhook, o valor divergente, o cartão em análise e a assinatura), todas passando. Também conferi no navegador: o checkout, a validação dos campos, o Brick do Mercado Pago carregando com a **chave pública real** (cartão e Pix), o Pix pendente e a tela de pagamento aprovado.

**O que não foi testado:** uma cobrança real (o modo live só rodou contra o Mercado Pago falso), a digitação de um cartão dentro do Brick (é um iframe do Mercado Pago), a entrega real de um webhook pelo Mercado Pago, a conexão com um Postgres do Supabase de verdade (`DATABASE_URL`) e concorrência real entre dois clientes.

---

## 8. Para colocar no ar

1. **Banco**: criar o projeto Supabase (desenvolvimento ou teste primeiro), aplicar `supabase/migrations/` e, se for ambiente de teste, o seed (com `SEED_PASSWORD` próprio). Definir `DATABASE_URL` com o pooler em modo transação.
2. **Vercel**: definir `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (https), `MP_WEBHOOK_SECRET` e `CRON_SECRET`. **Deixe `MP_MODE=simulated` até o catálogo real estar no banco.** Passe a `live` só depois.
3. **Mercado Pago**: no painel da aplicação, cadastrar o webhook `https://SEU-DOMINIO/api/webhooks/mercadopago` (evento "Pagamentos") e copiar a assinatura secreta para `MP_WEBHOOK_SECRET`.
4. **Expirar pedidos**: o plano Hobby da Vercel só agenda cron diário, pouco para um prazo de 30 minutos. O melhor caminho é um agendamento no próprio Supabase (`pg_cron` chamando `select expire_pending_orders(30)` a cada 5 minutos). A rota `/api/cron/expire-orders` fica como alternativa.
5. **Testar com conta de teste do Mercado Pago** (vendedor e comprador de teste) antes de qualquer compra real, depois uma compra real de valor baixo e estorno.
6. **Trocar as credenciais** que foram coladas no chat (ver abaixo) e **não reutilizar** o token em outros projetos.

> **Recomendação sobre as credenciais:** o Access Token apareceu em uma conversa. Considere-o exposto: gere um novo no painel do Mercado Pago (Suas integrações → Credenciais), principalmente antes de ativar o modo `live`.

---

## 9. Pendências e decisões

| Item | Situação |
| --- | --- |
| **Boleto** | Fora de propósito: o boleto leva dias para pagar e o pedido reserva o estoque por 30 minutos. O banco e o servidor já suportam; falta decidir a reserva mais longa para boleto. |
| **Termos e políticas** | A caixa de aceite cita "termos de compra e política de privacidade", mas as páginas **ainda não existem** (nem o texto oficial). Precisam existir e ser revisadas antes de vender de verdade. |
| **Catálogo no banco** | As páginas de produto e a loja ainda leem o catálogo de demonstração em código; o checkout já valida preço e estoque no banco. Falta trocar a leitura (fase 1 do plano de integração). |
| **Frete real** | Cotação via SuperFrete (principal) e Melhor Envio (fallback), com retirada na loja no DF. Falta emissão/compra de etiqueta pós-pagamento. |
| **Conta do cliente** | O checkout é só para visitante. Login, endereços salvos e `/pedidos` vêm depois (o banco já suporta). |
| **E-mails** | Nenhum e-mail transacional é enviado ainda (confirmação, Pix, envio). |
| **Abuso** | Falta limitar a taxa de chamadas nas rotas públicas (cotação, pedido, contato). |
| **Parcelamento** | Fixo em até 10x sem juros na tela e no Brick. A política real precisa ser confirmada e configurada também no Mercado Pago. |
| **Nota fiscal** | Sem integração fiscal. |
| **Estorno** | Detectado pelo webhook e registrado, mas o estorno em si é feito no painel do Mercado Pago. |
