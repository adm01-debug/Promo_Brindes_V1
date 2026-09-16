-- Etapa 32 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Apagar o usuário no Auth (auth.users) deixa quote_requests.customer_user_id null via
-- on delete set null, mas não apaga nem anonimiza email/telefone/nome/empresa em texto
-- puro — a pessoa deixa de ter conta, mas o conteúdo do pedido continua identificável.
-- Não há nenhum caminho hoje que atenda um pedido de apagamento do titular (LGPD
-- art. 18) fora da retenção automática de 24 meses.
--
-- Design: ANONIMIZA, não apaga as linhas de quote_requests/contact_requests/
-- customer_profiles — mantém id, datas, protocolo e status para integridade
-- referencial e para comprovar que o pedido foi atendido (evidência de conformidade),
-- exatamente como request_my_quote_adjustment e o restante do sistema já preservam
-- histórico em vez de apagar. proposal_documents é a exceção: o PDF em si pode conter
-- nome/empresa no conteúdo (não só nos metadados), então a linha é apagada e o caminho
-- no Storage devolvido para o chamador limpar — mesmo padrão two-phase de
-- get_site_data_retention_candidates/finalize_site_data_retention (Etapa anterior),
-- mas aqui numa função só: apagamento por titular é raro e manual, não um cron de alta
-- frequência, então o custo de uma falha rara de limpeza de Storage órfã é aceitável
-- (o requisito de conformidade — a linha do banco sumir — já foi cumprido).
--
-- Fora do escopo desta função, documentado em vez de fingir cobertura: texto livre
-- (quote_adjustment_requests.message, contact_requests.message) pode conter PII que o
-- próprio titular digitou por conta própria — não há como distinguir isso de conteúdo
-- legítimo sem análise de conteúdo, então não é varrido automaticamente.

create or replace function public.erase_customer_data(p_email text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := site_private.normalize_email(p_email);
  v_quote_ids uuid[];
  v_user_ids uuid[];
  v_storage_paths jsonb;
  v_quotes_anonymized integer := 0;
  v_contacts_anonymized integer := 0;
  v_profiles_anonymized integer := 0;
  v_documents_deleted integer := 0;
begin
  if length(v_email) not between 5 and 160 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception using errcode = '22023', message = 'invalid_erasure_email';
  end if;

  select coalesce(array_agg(user_id), '{}'::uuid[]) into v_user_ids
  from site_private.customer_profiles where verified_email = v_email;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_quote_ids
  from site_private.quote_requests
  where email = v_email or customer_user_id = any(v_user_ids);

  select coalesce(jsonb_agg(jsonb_build_object('bucket', document.storage_bucket, 'path', document.storage_path)), '[]'::jsonb)
  into v_storage_paths
  from site_private.proposal_documents document
  where document.quote_request_id = any(v_quote_ids);

  delete from site_private.proposal_documents document
  where document.quote_request_id = any(v_quote_ids);
  get diagnostics v_documents_deleted = row_count;

  update site_private.quote_requests request
  set contact_name = '[apagado a pedido do titular]',
      company = '[apagado a pedido do titular]',
      email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
      phone = '00000000000',
      city = null,
      notes = null,
      updated_at = now()
  where request.id = any(v_quote_ids)
    and request.contact_name <> '[apagado a pedido do titular]'; -- idempotente: não reprocessa quem já foi apagado
  get diagnostics v_quotes_anonymized = row_count;

  update site_private.contact_requests request
  set contact_name = '[apagado a pedido do titular]',
      email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
      phone = null,
      updated_at = now()
  where request.email = v_email
    and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_contacts_anonymized = row_count;

  update site_private.customer_profiles profile
  set display_name = null,
      company = null,
      verified_email = 'titular-' || left(md5(profile.user_id::text), 16) || '@erased.invalid',
      updated_at = now()
  where profile.user_id = any(v_user_ids)
    and profile.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$'; -- idempotente
  get diagnostics v_profiles_anonymized = row_count;

  return jsonb_build_object(
    'quotesAnonymized', v_quotes_anonymized,
    'contactsAnonymized', v_contacts_anonymized,
    'profilesAnonymized', v_profiles_anonymized,
    'proposalDocumentsDeleted', v_documents_deleted,
    'storagePathsToRemove', v_storage_paths
  );
end;
$$;

comment on function public.erase_customer_data(text) is
  'Etapa 32: apagamento de titular (LGPD art. 18). Anonimiza quote_requests/contact_requests/customer_profiles em vez de apagar (preserva id/datas/protocolo para integridade referencial e evidência de conformidade); apaga proposal_documents (o PDF pode conter PII no conteúdo, não só nos metadados) e devolve os caminhos de Storage para o chamador limpar. Idempotente: reexecutar para o mesmo e-mail não reprocessa linhas já anonimizadas. Não cobre texto livre (message de contact_requests/quote_adjustment_requests) — sem análise de conteúdo não dá para distinguir PII digitada de conteúdo legítimo.';

revoke all on function public.erase_customer_data(text) from public, anon, authenticated;
grant execute on function public.erase_customer_data(text) to service_role;
