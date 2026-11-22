CREATE OR REPLACE FUNCTION public.check_cron_heartbeats()
 RETURNS TABLE(name text, status text, last_ok_at timestamp with time zone, last_failed_at timestamp with time zone, last_failure_detail text, consecutive_failures integer, expected_interval_seconds integer, seconds_since_activity bigint, is_late boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
