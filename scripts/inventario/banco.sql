-- Inventario do banco ISOLADO DO SITE (xlzmclcjdncjfdrjxclt), so leitura, para
-- inventario/estado/banco.json.
--
-- Uso (credencial viva):  SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
-- Uso (agente com MCP):   rodar este arquivo no MCP do projeto do site, salvar a resposta e
--                         node scripts/inventario/gerar-banco.mjs --entrada <arquivo.json>
--
-- Imprime UMA linha com UM JSON. So SELECT em catalogo e contagem de linhas; nada de texto
-- livre que possa carregar segredo: de cron.job sai so o nome das funcoes chamadas (nome
-- seguido de "("), nunca o `command` inteiro, que pode ter URL/cabecalho/token; da fila de
-- notificacao saem apenas contagens e codigos de erro, nunca destinatario ou payload.
-- Ordem de toda lista e explicita para o diff entre execucoes ser estavel.
--
-- Schemas: as tabelas do site vivem em `site_private`; `public` guarda as funcoes/views
-- chamadas pelo PostgREST (hoje sem tabela). Os dois sao inventariados.
--
-- pg_cron e o ledger de migrations sao OPCIONAIS: um nome de tabela inexistente quebra a
-- consulta ja na analise, antes de qualquer `to_regclass`. Por isso os dois blocos passam
-- por `query_to_xml`, que so executa o texto quando o CASE escolhe o ramo. O resultado volta
-- em base64 para o XML nao reescapar `&`/`<` dentro do JSON.

