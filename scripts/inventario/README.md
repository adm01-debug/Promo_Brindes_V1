# inventario — estado real do banco do site, com alertas

**O que faz:** `gerar-banco.mjs` roda o SQL de leitura `banco.sql` no Supabase **isolado do site**
(`xlzmclcjdncjfdrjxclt`), cruza o resultado com o código (`.from()` e `.rpc()` em `src/`, `api/` e
`shared/`) e grava `inventario/estado/banco.json`: tabelas (RLS, policies, triggers, índices, linhas),
funções chamáveis por RPC (security definer, `search_path`, quem executa, quem chama), pg_cron, fila de
notificação de lead, fila de remoção de arquivos — e uma lista de `alertas`.

**Por que existe, tendo o `contexto.yml`:** o snapshot completo do banco
(`docs/contexto/supabase/`) depende do secret `SITE_SUPABASE_DB_URL`, que ainda não existe. Este
inventário usa o `SUPABASE_ACCESS_TOKEN` que o repo já tem (o mesmo do `release.yml`) e entrega o
essencial do estado vivo. Ele **não** duplica rotas/módulos/hooks: isso é de
`docs/contexto/codigo/` (`scripts/ai-context/gerar.mjs`).

## Alertas

| Alerta | Quando aparece |
|---|---|
| `tabela_sem_rls` | tabela sem RLS ligado |
| `rls_sem_policy` | RLS ligado e nenhuma policy (nega tudo para anon/authenticated; service_role passa por cima) |
| `rpc_chamada_sem_funcao_no_banco` | `.rpc('x')` no código sem função `x` no banco — erro na primeira vez que a tela roda |
| `rpc_exposta_sem_chamada_no_codigo` | função executável por anon/authenticated que nenhum código chama |
| `fila_notificacao_travada` | entrega com `next_attempt_at` vencido há mais de 15 min (lead sem aviso ao comercial) |
| `fila_notificacao_com_erro` | códigos de erro de entrega nos últimos 7 dias |
| `remocao_storage_atrasada` | arquivo na fila de remoção há mais de 48 h (`LIMIARES.remocaoStorageHoras`) |
| `cron_falhando` | job ativo com ≥ 5% de falha em 7 dias |
| `cron_sem_execucao` | job ativo de agenda diária sem nenhuma execução em 24 h |
| `cron_parado` | hora com mais da metade das execuções falhando |
| `historico_cron_sem_limpeza` | mais de 50 mil linhas com mais de 7 dias em `cron.job_run_details` |

`tabelas_orfas` = 0 linhas + não citada por função/view do banco + nenhum `.from()` no código.
No site o app não usa `.from()` em tabela (tudo passa por RPC), então `citada_no_banco` é o sinal que
pesa: uma tabela só aparece como órfã se nem o banco nem o código a mencionam.

## Como rodar

```bash
# 1) Com token (é o que o CI faz): Management API, POST /database/query/read-only
SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs

# 2) Sessão de agente sem token: rodar banco.sql no MCP do projeto do site, salvar a resposta e
node scripts/inventario/gerar-banco.mjs --entrada /caminho/resposta.json
```

Aceita a resposta crua do MCP (`{"rows":[{"inventario":{…}}]}`), o envelope `tools/call` ou o objeto
direto. `SUPABASE_PROJECT_REF` só troca o projeto para teste: o catálogo canônico
(`doufsxqlfjyuvxuezpln`) é recusado sempre, e qualquer outro ref exige
`INVENTARIO_PERMITIR_OUTRO_PROJETO=1`.

**Prova de origem** antes de gravar (duas, independentes do arquivo de entrada): ≥ 90% das tabelas
declaradas em `site-supabase/supabase/migrations` presentes na resposta, e o ledger remoto com as
migrations recentes do repo e total dentro de 10% — a mesma invariante que o `release.yml` cobra antes
de promover. Divergência real de ledger: `docs/RUNBOOK_RECONCILIACAO_LEDGER.md`.

**Guard de segredo:** a saída é recusada se tiver cara de credencial (`Bearer …`, JWT, `sb_secret_`).
O `banco.sql` nunca devolve o `command` de um job do pg_cron (pode ter URL/token) — só o nome das
funções chamadas — nem destinatário ou payload de notificação.

## Objetos opcionais

`pg_cron` e `supabase_migrations.schema_migrations` podem não existir. Um nome de tabela inexistente
quebra a consulta **na análise**, antes de qualquer `to_regclass`, então os dois blocos passam por
`query_to_xml` (o texto só é executado quando o `CASE` escolhe o ramo) e voltam em base64, para o XML
não reescapar `&`/`<` dentro do JSON. Sem pg_cron, `cron.disponivel` é `false` e os alertas de cron
não aparecem.

## Entrega

`.github/workflows/inventario-estado-semanal.yml` roda segunda 10:23 UTC, regera o arquivo e abre PR
em `automation/inventario-estado` **se o conteúdo mudou** — `mudou-conteudo.mjs` compara o JSON sem os
carimbos de data e sem a telemetria de janela rolante (taxas de 7 dias, contagens da fila), inclusive
dentro do texto dos alertas. Nunca faz push direto na main. O PR fica aberto para revisão: mergear na
main dispara o `release.yml` (build + promoção).

## Testes

```bash
npm run test:inventario      # node --test tests/inventario-estado.node.mjs
```

19 casos nas funções puras (`extrairInventario`, `conferirOrigem`, `montarInventario`, `cruzarRpcs`,
`contarUsoNoCodigo`, `contarRpcNoCodigo`, `rodaTodoDia`, `semCarimbos`, `mudou`), sem banco, rede nem
credencial. O `banco.sql` foi validado contra um PostgreSQL descartável com as 21 tabelas das
migrations deste repo, com e sem `pg_cron`/ledger.
