# Runbook — banco principal (`doufsxqlfjyuvxuezpln`)

Escopo: o projeto Supabase **canônico** do catálogo/operação (397 tabelas), distinto do
projeto isolado do site (`xlzmclcjdncjfdrjxclt`, coberto por
`docs/RUNBOOK_RECONCILIACAO_LEDGER.md`). Diferença fundamental que muda todo o resto
deste runbook: **este banco não tem migrations nem schema versionados neste
repositório** — é gerenciado por outro produto/fluxo (painel Lovable/Supabase Studio),
fora do controle de versão do `Promo_Brindes_V1`. Este repositório só o **consome**
(`VITE_SUPABASE_URL`, views `v_products_public`/`v_site_products_public` documentadas em
`docs/DATABASE_PUBLIC_CONTRACT.md`).

## Pré-condições

- [ ] Acesso ao gateway MCP `SUPABASE - GESTÃO DE PRODUTOS` (ou equivalente) — é o único
      canal usado nesta auditoria para consultar este projeto; não há CLI linkado nem
      connection string no `.env.local` deste repositório.
- [ ] Se o gateway MCP não estiver disponível: não há fallback de acesso documentado.
      Isso é uma lacuna real — ver Etapa 4 do plano de 20260917 sobre nomear
      explicitamente qual gateway serve qual projeto.

## 1. Verificar saúde geral

```sql
-- via execute_sql do MCP, ou SQL Editor do Supabase Studio
select count(*) from information_schema.tables where table_schema = 'public';
-- esperado: 397 (ou mais, se o time adicionou tabelas desde 17/09/2026)
```

```
-- get_advisors(type="security") e get_advisors(type="performance")
-- baseline de 17/09/2026: 8 ERROR (views públicas SECURITY DEFINER, intencionais),
-- 623 WARN (516 são pg_graphql_*_table_exposed — ver Etapa 40 do plano),
-- 1 WARN de performance (multiple_permissive_policies em system_settings — Etapa 42).
```

Se o número de `ERROR` subir acima de 8, ou aparecer uma categoria de `ERROR` nova, trate
como incidente — não é ruído esperado.

## 2. Confirmar que o contrato público consumido pelo site ainda existe

```sql
select table_schema, table_name, table_type
from information_schema.tables
where table_name in ('v_site_products_public', 'v_products_public');
-- as duas devem retornar table_type = 'VIEW'
```

Se `v_site_products_public` sumir ou mudar de colunas, o site (`Promo_Brindes_V1`) quebra
silenciosamente na leitura de catálogo — `docs/DATABASE_PUBLIC_CONTRACT.md` lista os
campos autorizados esperados.

## 3. Se uma mudança de schema neste banco for necessária

Este repositório **não** é onde ela deve ser feita nem revisada — não há PR, migration
nem CI aqui que a valide. Fluxo:

1. A mudança é feita pelo dono do projeto principal (painel Lovable/Studio, ou o
   repositório-fonte desse produto, se existir um).
2. Depois de aplicada, rode a Etapa 43 do plano de 20260917 (dump de schema somente-
   leitura) de novo para o registro local (`docs/sql/canonical-principal/`, se criado)
   não ficar desatualizado.
3. Se a mudança tocar `v_products_public`/`v_site_products_public` ou qualquer RPC que o
   site chama diretamente, execute o passo 2 deste runbook **antes** de considerar a
   mudança concluída — é o único jeito de saber, a partir deste repositório, se o
   contrato quebrou.

## 4. Escalonamento

Sem acesso de escrita a este projeto a partir deste repositório (por design — ver
princípio de privilégio mínimo do plano de 20260917), qualquer correção de segurança ou
schema identificada numa auditoria (ex.: Etapas 39–42 do plano de 20260917) precisa ser
executada por alguém com acesso direto ao projeto `doufsxqlfjyuvxuezpln`. Este runbook
não substitui isso — documenta o que verificar e para quem escalar, não como corrigir
sem supervisão.

**Achado ativo, tratado fora deste runbook**: `public.mcp_kv_get` — ver Etapa 39 do plano
de 20260917 e o alerta direto desta sessão. Rotação de segredo e correção de grants são
ação humana urgente, não algo que este runbook cobre.
