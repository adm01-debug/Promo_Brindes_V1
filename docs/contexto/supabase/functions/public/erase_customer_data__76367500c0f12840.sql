CREATE OR REPLACE FUNCTION public.erase_customer_data(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email text := site_private.normalize_email(p_email);
  v_email_hash text;
  v_quote_ids uuid[];
  v_user_ids uuid[];
  v_storage_paths jsonb;
  v_quotes integer := 0;
  v_contacts integer := 0;
  v_profiles integer := 0;
  v_documents integer := 0;
  v_users integer := 0;
begin
  if length(v_email) not between 5 and 160 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception using errcode = '22023', message = 'invalid_erasure_email';
  end if;
  v_email_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');

  select coalesce(array_agg(distinct candidate.user_id), '{}'::uuid[]) into v_user_ids
  from (
    select profile.user_id from site_private.customer_profiles profile where profile.verified_email = v_email
    union
    select user_record.id from auth.users user_record where lower(user_record.email) = v_email
  ) candidate;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_quote_ids
  from site_private.quote_requests
  where email = v_email or customer_user_id = any(v_user_ids);

  select coalesce(jsonb_agg(jsonb_build_object('bucket', document.storage_bucket, 'path', document.storage_path)), '[]'::jsonb)
  into v_storage_paths from site_private.proposal_documents document
  where document.quote_request_id = any(v_quote_ids);

  insert into site_private.storage_deletion_queue (bucket, object_path)
  select document.storage_bucket, document.storage_path
  from site_private.proposal_documents document
  where document.quote_request_id = any(v_quote_ids)
  on conflict (bucket, object_path) do update
    set queued_at = least(site_private.storage_deletion_queue.queued_at, excluded.queued_at);

  delete from site_private.proposal_documents where quote_request_id = any(v_quote_ids);
  get diagnostics v_documents = row_count;
  update site_private.quote_adjustment_requests
    set message = '[apagado a pedido do titular]', updated_at = now()
    where requested_by = any(v_user_ids);
  update site_private.quote_requests request set
    contact_name = '[apagado a pedido do titular]', company = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = '00000000000', city = null, notes = null, customer_user_id = null, updated_at = now()
  where request.id = any(v_quote_ids) and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_quotes = row_count;
  update site_private.contact_requests request set
    contact_name = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = null, message = '[apagado a pedido do titular]', updated_at = now()
  where request.email = v_email and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_contacts = row_count;
  update site_private.customer_profiles profile set
    display_name = null, company = null,
    verified_email = 'titular-' || left(md5(profile.user_id::text), 16) || '@erased.invalid', updated_at = now()
  where profile.user_id = any(v_user_ids)
    and profile.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$';
  get diagnostics v_profiles = row_count;

  insert into site_private.erased_customer_identities (email_sha256, auth_users_deleted)
  values (v_email_hash, cardinality(v_user_ids))
  on conflict (email_sha256) do update set erased_at = now(),
    auth_users_deleted = greatest(site_private.erased_customer_identities.auth_users_deleted, excluded.auth_users_deleted);
  delete from auth.users where id = any(v_user_ids);
  get diagnostics v_users = row_count;

  return jsonb_build_object(
    'quotesAnonymized', v_quotes, 'contactsAnonymized', v_contacts,
    'profilesAnonymized', v_profiles, 'proposalDocumentsDeleted', v_documents,
    'authUsersDeleted', v_users, 'storagePathsQueued', jsonb_array_length(v_storage_paths),
    'storagePathsToRemove', v_storage_paths
  );
end;
$function$
