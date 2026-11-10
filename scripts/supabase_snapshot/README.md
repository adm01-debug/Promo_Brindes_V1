# supabase-snapshot

Mantém um retrato completo do banco **isolado do site** (`xlzmclcjdncjfdrjxclt` — leads, área do
cliente) para agentes de IA lerem **antes** de qualquer tarefa ou planejamento que toque banco, RLS,
functions, cron ou storage.

O catálogo canônico (`doufsxqlfjyuvxuezpln`) **não** é coletado aqui: é externo, somente leitura por
views e sem migrations deste repo (`docs/RUNBOOK_BANCO_PRINCIPAL.md`).

## Onde está o resultado (neste repo)

A main tem branch protection, então o snapshot **não** é comitado na main: o job `banco` de
`.github/workflows/contexto.yml` roda a cada 10 min e publica em `docs/contexto/supabase/` da branch
**`contexto`** (junto com `codigo/` e `regras/`; índice em `docs/contexto/00-INDEX.md`). Só há commit
quando algo mudou.

Como ler, sem trocar de branch:

```sh
git fetch origin contexto
git show origin/contexto:docs/contexto/supabase/README.md          # protocolo + resumo
git show origin/contexto:docs/contexto/supabase/tables/site_private/<tabela>.md
git show origin/contexto:docs/contexto/supabase/lints.md           # antes de mexer em RLS/functions/índices
```

Ou por URL (sem clone):
`https://raw.githubusercontent.com/adm01-debug/Promo_Brindes_V1/contexto/docs/contexto/supabase/README.md`.

Última coleta concluída publicada: `docs/contexto/supabase/manifest.json` → `gerado_em` (UTC).
O manifest também informa `erros` e `carried`; uma coleta recente pode ser parcial. Detalhes em
`errors.md`. O timestamp não entra em `snapshot.json` nem nos fingerprints: consultar um banco sem
mudanças renova o frescor sem inventar uma alteração estrutural no `CHANGELOG.md`.

Neste repo `schema.sql` e `types.ts` estão desligados no workflow (`PGDUMP=false`, `GEN_TYPES=false`):
o `pg_dump` do runner é mais antigo que o servidor e os tipos já vêm de `npm run db:site:types`
(`src/types/site-database.types.ts`).

## Secret necessário — `SITE_SUPABASE_DB_URL`

**Enquanto o secret não existir, o job `banco` sai verde com aviso e a pasta `supabase/` fica como
está** (no dispatch manual ele falha, para a pessoa ver). Nada mais do contexto é afetado: `codigo/` e
`regras/` continuam sendo publicados.

Settings → Secrets and variables → Actions → `SITE_SUPABASE_DB_URL`, com estas exigências:

1. **Session pooler, não conexão direta.** O host direto `db.<ref>.supabase.co` é só IPv6 e o runner do
   GitHub não tem IPv6 → falha na conexão. Use o "Session pooler" do dashboard:
   `postgresql://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres`.
2. **Projeto do site (`xlzmclcjdncjfdrjxclt`), nunca o catálogo canônico.** O nome do secret é
   `SITE_SUPABASE_DB_URL` justamente para não ser confundido com o banco de produtos.
3. **Usuário `postgres` (recomendado).** O `cron.job`, `cron.job_run_details`, `storage.buckets`,
   `storage.objects` e `auth.users` têm RLS; um role read-only comum enxergaria zero linhas. O
   `postgres` do Supabase tem `BYPASSRLS`. Cada seção roda em transação `READ ONLY` — mesmo com
   `postgres` nada é escrito.
4. **Senha com caractere especial precisa de percent-encoding** na URI (`@` → `%40`, `:` → `%3A`,
   `/` → `%2F`, `?` → `%3F`, `#` → `%23`, espaço → `%20`, `%` → `%25`). URI ambígua é recusada antes de
   chegar ao driver (exit 2), sem ecoar o valor: a mensagem de erro do libpq citaria pedaços da senha.
