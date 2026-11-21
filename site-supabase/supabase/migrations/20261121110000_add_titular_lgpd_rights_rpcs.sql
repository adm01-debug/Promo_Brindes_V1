-- F-30: direitos do titular LGPD (art. 18) na Area do Cliente — acesso,
-- exportacao, correcao e autoexclusao, todos registrados em uma trilha
-- subject_right_requests no schema privado.
--
-- Esta migration foi RECRIADA apos a perda do trabalho original (worktree nunca
-- comitado): o conteudo foi reconstruido a partir da especificacao registrada em
-- docs/ e dos padroes do repositorio, nao do arquivo original.
--
-- ADITIVA, exclusiva do Supabase isolado do site xlzmclcjdncjfdrjxclt.
-- PROIBIDO aplicar no catalogo canonico doufsxqlfjyuvxuezpln.
--
-- As RPCs seguem a convencao do portal (20260909180000): security definer,
-- set search_path = '', revoke de public/anon e grant de execute apenas para
-- authenticated e service_role. Mensagens de erro em snake_case documentadas em
-- docs/DATABASE_FUNCTION_CONTRACTS.md.

-- === Trilha de exercicio de direito ==============================================
--
-- Registra CADA exercicio: acesso, exportacao, correcao e pedido de autoexclusao.
-- Sem PII alem do vinculo com a conta, justamente para a linha poder sobreviver a
-- auditoria. No caso do delete, a linha e removida pelo cascade de auth.users; a
-- trilha juridica persistente do apagamento e o tombstone SHA-256 gravado por
-- public.erase_customer_data em site_private.erased_customer_identities.
create table if not exists site_private.subject_right_requests (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  right_type text not null check (right_type in ('access', 'export', 'correct', 'delete')),
  requested_at timestamptz not null default now()
);

create index if not exists subject_right_requests_subject_idx
  on site_private.subject_right_requests (subject_user_id, requested_at desc);

alter table site_private.subject_right_requests enable row level security;
alter table site_private.subject_right_requests force row level security;
revoke all on site_private.subject_right_requests from public, anon, authenticated;
grant select, insert, update, delete on site_private.subject_right_requests to service_role;

comment on table site_private.subject_right_requests is
  'Trilha do exercicio dos direitos do titular (LGPD art. 18) na Area do Cliente: access, export, correct e delete. Vinculada a conta e removida pelo cascade de auth.users; o registo persistente do apagamento e o tombstone irreversivel em erased_customer_identities.';
comment on column site_private.subject_right_requests.right_type is
  'Direito exercido: access (confirmacao de tratamento), export (portabilidade), correct (correcao de perfil) ou delete (autoexclusao).';

-- === Email verificado do titular ================================================
--
-- As quatro RPCs precisam do mesmo e-mail confirmado que claim_my_quote_requests usa
-- (20260909180000:149-210) e a mesma rejeicao explicita de conta sem e-mail
-- confirmado. Extrair para um helper evita divergencia de comportamento entre os
-- tres fluxos e da a uma unica linha o papel de "identidade do titular".
create or replace function site_private.current_titular_verified_email()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lower(user_record.email) into v_email
  from auth.users user_record
  where user_record.id = v_user_id and user_record.email_confirmed_at is not null;

  if v_email is null then
    raise exception using errcode = '42501', message = 'verified_email_required';
  end if;

  return v_email;
end;
$$;

comment on function site_private.current_titular_verified_email() is
  'F-30: e-mail confirmado da identidade autenticada, em lowercase, ou erro explicito quando nao autenticado (authentication_required) ou sem e-mail confirmado (verified_email_required). Mesma regra de claim_my_quote_requests.';

-- Helper interno, chamado apenas pelas RPCs security definer: nada de execute
-- publico, nem via browser.
revoke all on function site_private.current_titular_verified_email() from public, anon, authenticated, service_role, site_api;

-- === 1. Direito de acesso: confirmacao de tratamento ============================
create or replace function public.get_my_data_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text;
  v_company text;
  v_quotes integer;
  v_selections integer;
  v_favorites integer;
  v_contacts integer;
