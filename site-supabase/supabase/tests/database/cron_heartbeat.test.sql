-- F-87: heartbeat dos crons e o vigia independente.
--
-- O que precisa ser verdade: (1) a tabela nasce com uma linha por cron e sem
-- execucao registrada, para o primeiro check nao confundir "instalado agora" com
-- "atrasado"; (2) a RPC de registro aceita so os tres nomes e marca atraso
-- depois da janela esperada mais a tolerancia; (3) nenhuma das duas RPCs e
-- executavel por anon ou authenticated.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

-- === Estrutura ===================================================================

select has_table('site_private', 'cron_heartbeats', 'tabela de heartbeat existe');
select has_function('public', 'record_cron_heartbeat', array['text','boolean','text'], 'RPC de registro existe');
select has_function('public', 'check_cron_heartbeats', array[]::text[], 'RPC de verificacao existe');

select results_eq(
  $$select name from site_private.cron_heartbeats order by name$$,
  $$values ('commercial-alerts'::text), ('notifications'::text), ('retention'::text)$$,
  'a tabela nasce com os tres crons agendados em vercel.json'
);

select is(
  (select count(*)::int from site_private.cron_heartbeats where last_ok_at is not null or last_failed_at is not null),
  0::int,
  'nenhum cron comeca com execucao registrada'
);

-- === Isolamento ==================================================================

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'site_private.cron_heartbeats'::regclass),
  'heartbeat tem RLS habilitada e forcada'
);
select ok(not pg_catalog.has_table_privilege('anon', 'site_private.cron_heartbeats', 'select'), 'anon nao le o heartbeat');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.cron_heartbeats', 'select'), 'authenticated nao le o heartbeat');
select ok(not pg_catalog.has_function_privilege('anon', 'public.record_cron_heartbeat(text, boolean, text)', 'execute'), 'anon nao registra heartbeat');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.record_cron_heartbeat(text, boolean, text)', 'execute'), 'authenticated nao registra heartbeat');
select ok(not pg_catalog.has_function_privilege('anon', 'public.check_cron_heartbeats()', 'execute'), 'anon nao consulta o vigia');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.check_cron_heartbeats()', 'execute'), 'authenticated nao consulta o vigia');

-- === Nome invalido ==============================================================

select throws_ok(
  $$select public.record_cron_heartbeat('sitemap', true)$$,
  '22023', 'unknown_cron_name',
  'nome fora dos tres crons e recusado'
);

-- === Registro de sucesso e falha ================================================

select lives_ok(
  $$select public.record_cron_heartbeat('notifications', true)$$,
  'registra uma rodada bem-sucedida'
);

select is(
  (select consecutive_failures from site_private.cron_heartbeats where name = 'notifications'),
  0,
  'sucesso zera a sequencia de falhas'
);

select isnt(
  (select last_ok_at from site_private.cron_heartbeats where name = 'notifications'),
  null::timestamptz,
  'sucesso grava last_ok_at'
);

select lives_ok(
  $$select public.record_cron_heartbeat('retention', false, 'timeout')$$,
  'registra uma rodada com falha'
);

select is(
  (select consecutive_failures from site_private.cron_heartbeats where name = 'retention'),
  1,
  'falha incrementa a sequencia'
);

select is(
  (select status from public.check_cron_heartbeats() where name = 'retention'),
  'failing'::text,
  'cron que nunca teve sucesso e falhou aparece como failing'
);

select is(
  (select status from public.check_cron_heartbeats() where name = 'notifications'),
  'ok'::text,
  'cron com sucesso recente aparece como ok'
);

-- === Recem instalado nao e atraso ==============================================
-- Acabou de aplicar a migration: todas as linhas vem do seed e a ultima
-- atividade e `installed_at`. Nenhum cron deve aparecer como atrasado, senao o
-- primeiro vigia dispararia alerta falso em producao.

select is(
  (select count(*)::int from public.check_cron_heartbeats() where is_late),
  0,
  'nenhum cron conta como atrasado imediatamente apos a instalacao'
);

select is(
  (select status from public.check_cron_heartbeats() where name = 'commercial-alerts'),
  'never_ran'::text,
  'cron recem instalado aparece como nunca executado, nao como atrasado'
);

select is(
  (select seconds_since_activity <= (select expected_interval_seconds + 20 * 60 from public.check_cron_heartbeats() where name = 'commercial-alerts') from public.check_cron_heartbeats() where name = 'commercial-alerts'),
  true,
  'tempo sem atividade de cron recem instalado cabe na janela com tolerancia'
);

-- === Atraso por janela ==========================================================

-- Um cron que so executou na instalacao, ha 40 minutos, com intervalo de 5 e
-- tolerancia de 20, esta atrasado: 40 > 5 + 20. E o cenario de "a plataforma
-- parou de disparar". `installed_at` tambem recua porque a janela do
-- `never_ran` conta a partir dele — sem isso o cron ainda estaria "recem
-- instalado" e o atraso ficaria escondido.
update site_private.cron_heartbeats
   set installed_at = now() - interval '40 minutes',
       last_ok_at = now() - interval '40 minutes'
 where name = 'commercial-alerts';

select is(
  (select is_late from public.check_cron_heartbeats() where name = 'commercial-alerts'),
  true,
  'cron silencioso alem da tolerancia e marcado como atrasado'
);

select is(
  (select count(*)::int from public.check_cron_heartbeats() where is_late),
  1,
  'somente o cron atrasado conta como doente'
);

select is(
  (select status from public.check_cron_heartbeats() where name = 'notifications'),
  'ok'::text,
  'cron dentro da janela continua ok depois da atualizacao de outro'
);

select * from finish();
rollback;