5. Se preferir um role separado (as seções com RLS — cron, storage, auth — saem como **NÃO VERIFICADO**
   em `errors.md`, nunca como "vazio"; o resto é coletado, inclusive os grants):

```sql
create role snapshot_reader login password '<senha-forte>';
grant pg_read_all_data to snapshot_reader;           -- leitura de todos os schemas
grant usage on schema cron, vault, storage, auth, supabase_migrations to snapshot_reader;
grant pg_read_all_stats to snapshot_reader;          -- pg_stat_statements/pg_stat_activity completos
```

`SUPABASE_ACCESS_TOKEN` (Management API) é opcional e acrescenta os metadados de projeto; não substitui
a `SITE_SUPABASE_DB_URL`.

### Guarda contra o banco errado

O script é genérico e não conhece os refs deste repo; a trava fica em duas variáveis que o **workflow**
define (fora do secret, para que trocar o secret não desligue a trava):

| Var | Efeito |
|---|---|
| `SNAPSHOT_EXPECTED_REF` | ref que a conexão **deve** usar (`postgres.<ref>@…pooler…`, `db.<ref>.supabase.co` ou `options=reference=<ref>`). Outro projeto, ou conexão em que o ref não aparece, aborta com exit 2 antes de conectar |
| `SNAPSHOT_FORBIDDEN_REFS` | refs proibidos, separados por vírgula. Se a conexão ou `SUPABASE_PROJECT_REF` citar um deles, aborta com exit 2 |

Para este repo: `SNAPSHOT_EXPECTED_REF=xlzmclcjdncjfdrjxclt` e `SNAPSHOT_FORBIDDEN_REFS=doufsxqlfjyuvxuezpln`
no bloco `env` do job `banco`. Sem elas o script só bloqueia quando `SUPABASE_PROJECT_REF` diverge do ref
da conexão. O ref coletado sai em `manifest.json` → `projeto`, no README do snapshot e no log
(`projeto da conexão: …`), para qualquer leitor conferir de qual banco é o retrato.

## O que é coletado

| Fonte | O que entra |
|---|---|
| Postgres (catálogo) | schemas (+USAGE das roles da API), tabelas (RLS on/forced, partições, replica identity), colunas (tipo, default, identity/generated, enum, comentário), constraints (PK/FK/UNIQUE/CHECK com ON DELETE/UPDATE e referências reversas), índices (método, colunas, predicado), views + materialized (security_invoker, dependências), functions/procedures (corpo, security definer, search_path, quem pode executar via RPC), triggers (timing/eventos), policies RLS (inclui `storage` e `realtime.messages`), enums/domains/composites, extensões, sequences, grants (tabela, coluna, sequence, **default privileges**), roles (+`rolconfig`) |
| Supabase | `cron.job`, `pgmq` (filas), `supabase_migrations.schema_migrations` (com SQL), `storage.buckets`, `vault.secrets` (só nomes), Database Webhooks, realtime publications, foreign servers (credenciais redigidas) |
| Lints (`lints.md`) | RLS desabilitado / sem policies, tabela sem PK, FK sem índice, SECURITY DEFINER sem `search_path`, view em `public` sem `security_invoker`, função chamável por `anon`, extensão em `public`, policy com `auth.uid()` sem `(select …)`, tabela no Realtime sem REPLICA IDENTITY FULL |
| Relacionamentos | todas as FKs + diagrama ER Mermaid |
| Referências a cada função | referências estáticas (`.rpc('fn')` ou `fn(` em `src/`, `api/`, `shared/`, migrations ativas, scripts), jobs do pg_cron, triggers, outras funções e views |
| Management API (opcional) | nomes dos secrets, auth (providers, hooks, config), PostgREST (schemas expostos, max_rows), Postgres/pooler/storage config, network/SSL, branches, PITR/backups — segredos redigidos |
| Métricas voláteis (`stats.*`, `cron-runs.md`) | tamanho por tabela/schema, linhas e scans (aproximados), índices nunca usados, storage por bucket, auth (agregados), filas, top queries do `pg_stat_statements` (normalizadas), conexões, saúde dos serviços |

