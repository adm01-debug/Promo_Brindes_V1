-- Retenção programável de dados pessoais do Site Promo Brindes.
-- Aplicar exclusivamente no Supabase isolado: xlzmclcjdncjfdrjxclt.
-- Nunca aplicar no catálogo canônico: doufsxqlfjyuvxuezpln.

create index if not exists quote_requests_retention_idx
  on site_private.quote_requests (retention_until);

create index if not exists contact_requests_retention_idx
  on site_private.contact_requests (retention_until);

create or replace function site_private.purge_expired_site_data(
  p_now timestamptz default now(),
  p_batch_size integer default 500
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote_ids uuid[] := '{}'::uuid[];
  v_contact_ids uuid[] := '{}'::uuid[];
  v_quotes_deleted integer := 0;
  v_contacts_deleted integer := 0;
  v_notifications_deleted integer := 0;
  v_files_deleted integer := 0;
  v_rate_limits_deleted integer := 0;
  v_deleted integer := 0;
begin
  if p_batch_size not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_retention_batch_size';
  end if;

  select coalesce(array_agg(expired.id), '{}'::uuid[]) into v_quote_ids
  from (
    select request.id
    from site_private.quote_requests request
    where request.retention_until <= p_now
    order by request.retention_until, request.id
    limit p_batch_size
  ) expired;

  if cardinality(v_quote_ids) > 0 then
    delete from storage.objects object
    where object.bucket_id = 'customer-proposals'
      and object.name in (
        select document.storage_path
        from site_private.proposal_documents document
        where document.quote_request_id = any(v_quote_ids)
      );
    get diagnostics v_files_deleted = row_count;

    delete from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.request_id = any(v_quote_ids);
    get diagnostics v_notifications_deleted = row_count;

    delete from site_private.quote_requests request
    where request.id = any(v_quote_ids);
    get diagnostics v_quotes_deleted = row_count;
  end if;

  select coalesce(array_agg(expired.id), '{}'::uuid[]) into v_contact_ids
  from (
    select request.id
    from site_private.contact_requests request
    where request.retention_until <= p_now
    order by request.retention_until, request.id
    limit p_batch_size
  ) expired;

  if cardinality(v_contact_ids) > 0 then
    delete from site_private.notification_deliveries delivery
    where delivery.request_kind = 'contact'
      and delivery.request_id = any(v_contact_ids);
    get diagnostics v_deleted = row_count;
    v_notifications_deleted := v_notifications_deleted + v_deleted;

    delete from site_private.contact_requests request
    where request.id = any(v_contact_ids);
    get diagnostics v_contacts_deleted = row_count;
  end if;

  delete from site_private.rate_limit_buckets bucket
  where bucket.updated_at <= p_now - interval '30 days';
  get diagnostics v_rate_limits_deleted = row_count;

  return jsonb_build_object(
    'quotesDeleted', v_quotes_deleted,
    'contactsDeleted', v_contacts_deleted,
    'notificationsDeleted', v_notifications_deleted,
    'proposalFilesDeleted', v_files_deleted,
    'rateLimitBucketsDeleted', v_rate_limits_deleted
  );
end;
$$;

revoke all on function site_private.purge_expired_site_data(timestamptz, integer) from public, anon, authenticated;
grant execute on function site_private.purge_expired_site_data(timestamptz, integer) to service_role;

create or replace function public.run_site_data_retention(p_batch_size integer default 500)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select site_private.purge_expired_site_data(now(), p_batch_size);
$$;

revoke all on function public.run_site_data_retention(integer) from public, anon, authenticated;
grant execute on function public.run_site_data_retention(integer) to service_role;

comment on function site_private.purge_expired_site_data(timestamptz, integer) is
  'Exclui em lotes os dados vencidos do Site Promo Brindes e os metadados privados correlatos. Deve ser acionada por tarefa server-side autenticada.';

comment on function public.run_site_data_retention(integer) is
  'Ponto de entrada PostgREST para a tarefa server-side de retenção; exclusivo do service_role.';
