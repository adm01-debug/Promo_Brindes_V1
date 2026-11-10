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
| `rpc_chamada_sem_funcao_no_banco` | `.rpc('x')` ou `/rest/v1/rpc/x` no código sem função `x` no banco — erro na primeira vez que a tela roda |
| `rpc_exposta_sem_chamada_no_codigo` | função executável por anon/authenticated que nenhum código chama (nem `.rpc('x')` no front, nem `/rest/v1/rpc/x` em `api/`) |
| `fila_notificacao_travada` | entrega que ainda vai ser tentada e passou do prazo há mais de 15 min: `pending`/`failed` com `next_attempt_at` vencido, ou `processing` com o lease vencido. Estado final (`sent`, `cancelled`, `exhausted`) não conta |
| `fila_notificacao_esgotada` | entrega em `exhausted`: as tentativas acabaram e a notificação nunca saiu |
| `fila_notificacao_com_erro` | códigos de erro de entrega nos últimos 7 dias. `last_error_code` é texto livre no banco: o que não tem forma de código (`^[A-Za-z][A-Za-z0-9_.:-]{0,79}$`) sai somado em `fora_do_padrao`, para mensagem com e-mail/telefone de lead nunca entrar no repo |
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
direto. `--saida <arquivo>` grava em outro lugar (teste/inspeção) e `--help` mostra o uso; argumento
desconhecido é erro. Exit `0` = gravado; `2` = argumento ou entrada inválida, consulta falhou ou saída
com credencial — nesse caso nada é gravado (a gravação é atômica: arquivo inteiro ou nada).

**Alvo, falha fechada.** `SUPABASE_PROJECT_REF` só troca o projeto para teste: o catálogo canônico
(`doufsxqlfjyuvxuezpln`) é recusado sempre (em qualquer caixa), o que não tem formato de ref é
recusado, e qualquer outro ref exige `INVENTARIO_PERMITIR_OUTRO_PROJETO=1`. `SUPABASE_API_URL` só
aceita `https://api.supabase.com` ou um servidor local de teste (`127.0.0.1`/`localhost`): o token não
é enviado a outro host.

**Rede.** Timeout de 120 s por tentativa e até 3 tentativas, só para o que é transitório (rede,
timeout, HTTP 408/425/429/5xx); 400/401/403/404 falham na hora com a causa provável. O corpo da
resposta de erro nunca é repassado.

**Resposta parcial é recusada inteira.** Seção faltando ou malformada (`cron: {}`, `fila: null`…)
derruba a execução em vez de virar "não existe". O mesmo vale para resposta lida por um papel sujeito
a RLS (`resumo.leitura_filtrada_por_rls` > 0): as contagens e as filas sairiam 0 falsos sem erro
nenhum.

**Prova de origem** antes de gravar (duas, independentes do arquivo de entrada): ≥ 90% das tabelas
declaradas em `site-supabase/supabase/migrations` presentes na resposta, e o ledger remoto com as
migrations recentes do repo e total dentro de 10% — a mesma invariante que o `release.yml` cobra antes
de promover. Divergência real de ledger: `docs/RUNBOOK_RECONCILIACAO_LEDGER.md`.

**Guard de segredo:** a saída é recusada se tiver cara de credencial (`Bearer …`, JWT, `sb_secret_`,
`sbp_…`, URL de banco com senha) ou o próprio `SUPABASE_ACCESS_TOKEN`; nenhuma mensagem de erro sai
com o token dentro. O `banco.sql` nunca devolve o `command` de um job do pg_cron (pode ter URL/token) —
só o nome das funções chamadas — nem destinatário ou payload de notificação.

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

`mudou-conteudo.mjs [arquivo...]` imprime só `true` ou `false` e sai com `0`. Caminhos são relativos à
raiz do repo, de qualquer pasta. Arquivo novo ou apagado é `true`; ausente dos dois lados é `false`;
espaço, fim de linha e ordem de chave não contam; ordem de lista conta. Se não dá para decidir, nada
sai no stdout: argumento desconhecido sai com `2`, git que não roda sai com `1`.

## Testes

```bash
npm run test:inventario                              # node --test tests/inventario-estado.node.mjs
node --test tests/inventario-banco-sql.node.mjs      # banco.sql num PostgreSQL descartável
```

`tests/inventario-estado.node.mjs`: 55 casos, sem banco, rede externa nem credencial — funções puras
(`extrairInventario`, `conferirOrigem`, `montarInventario`, `cruzarRpcs`, `contarUsoNoCodigo`,
`contarRpcNoCodigo`, `rodaTodoDia`, `semCarimbos`, `mudou`, `consultarApi` com `fetch` falso), os dois
CLIs (API falsa em `127.0.0.1`, repositório git descartável) e a guarda estática do `banco.sql`: uma
consulta só, nenhuma palavra de escrita, só função de leitura da lista, nenhuma coluna com dado de
lead, toda lista com `ORDER BY`.

`tests/inventario-banco-sql.node.mjs`: 8 casos que rodam o `banco.sql` de verdade, em transação
somente leitura, num PostgreSQL descartável com as migrations deste repo — com e sem `pg_cron`/ledger,
papel com e sem `BYPASSRLS`, fila com estados finais, nomes com aspas/acento/`$`/parêntese. Precisa de
`initdb`/`pg_ctl`/`psql` na máquina (`PGBIN` escolhe o diretório); sem eles os casos são pulados.