Nunca sai: linha de tabela, dado de usuário, valor de secret/chave/senha, connection string — nem nos
arquivos, nem no log, nem em mensagem de erro (toda mensagem de driver/subprocess passa por `sanitize`
antes de ser impressa ou gravada). O job ainda roda um guard de segredos na saída antes de publicar.

Texto livre que vem do banco e é publicado (não é amostra de linha, mas pode conter o que alguém
escreveu ali): corpo de functions/views, comando dos jobs do pg_cron, SQL das migrations aplicadas,
comentários de objetos, nomes de buckets/secrets do vault e a mensagem de retorno dos jobs
(`cron-runs.md`, com e-mails e sequências de 10+ dígitos redigidos). Tudo passa pelo `scrub` de segredos.

## Variáveis opcionais (no workflow, bloco `env`)

| Var | Default | Efeito |
|---|---|---|
| `SNAPSHOT_DIR` | `docs/supabase` (no workflow: `docs/contexto/supabase`) | pasta de saída |
| `SNAPSHOT_EXPECTED_REF` | vazio | ref obrigatório da conexão (ver "Guarda contra o banco errado") |
| `SNAPSHOT_FORBIDDEN_REFS` | vazio | refs proibidos, separados por vírgula |
| `PGDUMP_SCHEMAS` | `public` | schemas do `schema.sql`, separados por vírgula |
| `GEN_TYPES` | `true` (aqui `false`) | gera `types.ts` via `npx supabase gen types` |
| `PGDUMP` | `true` (aqui `false`) | gera `schema.sql` via `pg_dump` (exige pg_dump ≥ versão do servidor) |
| `SNAPSHOT_EXCLUDE_SCHEMAS` | vazio | schemas extras a ignorar na introspecção |
| `SNAPSHOT_INCLUDE_SCHEMAS` | vazio | schemas internos do Supabase a forçar inclusão |
| `STAT_STATEMENTS_TOP` | `15` | consultas mais custosas em `stats.md` (0 desliga) |
| `CRON_RUNS_PER_JOB` | `3` | execuções recentes guardadas por job do pg_cron |
| `REPO_ROOT` | `.` | raiz do repo para cruzar funções × código (vazio desliga) |
| `CODE_SCAN_DIRS` | lista padrão (aqui `src,api,shared,site-supabase/supabase/migrations,scripts`) | pastas varridas na busca de chamadas |

## Comportamento

- Só há commit quando o conteúdo estrutural mudou. Métricas voláteis vivem em
  `stats.md`/`stats.json`/`cron-runs.md`; quando só elas mudam, o commit é limitado a 1 por hora
  (`VOLATILE_MIN_INTERVAL_MIN` no workflow).
- Schemas internos do Supabase (`auth`, `storage`, `realtime`, `extensions`, `graphql*`, `net`,
  `pgsodium`, `vault`…) ficam fora da introspecção geral; o que importa deles entra em seções
  dedicadas. Use `SNAPSHOT_INCLUDE_SCHEMAS` para forçar um deles.
- Uma seção que falha (ex.: sem permissão em `vault`) é reaproveitada da coleta anterior com aviso no
  topo do arquivo e dentro de cada `tables/<schema>/<tabela>.md` afetado — nunca gera "tudo removido"
  no CHANGELOG. Vale também para a Management API (queda, 401, 5xx).
- Seção que falha **sem** coleta anterior sai como **NÃO VERIFICADO** (`n/d` no resumo), nunca como
  "nenhum", "não instalada" ou "sem policies": vazio só é afirmado quando a consulta respondeu vazia.
- RLS não filtra a coleta em silêncio (`row_security = off`): sem `BYPASSRLS` a seção falha e vai para
  `errors.md`.
