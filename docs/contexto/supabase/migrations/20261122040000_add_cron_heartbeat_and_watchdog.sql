-- F-87: vigia independente dos tres crons do site.
--
-- Estado anterior (auditado): cada cron so alertava no proprio caminho de erro
-- (`retention_cron_failed`, `notification_cron_failed`,
-- `commercial_alerts_cron_failed`). Se a Vercel parasse de disparar o cron, se o
-- `CRON_SECRET` virasse outro ou se a funcao estourasse o maxDuration antes do
-- `try`, ninguem sabia: o silencio de um cron e indistinguivel de "nada a fazer".
-- Nao existia nenhuma linha de heartbeat/lastRunAt no repo.
--
-- Esta migration entrega o lado de banco do vigia:
--   1. site_private.cron_heartbeats — uma linha por cron, com ultima execucao
--      bem-sucedida, ultima falha e motivo.
--   2. public.record_cron_heartbeat(name, ok, detail) — chamada por cada cron no
--      fim da rodada (sucesso e falha).
--   3. public.check_cron_heartbeats() — devolve os crons atrasados segundo o
--      intervalo esperado de cada um, com tolerancia. O verificador externo
--      (/api/cron-watchdog) chama esta funcao.

create table if not exists site_private.cron_heartbeats (
  name text primary key check (name in ('retention', 'notifications', 'commercial-alerts')),
  installed_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_failed_at timestamptz,
  last_failure_detail text check (last_failure_detail is null or length(last_failure_detail) <= 240),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  updated_at timestamptz not null default now()
)

comment on table site_private.cron_heartbeats is
  'Heartbeat dos crons do site (F-87). Uma linha por cron agendado em vercel.json; escrita so pela RPC record_cron_heartbeat.'

alter table site_private.cron_heartbeats enable row level security

alter table site_private.cron_heartbeats force row level security

revoke all on site_private.cron_heartbeats from public, anon, authenticated

grant select on site_private.cron_heartbeats to service_role, site_api

insert into site_private.cron_heartbeats (name)
values ('retention'), ('notifications'), ('commercial-alerts')
on conflict (name) do nothing

create or replace function public.record_cron_heartbeat(
  p_name text,
  p_ok boolean,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_name not in ('retention', 'notifications', 'commercial-alerts') then
    raise exception 'unknown_cron_name' using errcode = '22023';
  end if;
  if p_ok is null then
    raise exception 'invalid_cron_outcome' using errcode = '22023';
  end if;

  insert into site_private.cron_heartbeats (name) values (p_name)
  on conflict (name) do nothing;

  update site_private.cron_heartbeats
     set last_ok_at = case when p_ok then now() else last_ok_at end,
         last_failed_at = case when p_ok then last_failed_at else now() end,
         last_failure_detail = case when p_ok then null else left(coalesce(p_detail, 'unknown'), 240) end,
         consecutive_failures = case when p_ok then 0 else consecutive_failures + 1 end,
         updated_at = now()
   where name = p_name;
end;
$$

comment on function public.record_cron_heartbeat(text, boolean, text) is
  'Grava o desfecho de uma rodada de cron (F-87). Chamada com a credencial de servico no fim de cada execucao.'

revoke all on function public.record_cron_heartbeat(text, boolean, text) from public, anon, authenticated

grant execute on function public.record_cron_heartbeat(text, boolean, text) to service_role, site_api

create or replace function public.check_cron_heartbeats()
returns table (
  name text,
  status text,
  last_ok_at timestamptz,
  last_failed_at timestamptz,
  last_failure_detail text,
  consecutive_failures integer,
  expected_interval_seconds integer,
  seconds_since_activity bigint,
  is_late boolean
)
language sql
security definer
set search_path = ''
as $$
  with esperado(name, intervalo, tolerancia_minutos) as (
    values
      ('retention', 24 * 60 * 60, 180),
      ('notifications', 15 * 60, 30),
      ('commercial-alerts', 5 * 60, 20)
  ),
  base as (
    select h.name,
           h.installed_at,
           h.last_ok_at,
           h.last_failed_at,
           h.last_failure_detail,
           h.consecutive_failures,
           e.intervalo,
           e.tolerancia_minutos,
           greatest(
             coalesce(h.last_ok_at, h.installed_at),
             coalesce(h.last_failed_at, h.installed_at)
           ) as ultima_atividade
      from site_private.cron_heartbeats h
      join esperado e on e.name = h.name
  )
  select b.name,
         -- 'never_ran' vale enquanto a tolerancia pos-instalacao nao vence: antes disso
         -- o cron simplesmente ainda nao teve a primeira janela, e acusa-lo seria alarme
         -- falso logo apos o deploy da migration.
         case
           when b.last_ok_at is null and b.last_failed_at is null
                and now() - b.installed_at <= make_interval(secs => b.intervalo + b.tolerancia_minutos * 60) then 'never_ran'
           when b.last_ok_at is null and b.last_failed_at is null then 'late'
           when b.last_failed_at is not null
                and (b.last_ok_at is null or b.last_failed_at > b.last_ok_at) then 'failing'
           else 'ok'
         end as status,
         b.last_ok_at,
         b.last_failed_at,
         b.last_failure_detail,
         b.consecutive_failures,
         b.intervalo,
         floor(extract(epoch from (now() - b.ultima_atividade)))::bigint,
         (now() - b.ultima_atividade) > make_interval(secs => b.intervalo + b.tolerancia_minutos * 60)
  from base b;
$$

comment on function public.check_cron_heartbeats() is
  'Devolve o estado de cada cron do site e se ele esta atrasado segundo o intervalo esperado mais a tolerancia (F-87).'

revoke all on function public.check_cron_heartbeats() from public, anon, authenticated

-- O cutover para o JWT site_api (docs/RUNBOOK_SITE_API_CUTOVER.md) troca a credencial
-- usada pelos crons; sem estes grants o vigia responderia 503 em toda rodada.
grant execute on function public.check_cron_heartbeats() to service_role, site_api
