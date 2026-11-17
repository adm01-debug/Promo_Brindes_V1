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
  v_kit_names integer := 0;
  v_notifications integer := 0;
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

  -- Lacuna (c): tira da fila TUDO o que ainda pode ser reivindicado — os tres estados
  -- dos CTEs de claim, 'processing' incluido. 'processing' com lease vencido volta a ser
  -- reivindicado (20260922120000:55), e 'processing' com lease vivo cai no mesmo caso
  -- assim que o lease vence ou a tentativa termina em 'failed' (20260916110000:264) —
  -- em qualquer um dos dois o envelope e remontado AO VIVO da linha ja anonimizada
  -- (20260923200000:25-28). Cancelar com lease vivo nao arranca nada de quem esta
  -- despachando: finalize_site_notification_delivery devolve false em vez de levantar
  -- (20260916110000:272-274) e o chamador ja trata false como 'inconclusive', sem
  -- reenvio automatico (api/notifications.ts:84-90 e :397-402). Vem antes das
  -- anonimizacoes para que nenhuma entrega reivindicavel sobreviva a transacao.
  -- attempts NAO e tocado (enforce_notification_delivery_lease_and_attempts
  -- 20260916220000:99-101 so permite mudanca de attempts entrando em processing ou
  -- reabrindo de exhausted) e lease_token/lease_expires_at vao a null para satisfazer
  -- 20260916220000:84-87 e o CHECK notification_deliveries_lease_matches_status
  -- (20260916110000:119-124).
  update site_private.notification_deliveries delivery set
    status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
  where delivery.request_kind = 'quote'
    and delivery.request_id = any(v_quote_ids)
    and delivery.status in ('pending', 'failed', 'processing');
  get diagnostics v_notifications = row_count;

  -- Lacuna (a) no mesmo update que ja anonimiza a linha: a guarda de idempotencia
  -- por contact_name continua valendo para o conjunto inteiro.
  update site_private.quote_requests request set
    contact_name = '[apagado a pedido do titular]', company = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = '00000000000', city = null, notes = null, customer_user_id = null,
    request_metadata = site_private.erase_titular_request_metadata(request.request_metadata),
    updated_at = now()
  where request.id = any(v_quote_ids) and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_quotes = row_count;

  -- Lacuna (b): placeholder de texto, nunca null. Anular so kit_name_snapshot violaria
  -- quote_items_kit_composition_check (20260922160000:11-17), que exige as quatro
  -- colunas de kit em conjunto. O literal e o mesmo para todas as linhas, o que mantem
  -- a invariante de "um nome por kit_group" imposta na criacao (20260922160000:127-136).
  -- quote_items nao tem updated_at; o unico trigger e o de auditoria administrativa
  -- (20260916210000:65-82, quote_items_log_admin_write), que nao valida nada e nunca
  -- levanta excecao.
  update site_private.quote_items item set
    kit_name_snapshot = '[apagado a pedido do titular]'
  where item.quote_request_id = any(v_quote_ids)
    and item.kit_name_snapshot is not null
    and item.kit_name_snapshot <> '[apagado a pedido do titular]';
  get diagnostics v_kit_names = row_count;

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
    'kitNamesAnonymized', v_kit_names, 'notificationsCancelled', v_notifications,
    'storagePathsToRemove', v_storage_paths
  );
end;
$function$