WITH
schemas AS (SELECT unnest(ARRAY['site_private', 'public']) AS nspname),
-- Linhas: count(*) exato quando a estimativa do planner (reltuples, persiste entre
-- reinicios) fica abaixo de 200 mil; acima disso, a estimativa. NAO usar
-- pg_stat_user_tables.n_live_tup: zera quando o servidor reinicia.
base AS (
  SELECT c.oid, n.nspname AS esquema, c.relname AS nome,
         c.relrowsecurity AS rls, c.relforcerowsecurity AS rls_forcado,
         c.reltuples, pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname IN (SELECT nspname FROM schemas) AND c.relkind IN ('r', 'p')
),
tabelas AS (
  SELECT b.*,
         b.reltuples < 200000 AS linhas_exatas,
         CASE WHEN b.reltuples < 200000
              THEN (xpath('/row/n/text()',
                          query_to_xml(format('SELECT count(*) AS n FROM %I.%I', b.esquema, b.nome),
                                       false, true, '')))[1]::text::bigint
              ELSE b.reltuples::bigint END AS linhas
    FROM base b
),
corpos AS (  -- tudo no banco que pode citar uma tabela: funcoes e views dos schemas do site
  SELECT p.prosrc AS txt
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN (SELECT nspname FROM schemas) AND p.prokind IN ('f', 'p')
  UNION ALL
  SELECT pg_get_viewdef(c.oid)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname IN (SELECT nspname FROM schemas) AND c.relkind IN ('v', 'm')
),
policies AS (
  SELECT schemaname AS esquema, tablename AS nome, count(*)::int AS n
    FROM pg_policies WHERE schemaname IN (SELECT nspname FROM schemas) GROUP BY 1, 2
),
gatilhos AS (
  SELECT t.tgrelid AS oid, count(*)::int AS n FROM pg_trigger t WHERE NOT t.tgisinternal GROUP BY 1
),
indices AS (
  SELECT i.indrelid AS oid, count(*)::int AS n FROM pg_index i GROUP BY 1
),
-- Bloco do pg_cron inteiro em texto, executado so quando cron.job existe.
cron_sql AS (
  SELECT $cron$
    WITH execucoes AS (
      SELECT d.jobid, d.status, d.start_time, d.end_time
        FROM cron.job_run_details d
       WHERE d.start_time > now() - interval '7 days'
    ),
    por_job AS (
      SELECT e.jobid,
             count(*) FILTER (WHERE e.start_time > now() - interval '24 hours')::int AS exec_24h,
             count(*) FILTER (WHERE e.start_time > now() - interval '24 hours' AND e.status = 'failed')::int AS falhas_24h,
             count(*)::int AS exec_7d,
             count(*) FILTER (WHERE e.status = 'failed')::int AS falhas_7d,
             max(e.start_time) FILTER (WHERE e.status = 'failed') AS ultima_falha,
             round(max(extract(epoch FROM e.end_time - e.start_time)) FILTER (WHERE e.status = 'succeeded'))::int AS duracao_max_s_7d
        FROM execucoes e GROUP BY e.jobid
    ),
    por_hora AS (
      SELECT date_trunc('hour', e.start_time) AS hora, count(*)::int AS execucoes,
             count(*) FILTER (WHERE e.status = 'failed')::int AS falhas
        FROM execucoes e GROUP BY 1
    )
    SELECT encode(convert_to(jsonb_build_object(
      'disponivel', true,
      'jobs', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'nome', j.jobname,
                 'agenda', j.schedule,
                 'ativo', j.active,
                 'chama', (SELECT coalesce(jsonb_agg(DISTINCT m[1] ORDER BY m[1]), '[]'::jsonb)
                             FROM regexp_matches(j.command,
                                  '((?:public|site_private|net|cron)\.[a-z_0-9]+)\s*\(', 'g') AS m),
                 'execucoes_24h', coalesce(pj.exec_24h, 0),
                 'falhas_24h', coalesce(pj.falhas_24h, 0),
                 'execucoes_7d', coalesce(pj.exec_7d, 0),
                 'falhas_7d', coalesce(pj.falhas_7d, 0),
                 'taxa_falha_7d_pct', CASE WHEN coalesce(pj.exec_7d, 0) = 0 THEN 0
                                           ELSE round(100.0 * pj.falhas_7d / pj.exec_7d, 1) END,
                 'ultima_falha', to_char(pj.ultima_falha AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                 'duracao_max_s_7d', pj.duracao_max_s_7d
               ) ORDER BY j.jobname), '[]'::jsonb)
          FROM cron.job j LEFT JOIN por_job pj ON pj.jobid = j.jobid
      ),
      -- Hora com mais da metade das execucoes falhando: o cron ficou parado naquela hora.
      'horas_paradas_7d', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'hora', to_char(h.hora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24":00Z"'),
                 'execucoes', h.execucoes, 'falhas', h.falhas) ORDER BY h.hora), '[]'::jsonb)
          FROM por_hora h WHERE h.falhas * 2 > h.execucoes
      ),
      'historico', jsonb_build_object(
        'linhas', (SELECT count(*) FROM cron.job_run_details),
        'mais_de_7_dias', (SELECT count(*) FROM cron.job_run_details
                            WHERE start_time <= now() - interval '7 days')
      )
    )::text, 'UTF8'), 'base64') AS b64
  $cron$ AS txt
),
cron_bloco AS (
  SELECT CASE
    WHEN to_regclass('cron.job') IS NULL OR to_regclass('cron.job_run_details') IS NULL
      THEN jsonb_build_object('disponivel', false, 'jobs', '[]'::jsonb,
                              'horas_paradas_7d', '[]'::jsonb,
                              'historico', jsonb_build_object('linhas', 0, 'mais_de_7_dias', 0))
    ELSE convert_from(
           decode(replace((xpath('/row/b64/text()',
                                 query_to_xml((SELECT txt FROM cron_sql), false, true, '')))[1]::text,
                          E'\n', ''), 'base64'), 'UTF8')::jsonb
  END AS j
),
-- Ledger de migrations: so existe quando o projeto recebeu `supabase db push`.
ledger AS (
  SELECT CASE
    WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL
      THEN jsonb_build_object('registros', 0, 'versao_max', NULL)
    ELSE convert_from(
           decode(replace((xpath('/row/b64/text()',
                                 query_to_xml($l$
                                   SELECT encode(convert_to(jsonb_build_object(
                                     'registros', count(*),
                                     'versao_max', max(version)
                                   )::text, 'UTF8'), 'base64') AS b64
                                     FROM supabase_migrations.schema_migrations
                                 $l$, false, true, '')))[1]::text,
                          E'\n', ''), 'base64'), 'UTF8')::jsonb
  END AS j
)
SELECT jsonb_build_object(
  'format_version', 1,
  'medido_em', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),

  'resumo', jsonb_build_object(
    'postgres', current_setting('server_version'),
    'schemas', (SELECT jsonb_agg(nspname ORDER BY nspname) FROM schemas),
    'tabelas', (SELECT count(*) FROM tabelas),
    'tabelas_sem_rls', (SELECT count(*) FROM tabelas WHERE NOT rls),
    'policies', (SELECT coalesce(sum(n), 0) FROM policies),
    'funcoes', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname IN (SELECT nspname FROM schemas) AND p.prokind IN ('f', 'p')),
    'views', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname IN (SELECT nspname FROM schemas) AND c.relkind IN ('v', 'm')),
    'triggers', (SELECT coalesce(sum(g.n), 0) FROM gatilhos g JOIN tabelas t ON t.oid = g.oid),
    'cron_jobs', (SELECT jsonb_array_length(j -> 'jobs') FROM cron_bloco),
    'cron_ativos', (SELECT count(*) FROM cron_bloco, jsonb_array_elements(j -> 'jobs') e
                     WHERE (e ->> 'ativo')::boolean),
    'ledger_registros', (SELECT (j ->> 'registros')::bigint FROM ledger),
    'ledger_versao_max', (SELECT j ->> 'versao_max' FROM ledger),
    'extensoes', (SELECT jsonb_object_agg(extname, extversion ORDER BY extname) FROM pg_extension),
    'max_connections', current_setting('max_connections')::int,
    'tamanho_bytes', pg_database_size(current_database())
  ),

  'tabelas', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome', t.nome,
             'esquema', t.esquema,
             'rls', t.rls,
             'rls_forcado', t.rls_forcado,
             'policies', coalesce(p.n, 0),
             'triggers', coalesce(g.n, 0),
             'indices', coalesce(ix.n, 0),
             'linhas', t.linhas,
             'linhas_exatas', t.linhas_exatas,
             'bytes', t.bytes,
             'citada_no_banco', EXISTS (SELECT 1 FROM corpos c WHERE c.txt ~ ('\m' || t.nome || '\M'))
           ) ORDER BY t.esquema, t.nome), '[]'::jsonb)
      FROM tabelas t
      LEFT JOIN policies p ON p.esquema = t.esquema AND p.nome = t.nome
      LEFT JOIN gatilhos g ON g.oid = t.oid
      LEFT JOIN indices ix ON ix.oid = t.oid
  ),

  -- Funcoes chamaveis pelo PostgREST: no site, o app NUNCA fala com tabela direto — todo
  -- acesso passa por RPC em `public` (SECURITY DEFINER). Por isso a lista de funcoes, com
  -- quem pode executar, e o que permite cruzar com os `.rpc('...')` do codigo.
  'funcoes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome', p.proname,
             'esquema', n.nspname,
             'security_definer', p.prosecdef,
             'volatilidade', CASE p.provolatile WHEN 'i' THEN 'immutable'
                                                WHEN 's' THEN 'stable' ELSE 'volatile' END,
             -- CASE e nao AND: has_function_privilege estoura com role inexistente (um
             -- Postgres descartavel de teste nao tem anon/authenticated). null = role ausente.
             'executa_anon', CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
                                  THEN has_function_privilege('anon', p.oid, 'EXECUTE') END,
             'executa_authenticated', CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
                                           THEN has_function_privilege('authenticated', p.oid, 'EXECUTE') END,
             'search_path_fixo', p.proconfig IS NOT NULL
                                 AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                              WHERE c LIKE 'search\_path=%')
           ) ORDER BY n.nspname, p.proname), '[]'::jsonb)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname IN (SELECT nspname FROM schemas) AND p.prokind IN ('f', 'p')
  ),

  'cron', (SELECT j FROM cron_bloco),

  -- Dominio do site: a fila que avisa o comercial de um lead novo e a fila de remocao de
  -- arquivos da retencao. Só contagens e codigo de erro — nunca destinatario nem payload.
  -- As duas tabelas vem das migrations deste repo (site-supabase/supabase/migrations):
  -- se faltarem, a consulta falha de proposito, porque o site nao funcionaria sem elas.
  'fila', jsonb_build_object(
    'notificacao_por_status', (
      SELECT coalesce(jsonb_object_agg(status, n ORDER BY status), '{}'::jsonb)
        FROM (SELECT status, count(*)::int AS n
                FROM site_private.notification_deliveries GROUP BY status) s
    ),
    'notificacao_vencidas', (
      SELECT count(*)::int FROM site_private.notification_deliveries
       WHERE status NOT IN ('sent', 'delivered')
         AND next_attempt_at <= now() - interval '15 minutes'
    ),
    'notificacao_tentativas_max', (
      SELECT coalesce(max(attempts), 0)::int FROM site_private.notification_deliveries
    ),
    'notificacao_erros_7d', (
      SELECT coalesce(jsonb_object_agg(codigo, n ORDER BY codigo), '{}'::jsonb)
        FROM (SELECT coalesce(last_error_code, 'sem_codigo') AS codigo, count(*)::int AS n
                FROM site_private.notification_deliveries
               WHERE last_error_at > now() - interval '7 days' GROUP BY 1) s
    ),
    'remocao_storage_pendente', (
      SELECT count(*)::int FROM site_private.storage_deletion_queue
    ),
    'remocao_storage_mais_antiga', (
      SELECT to_char(min(queued_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        FROM site_private.storage_deletion_queue
    )
  )
) AS inventario;
