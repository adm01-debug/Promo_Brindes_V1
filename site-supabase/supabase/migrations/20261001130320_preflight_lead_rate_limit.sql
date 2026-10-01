-- Limita rajadas antes que a API consulte o catálogo canônico. Exclusivo do
-- Supabase isolado do site (xlzmclcjdncjfdrjxclt); nunca aplicar no Promo Gifts.
-- O limite transacional de create_site_* permanece como segunda camada.

alter table site_private.rate_limit_buckets
  drop constraint if exists rate_limit_buckets_request_kind_check;
alter table site_private.rate_limit_buckets
  add constraint rate_limit_buckets_request_kind_check
  check (request_kind in (
    'quote', 'contact', 'quote_preflight', 'contact_preflight', 'adjustment',
    'briefing_asset_verification', 'proposal_download'
  ));

create or replace function site_private.consume_rate_limit(
  p_request_kind text,
  p_identifier_hash text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if p_request_kind not in (
      'quote', 'contact', 'quote_preflight', 'contact_preflight', 'adjustment',
      'briefing_asset_verification', 'proposal_download'
    )
    or p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_window <= interval '0 seconds' then
    raise exception using errcode = '22023', message = 'invalid_rate_limit_input';
  end if;
  insert into site_private.rate_limit_buckets as bucket (
    request_kind, identifier_hash, window_started_at, request_count, updated_at
  ) values (p_request_kind, p_identifier_hash, now(), 1, now())
  on conflict (request_kind, identifier_hash) do update set
    request_count = case when bucket.window_started_at <= now() - p_window then 1 else bucket.request_count + 1 end,
    window_started_at = case when bucket.window_started_at <= now() - p_window then now() else bucket.window_started_at end,
    updated_at = now()
  returning request_count into v_count;
  if v_count > p_limit then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

create or replace function public.preflight_site_lead_request(
  p_request_kind text,
  p_identifier_hash text,
  p_client_request_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_already_persisted boolean;
begin
  if p_request_kind not in ('quote', 'contact')
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_client_request_id, '') !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$' then
    raise exception using errcode = '22023', message = 'invalid_lead_preflight_input';
  end if;

  if p_request_kind = 'quote' then
    select exists(
      select 1 from site_private.quote_requests request
      where request.client_request_id = p_client_request_id
    ) into v_already_persisted;
  else
    select exists(
      select 1 from site_private.contact_requests request
      where request.client_request_id = p_client_request_id
    ) into v_already_persisted;
  end if;

  -- Repetições já persistidas continuam idempotentes e não gastam o bucket.
  if v_already_persisted then return false; end if;

  perform site_private.consume_rate_limit(
    p_request_kind || '_preflight',
    p_identifier_hash,
    case when p_request_kind = 'quote' then 8 else 12 end,
    interval '15 minutes'
  );
  return true;
end;
$$;

revoke all on function public.preflight_site_lead_request(text, text, text)
  from public, anon, authenticated;
grant execute on function public.preflight_site_lead_request(text, text, text)
  to site_api, service_role;

comment on function public.preflight_site_lead_request(text, text, text) is
  'Primeira camada distribuída de rate limit para leads, executada antes da consulta ao catálogo. Retorna false para client_request_id já persistido e true quando consumiu o bucket.';