begin
  select profile.display_name, profile.company
    into v_display_name, v_company
  from site_private.customer_profiles profile
  where profile.user_id = v_user_id;

  select count(*) into v_quotes
  from site_private.quote_requests request
  where request.customer_user_id = v_user_id and request.status <> 'spam';
  select count(*) into v_selections
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id and selection.archived_at is null;
  select count(*) into v_favorites
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;
  select count(*) into v_contacts
  from site_private.contact_requests contact
  where contact.email = v_email and contact.status <> 'spam';

  return jsonb_build_object(
    'profile', jsonb_build_object('displayName', v_display_name, 'company', v_company),
    'counts', jsonb_build_object(
      'quotes', v_quotes, 'selections', v_selections, 'favorites', v_favorites, 'contacts', v_contacts
    )
  );
end;
$$;

comment on function public.get_my_data_access() is
  'F-30: confirmacao de tratamento — devolve ao titular autenticado um resumo do que o site guarda sobre ele (perfil e contagens), sem expor registros. Nenhum dado pessoal alem do do proprio titular.';

-- === 2. Direito de portabilidade: exportacao ====================================
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text;
  v_company text;
  v_quotes jsonb;
  v_selections jsonb;
  v_favorites jsonb;
  v_contacts jsonb;
  v_adjustments jsonb;
  v_rights jsonb;
begin
  select profile.display_name, profile.company
    into v_display_name, v_company
  from site_private.customer_profiles profile
  where profile.user_id = v_user_id;

  select coalesce(jsonb_agg(payload order by created_at desc), '[]'::jsonb) into v_quotes
  from (
    select request.created_at, jsonb_build_object(
      'id', request.id, 'protocol', request.protocol,
      'status', request.status, 'createdAt', request.created_at,
      'submittedAt', request.client_submitted_at, 'company', request.company,
      'contactName', request.contact_name, 'email', request.email, 'phone', request.phone,
      'city', request.city, 'desiredDeadline', request.desired_deadline, 'notes', request.notes,
      'retentionUntil', request.retention_until,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
          'name', item.product_name_snapshot, 'sku', item.sku_snapshot,
          'imageUrl', item.image_url_snapshot, 'quantity', item.quantity,
          'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
          'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
          'decisionGroup', item.decision_group_snapshot, 'kitGroupId', item.kit_group_id,
          'kitName', item.kit_name_snapshot, 'kitQuantity', item.kit_quantity_snapshot,
          'unitsPerKit', item.units_per_kit_snapshot
        ) order by item.position)
        from site_private.quote_items item
        where item.quote_request_id = request.id
      ), '[]'::jsonb),
      'events', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', event.event_type, 'status', event.status, 'title', event.title,
          'createdAt', event.created_at
        ) order by event.created_at desc)
        from site_private.quote_request_events event
        where event.quote_request_id = request.id and event.audience = 'customer'
      ), '[]'::jsonb),
      'proposals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'version', proposal.version, 'title', proposal.title,
          'validUntil', proposal.valid_until, 'publishedAt', proposal.published_at,
          'isCurrent', proposal.superseded_at is null
        ) order by proposal.version desc)
        from site_private.proposal_documents proposal
        where proposal.quote_request_id = request.id and proposal.published_at is not null
      ), '[]'::jsonb)
    ) as payload
    from site_private.quote_requests request
    where request.customer_user_id = v_user_id and request.status <> 'spam'
  ) quote_payload;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', selection.id, 'title', selection.title, 'references', selection.product_references,
      'campaign', selection.campaign, 'version', selection.version,
      'archivedAt', selection.archived_at, 'createdAt', selection.created_at,
      'updatedAt', selection.updated_at
    ) order by selection.updated_at desc), '[]'::jsonb)
  into v_selections
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id;

  select coalesce(jsonb_agg(occasion_id), '[]'::jsonb)
  into v_favorites
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', contact.id, 'clientRequestId', contact.client_request_id,
      'name', contact.contact_name, 'email', contact.email, 'phone', contact.phone,
      'message', contact.message, 'pageUrl', contact.page_url, 'source', contact.source
    ) order by contact.created_at desc), '[]'::jsonb)
  into v_contacts
  from site_private.contact_requests contact
  where contact.email = v_email and contact.status <> 'spam';

  select coalesce(jsonb_agg(jsonb_build_object(
      'requestId', adjustment.quote_request_id, 'clientRequestId', adjustment.client_request_id,
      'message', adjustment.message, 'createdAt', adjustment.created_at, 'status', adjustment.status
    ) order by adjustment.created_at desc), '[]'::jsonb)
  into v_adjustments
  from site_private.quote_adjustment_requests adjustment
  where adjustment.requested_by = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'rightType', right_request.right_type, 'requestedAt', right_request.requested_at
    ) order by right_request.requested_at desc), '[]'::jsonb)
  into v_rights
  from site_private.subject_right_requests right_request
  where right_request.subject_user_id = v_user_id;

  return jsonb_build_object(
    'exportedAt', now(), 'email', v_email,
    'profile', jsonb_build_object('displayName', v_display_name, 'company', v_company),
    'quotes', v_quotes, 'selections', v_selections, 'favorites', v_favorites,
    'contacts', v_contacts, 'adjustments', v_adjustments, 'rights', v_rights
  );