- `CHANGELOG.md` registra, a cada mudança, o que foi adicionado/removido/alterado por categoria.
- Falha em uma seção não derruba as outras: vai para `errors.md` e para o README. O job só falha se o
  banco inteiro não responder, se o push falhar 3 vezes, ou se o guard de segredos detectar algo.
- "Banco inteiro não responder" inclui o caso em que **nenhuma** seção estrutural respondeu e tudo viria
  da coleta anterior: sai com exit 1, não toca em nenhum arquivo e não renova `gerado_em`.
- Códigos de saída: `0` snapshot gravado (pode ser parcial); `1` banco inacessível, nenhuma seção
  coletada ou outra coleta gravando na mesma pasta; `2` configuração inválida (variável, connection
  string, ref errado, `SNAPSHOT_DIR`, driver ausente). Em `1` e `2` nada é sobrescrito e não há traceback.
- Somente leitura: cada seção roda em uma transação própria `READ ONLY` com `statement_timeout` 90s,
  `lock_timeout` 5s e `row_security = off`, todos locais à transação (`SET LOCAL`). Nada fica na sessão —
  por isso vale também no pooler em transaction mode e não contamina a conexão devolvida à aplicação.
  Depois da primeira consulta o Postgres recusa voltar a transação para leitura-escrita.
- Conexão com `prepare_threshold=None`: funciona na conexão direta e no pooler (session ou transaction).
  `pg_dump` exige session mode ou conexão direta.
- Cada arquivo é gravado por troca atômica (temporário + rename) e `manifest.json` é o último a ser
  escrito: uma coleta interrompida nunca deixa arquivo truncado nem `manifest.json` de coleta concluída.
- Duas coletas na mesma pasta: a segunda sai com exit 1 ("Outra coleta está gravando…") sem alterar nada.
- `concurrency` impede duas coletas simultâneas; commits levam `[skip ci]` e vão para a branch
  `contexto`, que a Vercel não builda.

## Rodar localmente

```bash
pip install -r scripts/supabase_snapshot/requirements.txt
export SUPABASE_DB_URL='postgresql://...'   # projeto do site
export SNAPSHOT_DIR=/tmp/snapshot-site      # fora do repo: a saída não é versionada na main
python3 scripts/supabase_snapshot/snapshot.py
python3 scripts/supabase_snapshot/snapshot.py --help   # variáveis, garantias e códigos de saída
```

`requirements.txt` fixa a versão exata do driver (`psycopg[binary]==…`): o job instala a dependência a
cada execução e tem o secret do banco no ambiente.

## Testes offline

```sh
npm run contexto:banco:test     # python3 scripts/supabase_snapshot/test_snapshot.py
```

Não exigem banco, rede, credenciais nem o pacote psycopg: a conexão é simulada. 148 casos cobrem a
preservação do SQL e dos metadados em coletas parciais, a ausência de arquivos anteriores, a recuperação
na coleta saudável seguinte, o frescor do manifest em UTC, a matriz de estatísticas (schemas fora do
`search_path`, extensão ausente, erros de catálogo/permissão/prazo, auth e storage independentes), a
transação `READ ONLY` por seção (e a ausência de qualquer comando de escrita no script), o não vazamento
de DSN/senha/token em log, arquivo e erro, a guarda de ref, seções com falha marcadas como NÃO
VERIFICADO, determinismo, escrita atômica, trava de pasta, `--help` e a Management API.

Mais 8 casos rodam contra um Postgres de verdade e ficam pulados sem a variável (o CI não tem banco):

```sh
SNAPSHOT_TEST_PG_URL='postgresql://postgres@127.0.0.1:5432/descartavel' \
  python3 scripts/supabase_snapshot/test_snapshot.py SnapshotLivePostgresTests
```

Use **só** um banco descartável: o teste cria e remove um schema e duas roles `snapshot_live_*`. Ele prova
o que dublê não prova — ordem das colunas de chaves compostas, grants vistos por um role de leitura,
RLS virando erro, escrita recusada dentro da coleta e ausência de dado de linha na saída.
