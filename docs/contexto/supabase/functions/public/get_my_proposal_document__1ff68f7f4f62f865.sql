CREATE OR REPLACE FUNCTION public.get_my_proposal_document(p_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_document jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  perform site_private.consume_rate_limit(
    'proposal_download',
    encode(extensions.digest(v_user_id::text, 'sha256'), 'hex'),
    30,
    interval '15 minutes'
  );
  select jsonb_build_object(
    'bucket', proposal.storage_bucket,
    'path', proposal.storage_path,
    'title', proposal.title
  ) into v_document
  from site_private.proposal_documents proposal
  join site_private.quote_requests request on request.id = proposal.quote_request_id
  where proposal.id = p_proposal_id
    and proposal.published_at is not null
    and request.customer_user_id = v_user_id
    and request.status <> 'spam';
  return v_document;
end;
$function$
