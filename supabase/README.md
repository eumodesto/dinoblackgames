# Banco de dados da DinoBlack

Schema, regras de estoque e pedido, RLS e dados **fictícios** para testes. Nada aqui foi aplicado em nenhum banco remoto.

```
supabase/
  migrations/   schema (49 tabelas), funções e views, RLS
  seed.sql      dados fictícios (gerado por tools/build-seed.mjs, não edite à mão)
  tools/        gerador do seed, gerador do dicionário e a suíte de validação
```

## Validar tudo localmente (sem Supabase, sem banco remoto)

```bash
cd supabase/tools
npm install
npm run validate
```

Sobe um Postgres em memória (PGlite) com um stub do Supabase Auth, aplica as migrations e o seed e roda 78 verificações: integridade, paridade com a loja, RLS por perfil e regras de estoque, pedido, cupom e cancelamento.

## Outros comandos

| Comando | O que faz |
| --- | --- |
| `npm run seed:build` | Regenera `supabase/seed.sql` |
| `npm run docs` | Regenera `docs/Dicionario_de_Dados.md` a partir do banco real |

## Usar num projeto Supabase (somente desenvolvimento ou teste)

1. `supabase init` na raiz (cria `supabase/config.toml`; as migrations e o seed já estão no lugar certo).
2. `supabase link --project-ref <projeto de DEV>` e `supabase db reset` (aplica as migrations e o `seed.sql`).
3. Usuários de teste, senha `Teste@2026`: ver o cabeçalho de `seed.sql` e `docs/Mapeamento_Telas_e_Dados.md`.

**Nunca rode o seed em produção.** Ele cria usuários com senha conhecida. Em qualquer banco acessível pela internet (inclusive um projeto Supabase de desenvolvimento), gere o seed com senha própria: `SEED_PASSWORD="uma-senha-forte" npm run seed:build`, que grava `supabase/seed.local.sql` (ignorado pelo Git; aponte `[db.seed] sql_paths` do `config.toml` para ele ou aplique com `psql`). A senha padrão `Teste@2026` está neste repositório público e vale só para o banco local.

Mapa completo de telas, perfis e dados: [`docs/Mapeamento_Telas_e_Dados.md`](../docs/Mapeamento_Telas_e_Dados.md).