end;
$$;

comment on function public.export_my_data() is
  'F-30: portabilidade — devolve ao titular autenticado um JSON completo dos registros que o site guarda sobre ele (perfil, orcamentos com itens/eventos/propostas, selecoes, favoritos, contatos, pedidos de ajuste e trilha de direitos). O email retornado e o do proprio titular confirmado.';

-- === 3. Direito de correcao: perfil =============================================
create or replace function public.correct_my_data(p_display_name text, p_company text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_company text := nullif(trim(coalesce(p_company, '')), '');
begin
  if v_display_name is null and v_company is null then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;
  if v_display_name is not null and length(v_display_name) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;
  if v_company is not null and length(v_company) not between 2 and 150 then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;

  insert into site_private.customer_profiles (user_id, verified_email, display_name, company)
  values (v_user_id, v_email, v_display_name, v_company)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name),
        company = coalesce(excluded.company, site_private.customer_profiles.company),
        updated_at = now();

  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'correct');

  return jsonb_build_object('updated', true, 'displayName', v_display_name, 'company', v_company);
end;
$$;

comment on function public.correct_my_data(text, text) is
  'F-30: correcao — atualiza display_name (2 a 100) e/ou company (2 a 150) do perfil do titular autenticado; campos em branco preservam o valor anterior. Pelo menos um campo deve ser fornecido; entradas invalidas levantam invalid_profile_fields. Registra o exercicio do direito na trilha.';

-- === 4. Direito de eliminacao: autoexclusao =====================================
create or replace function public.delete_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
begin
  -- Trilha efemera: a linha some pelo cascade do auth.users dentro de
  -- erase_customer_data. A trilha persistente do pedido e o tombstone SHA-256
  -- gravado na mesma transacao. Registrar antes nao muda o resultado, mas deixa
  -- explicito no codigo que o direito foi exercido por autoexclusao (nao por
  -- apagamento administrativo).
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'delete');

  return public.erase_customer_data(v_email);
end;
$$;

comment on function public.delete_my_data() is
  'F-30: autoexclusao — entrega o e-mail verificado do titular a erase_customer_data (mesma funcao do atendimento administrativo da Etapa 32), que anonimiza registros, remove a conta Auth por cascade e grava o tombstone SHA-256 irreversivel. O JSON devolvido e o mesmo de erase_customer_data (contagens e storagePathsToRemove).';

-- === Grants ======================================================================
revoke all on function public.get_my_data_access() from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.correct_my_data(text, text) from public, anon;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.get_my_data_access() to authenticated, service_role;
grant execute on function public.export_my_data() to authenticated, service_role;
grant execute on function public.correct_my_data(text, text) to authenticated, service_role;
grant execute on function public.delete_my_data() to authenticated, service_role;

alter default privileges in schema site_private revoke all on tables from public, anon, authenticated;