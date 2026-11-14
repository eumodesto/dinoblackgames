# Documentação do desenvolvimento

## Por onde começar

- **Estado atual, backlog priorizado, decisões pendentes e riscos:** [Documento técnico de desenvolvimento](./Desenvolvimento_Tecnico_DinoBlack.md) (documento vivo, atualizado a cada marco).
- **Escopo de produto, jornadas e aceite:** o guia principal abaixo.
- **Implantação e variáveis de ambiente:** [Checkout com Mercado Pago](./Checkout_Mercado_Pago.md), seção 8, e `storefront/.env.example`.

## Guia principal

O documento [Documento de Desenvolvimento do E-commerce DinoBlack](./Documento_Desenvolvimento_Ecommerce_DinoBlack.md) é a referência de produto, UX/UI, arquitetura, fases, critérios de aceite, testes e decisões pendentes do projeto.

Complemento: [Plano da página de produto e da listagem com filtros](./Plano_Pagina_Produto.md), com diagnóstico, anatomia da página, variantes (novo, seminovo, raridade), filtros por categoria, modelo de dados, roadmap e decisões pendentes.

Banco de dados: [Mapeamento de telas, produtos e usuários](./Mapeamento_Telas_e_Dados.md) (perfis, permissões, telas da loja e do painel, jornadas, plano de integração e dados fictícios) e o [Dicionário de dados](./Dicionario_de_Dados.md) (gerado do banco real). O código fica em [`supabase/`](../supabase/). Pagamento: [Checkout com Mercado Pago](./Checkout_Mercado_Pago.md) (fluxo, modos, variáveis, segurança, como testar e como colocar no ar).

Use o guia principal para:

- orientar descoberta, design, implementação, migração e lançamento;
- distinguir requisitos definidos, recomendações e pontos que ainda precisam de validação;
- manter as quatro categorias principais: Consoles, PC Gamer, Retro e Notebooks;
- registrar decisões antes de transformar hipóteses em funcionalidades do MVP.

Este guia não substitui validação técnica, jurídica, comercial ou de segurança. O documento deve ser atualizado quando uma decisão pendente for aprovada.
