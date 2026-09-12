-- Promo Brindes site isolado: retenção só pode finalizar metadados de quotes
-- cujo prazo já venceu, mesmo se o chamador administrativo enviar IDs indevidos.

create or replace function site_private.finalize_expired_site_data(
  p_quote_ids uuid[] default '{}'::uuid[],
  p_storage_paths text[] default '{}'::text[],
  p_batch_size integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted_quote_ids uuid[] := '{}'::uuid[];
  v_contact_ids uuid[] := '{}'::uuid[];
  v_quotes_deleted integer := 0;
  v_documents_deleted integer := 0;
  v_contacts_deleted integer := 0;
  v_notifications_deleted integer := 0;
  v_rate_limits_deleted integer := 0;
  v_shared_selections_deleted integer := 0;
  v_shared_rate_limits_deleted integer := 0;
  v_deleted integer := 0;
begin
  if p_batch_size not between 1 and 100
    or coalesce(cardinality(p_quote_ids), 0) > p_batch_size
    or coalesce(cardinality(p_storage_paths), 0) > p_batch_size * 20
    or exists (select 1 from unnest(coalesce(p_storage_paths, '{}'::text[])) path where length(path) not between 2 and 500 or path ~ '(^|/)\.\.(/|$)') then
    raise exception using errcode = '22023', message = 'invalid_retention_finalize_input';
  end if;

  delete from site_private.proposal_documents document
  using site_private.quote_requests request
  where document.quote_request_id = request.id
    and request.id = any(coalesce(p_quote_ids, '{}'::uuid[]))
    and request.retention_until <= now()
    and document.storage_bucket = 'customer-proposals'
    and document.storage_path = any(coalesce(p_storage_paths, '{}'::text[]));
  get diagnostics v_documents_deleted = row_count;

  with deleted_quotes as (
    delete from site_private.quote_requests request
    where request.id = any(coalesce(p_quote_ids, '{}'::uuid[]))
      and request.retention_until <= now()
      and not exists (select 1 from site_private.proposal_documents document where document.quote_request_id = request.id)
    returning request.id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into v_deleted_quote_ids from deleted_quotes;
  v_quotes_deleted := coalesce(cardinality(v_deleted_quote_ids), 0);

  delete from site_private.notification_deliveries delivery where delivery.request_kind = 'quote' and delivery.request_id = any(v_deleted_quote_ids);
  get diagnostics v_notifications_deleted = row_count;

  select coalesce(array_agg(expired.id), '{}'::uuid[]) into v_contact_ids from (
    select request.id from site_private.contact_requests request where request.retention_until <= now() order by request.retention_until, request.id limit p_batch_size
  ) expired;
  delete from site_private.notification_deliveries delivery where delivery.request_kind = 'contact' and delivery.request_id = any(v_contact_ids);
  get diagnostics v_deleted = row_count;
  v_notifications_deleted := v_notifications_deleted + v_deleted;
  delete from site_private.contact_requests request where request.id = any(v_contact_ids);
  get diagnostics v_contacts_deleted = row_count;

  delete from site_private.rate_limit_buckets bucket where bucket.updated_at <= now() - interval '30 days';
  get diagnostics v_rate_limits_deleted = row_count;
  delete from site_private.shared_selections selection where selection.expires_at <= now() or (selection.revoked_at is not null and selection.revoked_at <= now() - interval '30 days');
  get diagnostics v_shared_selections_deleted = row_count;
  delete from site_private.shared_selection_rate_limits bucket where bucket.updated_at <= now() - interval '30 days';
  get diagnostics v_shared_rate_limits_deleted = row_count;

  return jsonb_build_object('quotesDeleted', v_quotes_deleted, 'proposalDocumentsDeleted', v_documents_deleted, 'contactsDeleted', v_contacts_deleted, 'notificationsDeleted', v_notifications_deleted, 'rateLimitBucketsDeleted', v_rate_limits_deleted, 'sharedSelectionsDeleted', v_shared_selections_deleted, 'sharedSelectionRateLimitsDeleted', v_shared_rate_limits_deleted);
end;
$$;
