# Banco — referência para agentes

Ler **antes** de rodar SQL, criar migration ou tocar no contrato do catálogo.

## Os dois bancos

| | Catálogo (canônico) | Site (isolado) |
|---|---|---|
| Ref | `doufsxqlfjyuvxuezpln` | `xlzmclcjdncjfdrjxclt` |
| Dono | sistema interno `Promo_Gifts_V4` — **não é deste repo** | este repo |
| O que o site faz | **somente leitura**, pelas views `v_site_products_public` e `v_products_public` | leads, orçamentos, área do cliente, fila de notificação |
| Migrations daqui | **nunca** | `site-supabase/supabase/migrations/` |
| MCP | `SUPABASE - GESTÃO DE PRODUTOS` (confirmado: `get_project_url` → `doufsxqlfjyuvxuezpln`) | **não há MCP** deste projeto carregado — use o CLI pelos comandos `npm run db:site:*` |

**Cuidado com MCP de nome parecido:** `SUPABASE - GESTÃO DE CLIENTES` aponta para `pgxfvjmuubtbowutlide`
(CRM), **não** para o banco do site. Confira com `get_project_url` antes de executar SQL.

Não altere o `Promo_Gifts_V4` por este site. As pendências de hardening do banco canônico ficam em
`docs/sql/canonical-principal/` e só são aplicadas com o dono.

## Contrato público do catálogo

- O que o site pode ler está em `docs/DATABASE_PUBLIC_CONTRACT.md`; o SQL aplicado em 08/09/2026 está em
  `docs/sql/canonical/20260908190000_create_site_products_public_contract.sql`.
- Consumidores no código: `src/lib/catalog.ts`, `api/_lib/catalogValidation.ts`,
  `api/_lib/publicProductPage.ts`, `api/sitemap.ts`.
- Vigilância: `npm run check:catalog-contract` (`scripts/check-catalog-public-contract.mjs`),
  `npm run test:catalog-contract` e o workflow `catalog-contract.yml` (diário, 07:30 UTC).
- Contrato quebrou (coluna removida, view trocada, permissão revogada) → `docs/RUNBOOK_BANCO_PRINCIPAL.md`.
  Diagnóstico em produção é leitura; não "conserte" o banco canônico por conta própria.

## Banco isolado do site — como aplicar migration

Ordem obrigatória:

```bash
npm run db:site:guard      # scripts/validate-site-supabase-target.mjs
npm run db:site:dry-run    # guard + supabase db push --dry-run
SUPABASE_WORKDIR=site-supabase npx supabase@latest db push
```

- O guard recusa qualquer alvo diferente de `xlzmclcjdncjfdrjxclt` ("BLOQUEADO: migrations do site só
  podem ser aplicadas no projeto isolado"). Vínculo ausente → `docs/SITE_SUPABASE_SETUP.md`.
- **Nunca** `supabase db reset --linked`. `npm run db:site:reset` é só para o Postgres local.
- Migration: `site-supabase/supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`, 14 dígitos no prefixo
  (`npm run db:migration-names:check` / `npm run test:migration-names`), **aditiva**. Nunca reverta schema
  de forma destrutiva em produção.
- Teste pgTAP junto, em `site-supabase/supabase/tests/database/<assunto>.test.sql` (28 arquivos hoje):
  privilégio (`site_api_privileges`), RLS (`force_rls_hygiene`), máquina de estados, plano de query
  (`query_plans`) e limites.
- Schemas do site: `public` e `site_private`.

## O que o CI cobra quando você mexe no banco

`database.yml` (check obrigatório **`Migrations and pgTAP`**) sobe o Supabase local, roda
`supabase db reset`, o pgTAP, `npm run test:queue-concurrency` e `supabase db lint` — e **falha se os
artefatos gerados estiverem defasados**. Depois de criar/alterar migration, rode e commite:

```bash
npm run db:site:types        # src/types/site-database.types.ts
npm run db:site:dictionary   # docs/DATABASE_DICTIONARY.md
npm run db:site:schema-doc   # docs/DATABASE_SCHEMA.md
npm run db:site:error-catalog:check
```

## Ledger de migrations e release

`release.yml` compara, no projeto isolado, `supabase_migrations.schema_migrations` com os arquivos de
`site-supabase/supabase/migrations/` e **aborta o release** se não forem exatamente iguais
("O ledger remoto não corresponde exatamente às migrations versionadas"). Divergiu →
`docs/RUNBOOK_RECONCILIACAO_LEDGER.md`. Estado dos requisitos (ledger de fechamento) é outro assunto:
`docs/GOVERNANCA_FECHAMENTO.md` + `npm run ledger:check`.

## Limites

- DDL em produção é item de "chame o dono" (regra 8 do Fluxo Git): a PR fica aberta.
- Segredos de banco só em env/secret do serviço (`SITE_SUPABASE_SECRET_KEY`, `SITE_SUPABASE_SERVICE_JWT`);
  nunca em `VITE_*`, nunca no commit, nunca no output. Rotação: `docs/RUNBOOK_ROTACAO_SEGREDOS.md`.
- Verificação e restore: `docs/RUNBOOK_VERIFICACAO_DB.md`, `docs/RUNBOOK_RESTORE_SITE.md`,
  `docs/RUNBOOK_REVISAO_MENSAL_BANCO.md`, `docs/RUNBOOK_PREVIEW_ISOLADO.md` (preview usa projeto próprio).
