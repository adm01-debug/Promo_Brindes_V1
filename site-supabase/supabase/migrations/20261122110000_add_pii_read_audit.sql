-- PF-34: auditoria de leitura (SELECT) em dados pessoais.
-- Aplicar exclusivamente no projeto isolado xlzmclcjdncjfdrjxclt. Não toca no
-- catálogo canônico doufsxqlfjyuvxuezpln.
--
-- Por que não pgaudit: a extensão exige shared_preload_libraries (mudança de infra)
-- e grava em log do servidor, fora do alcance do banco. Este projeto já tem a trilha
-- site_private.admin_audit_log (Etapa 36) consumida pela aplicação via RPC; a leitura
-- de PII segue o mesmo padrão, distinguindo a operação. Assim a auditoria de leitura
-- fica consultável e purgável como a de escrita, sem mudança de arquitetura.
--
-- Escopo de PII: colunas de contato do titular em quote_requests
-- (contact_name/company/email/phone/city). A RPC get_my_quote_request lê esses dados
-- do próprio titular autenticado; a chamada de log registra a leitura sem guardar o
-- valor lido.

create table if not exists site_private.pii_read_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null default 'SELECT' check (operation = 'SELECT'),
  subject uuid,
  performed_by text not null,
  actor_kind text not null default 'titular' check (actor_kind in ('titular', 'operador')),
  filter text,
  row_count integer,
  application_name text,
  occurred_at timestamptz not null default now()
);

comment on table site_private.pii_read_audit_log is
  'PF-34: audita leituras (SELECT) de colunas de contato do titular em tabelas de PII. Não armazena o valor lido, só que uma leitura aconteceu, para quem, quando, quantas linhas e com qual filtro.';
comment on column site_private.pii_read_audit_log.subject is
  'Titular cuja PII foi lida. Fica nulo em leitura de operador: a fila comercial pagina muitos titulares de uma vez e só o row_count descreve o volume.';
comment on column site_private.pii_read_audit_log.actor_kind is
  'titular = o próprio dono leu seus dados; operador = alguém do back-office leu dados de outra pessoa.';

alter table site_private.pii_read_audit_log enable row level security;
alter table site_private.pii_read_audit_log force row level security;
revoke all on site_private.pii_read_audit_log from public, anon, authenticated, site_api;
grant select, insert on site_private.pii_read_audit_log to service_role;

-- Função de log compartilhada. security definer para a RPC conseguir gravar mesmo
-- quando invocada por authenticated (a RPC só le, a gravação de auditoria é do site).
create or replace function site_private.log_pii_read(
  p_table_name text,
  p_subject uuid default null,
  p_row_count integer default null,
  p_filter text default null,
  p_actor_kind text default 'titular'
)
returns void
language plpgsql
security definer
set search_path = site_private
as $$
begin
  insert into site_private.pii_read_audit_log
    (table_name, subject, performed_by, application_name, row_count, filter, actor_kind)
  values (
    p_table_name, p_subject,
    coalesce(auth.uid()::text, site_private.audit_actor(), 'anonymous'),
    current_setting('application_name', true),
    p_row_count, p_filter, p_actor_kind
  );
end;
$$;

comment on function site_private.log_pii_read(text, uuid, integer, text, text) is
  'PF-34: registra uma leitura de PII na trilha de auditoria. Chamada por RPCs que leem colunas de contato.';

revoke all on function site_private.log_pii_read(text, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function site_private.log_pii_read(text, uuid, integer, text, text) to authenticated;

create index if not exists pii_read_audit_log_subject_occurred_idx
  on site_private.pii_read_audit_log (subject, occurred_at desc, id);
create index if not exists pii_read_audit_log_occurred_idx
  on site_private.pii_read_audit_log (occurred_at, id);

-- Retenção: a trilha guarda o UUID do titular, então não pode crescer sem prazo.
-- Sigue o mesmo contrato de public.purge_site_admin_audit_logs (Etapa 36): janela
-- de 30 a 3650 dias, apaga em lotes e devolve a contagem.
create or replace function public.purge_site_pii_read_audit_log(
  p_retention_days integer default 400,
  p_batch_size integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reads integer;
begin
  if p_retention_days not between 30 and 3650 or p_batch_size not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid_pii_read_retention_input';
  end if;
  with candidates as (
    select id from site_private.pii_read_audit_log
    where occurred_at < now() - make_interval(days => p_retention_days)
    order by occurred_at, id limit p_batch_size
  )
  delete from site_private.pii_read_audit_log log using candidates
  where log.id = candidates.id;
  get diagnostics v_reads = row_count;
  return jsonb_build_object('readsDeleted', v_reads);
end;
$$;

comment on function public.purge_site_pii_read_audit_log(integer, integer) is
  'PF-34: purga em lote a trilha de leitura de PII. Mesma janela e mesmo teto de lote que purge_site_admin_audit_logs.';

revoke all on function public.purge_site_pii_read_audit_log(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_site_pii_read_audit_log(integer, integer) to service_role;

-- A RPC de leitura da proposta do titular passa a registrar a leitura de PII.
-- Corpo preservado (mesma assinatura, mesmo retorno); só acrescenta a chamada de log
-- depois de a linha ser resolvida, para não auditar tentativa sem permissão.
create or replace function public.get_my_quote_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
  v_events jsonb;
  v_proposals jsonb;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_request from site_private.quote_requests request
  where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam';
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
    'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
    'decisionGroup', item.decision_group_snapshot, 'kitGroupId', item.kit_group_id,
    'kitName', item.kit_name_snapshot, 'kitQuantity', item.kit_quantity_snapshot,
    'unitsPerKit', item.units_per_kit_snapshot
  )) order by item.position), '[]'::jsonb) into v_items
  from site_private.quote_items item where item.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id, 'type', event.event_type, 'status', event.status, 'title', event.title,
    'description', event.description, 'createdAt', event.created_at
  ) order by event.sequence desc), '[]'::jsonb) into v_events
  from site_private.quote_request_events event where event.quote_request_id = v_request.id and event.audience = 'customer';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', proposal.id, 'version', proposal.version, 'title', proposal.title, 'validUntil', proposal.valid_until,
    'publishedAt', proposal.published_at, 'isCurrent', proposal.superseded_at is null
  ) order by proposal.version desc), '[]'::jsonb) into v_proposals
  from site_private.proposal_documents proposal where proposal.quote_request_id = v_request.id and proposal.published_at is not null;

  perform site_private.log_pii_read('quote_requests', v_user_id);

  return jsonb_build_object(
    'id', v_request.id, 'protocol', v_request.protocol, 'status', v_request.status,
    'createdAt', v_request.created_at, 'submittedAt', v_request.client_submitted_at, 'company', v_request.company,
    'contactName', v_request.contact_name, 'email', v_request.email, 'phone', v_request.phone, 'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline, 'notes', v_request.notes,
    'campaign', v_request.request_metadata -> 'campaign', 'briefing', v_request.request_metadata -> 'briefing',
    'items', v_items, 'events', v_events, 'proposals', v_proposals
  );
end;
$$;

revoke all on function public.get_my_quote_request(uuid) from public, anon;
grant execute on function public.get_my_quote_request(uuid) to authenticated, service_role;

-- === Leitura pela fila comercial (back-office) =================================
-- A fila e o detalhe do back-office (F-03) tambem devolvem colunas de contato, entao
-- tambem sao leitura de PII. Aqui gravamos 1 registro por chamada, com actor_kind
-- 'operador' e o volume de linhas, mas sem subject: a fila pagina varios titulares e
-- atribuir a leitura a um deles seria falso.
create or replace function public.list_site_quote_requests(
  p_status text default null,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  -- A Area do Cliente exibe o protocolo com '#' (CustomerQuotePage) e o operador
  -- cola exatamente o que o cliente viu. O prefixo so sai da comparacao com o
  -- PROTOCOLO: a busca textual continua vendo o termo literal, senao '#Marca'
  -- passaria a casar com 'Marca' e um '#' sozinho desligaria o filtro.
  v_protocol text := nullif(btrim(ltrim(btrim(coalesce(p_search, '')), '#')), '');
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_rows jsonb;
  v_total integer;
begin
  if v_status is not null and v_status not in ('new', 'triaged', 'in_progress', 'quoted', 'closed', 'spam') then
    raise exception using errcode = '22023', message = 'invalid_status_filter';
  end if;

  select count(*) into v_total
  from site_private.quote_requests request
  where (v_status is null or request.status = v_status)
    and (
      v_search is null
      or request.id::text = v_search
      or request.protocol = upper(v_protocol)
      or request.company ilike '%' || v_search || '%'
      or request.contact_name ilike '%' || v_search || '%'
      or request.email ilike '%' || v_search || '%'
      or request.phone ilike '%' || v_search || '%'
    );

  -- jsonb_build_object em vez de row_to_json: o contrato da UI usa camelCase, e
  -- row_to_json preservaria o snake_case dos aliases, entregando itemCount nulo.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page.id,
    'protocol', page.protocol,
    'status', page.status,
    'contactName', page.contact_name,
    'company', page.company,
    'email', page.email,
    'phone', page.phone,
    'city', page.city,
    'desiredDeadline', page.desired_deadline,
    'createdAt', page.created_at,
    'submittedAt', page.client_submitted_at,
    'isClaimed', page.is_claimed,
    'itemCount', page.item_count,
    'pendingAdjustments', page.pending_adjustments,
    'currentProposalVersion', page.current_proposal_version
  ) order by page.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      request.id,
      request.protocol,
      request.status,
      request.contact_name,
      request.company,
      request.email,
      request.phone,
      request.city,
      request.desired_deadline,
      request.created_at,
      request.client_submitted_at,
      request.customer_user_id is not null as is_claimed,
      (
        select count(*) from site_private.quote_items item
        where item.quote_request_id = request.id
      ) as item_count,
      (
        select count(*) from site_private.quote_adjustment_requests adjustment
        where adjustment.quote_request_id = request.id and adjustment.status in ('new', 'triaged')
      ) as pending_adjustments,
      (
        select max(proposal.version) from site_private.proposal_documents proposal
        where proposal.quote_request_id = request.id and proposal.published_at is not null
      ) as current_proposal_version
    from site_private.quote_requests request
    where (v_status is null or request.status = v_status)
      and (
        v_search is null
        or request.id::text = v_search
        or request.protocol = upper(v_protocol)
        or request.company ilike '%' || v_search || '%'
        or request.contact_name ilike '%' || v_search || '%'
        or request.email ilike '%' || v_search || '%'
        or request.phone ilike '%' || v_search || '%'
      )
    order by request.created_at desc
    limit v_limit offset v_offset
  ) page;
  perform site_private.log_pii_read('quote_requests', null, jsonb_array_length(v_rows), concat_ws(' ', v_status, v_search), 'operador');

  return jsonb_build_object(
    'operator', v_operator.display_name,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'requests', v_rows
  );
end;
$$;

revoke all on function public.list_site_quote_requests(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.list_site_quote_requests(text, text, integer, integer) to authenticated, service_role;

-- === Leitura do detalhe pelo comercial ======================================
create or replace function public.get_site_quote_request(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
  v_events jsonb;
  v_proposals jsonb;
  v_adjustments jsonb;
  v_allowed_statuses text[];
  v_audit jsonb;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;

  select * into v_request from site_private.quote_requests request where request.id = p_request_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  perform site_private.log_pii_read('quote_requests', null, 1, v_request.id::text, 'operador');

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot,
    'variantId', item.variant_id_snapshot, 'colorName', item.color_name_snapshot,
    'colorHex', item.color_hex_snapshot, 'decisionGroup', item.decision_group_snapshot
  ) order by item.position), '[]'::jsonb) into v_items
  from site_private.quote_items item where item.quote_request_id = v_request.id;

  -- Diferente de get_my_quote_request, o operador vê também a audiência interna.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id, 'type', event.event_type, 'status', event.status, 'title', event.title,
    'description', event.description, 'audience', event.audience, 'createdAt', event.created_at
  ) order by event.sequence desc), '[]'::jsonb) into v_events
  from site_private.quote_request_events event where event.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', proposal.id, 'version', proposal.version, 'title', proposal.title,
    'validUntil', proposal.valid_until, 'publishedAt', proposal.published_at,
    'supersededAt', proposal.superseded_at, 'isCurrent', proposal.superseded_at is null
  ) order by proposal.version desc), '[]'::jsonb) into v_proposals
  from site_private.proposal_documents proposal where proposal.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', adjustment.id, 'status', adjustment.status, 'message', adjustment.message,
    'createdAt', adjustment.created_at, 'updatedAt', adjustment.updated_at
  ) order by adjustment.created_at desc), '[]'::jsonb) into v_adjustments
  from site_private.quote_adjustment_requests adjustment
  where adjustment.quote_request_id = v_request.id;

  -- 'quoted' fica fora das opções avulsas: esse estágio promete uma proposta no portal
  -- e só `publish_site_quote_proposal` pode produzi-la (a RPC de status recusa).
  select coalesce(array_agg(transition.to_status order by transition.to_status), '{}'::text[])
  into v_allowed_statuses
  from site_private.status_transitions transition
  where transition.entity = 'quote_requests'
    and transition.from_status = v_request.status
    and transition.to_status <> 'quoted';

  select coalesce(jsonb_agg(jsonb_build_object(
    'action', log.action, 'actorLabel', log.actor_label, 'detail', log.detail, 'createdAt', log.created_at
  ) order by log.created_at desc), '[]'::jsonb) into v_audit
  from site_private.commercial_audit_log log where log.quote_request_id = v_request.id;

  return jsonb_build_object(
    'operator', v_operator.display_name,
    'id', v_request.id,
    'protocol', v_request.protocol,
    'status', v_request.status,
    'allowedStatuses', to_jsonb(v_allowed_statuses),
    'createdAt', v_request.created_at,
    'submittedAt', v_request.client_submitted_at,
    'contactName', v_request.contact_name,
    'company', v_request.company,
    'email', v_request.email,
    'phone', v_request.phone,
    'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline,
    'notes', v_request.notes,
    'pageUrl', v_request.page_url,
    'isClaimed', v_request.customer_user_id is not null,
    'campaign', v_request.request_metadata -> 'campaign',
    'briefing', v_request.request_metadata -> 'briefing',
    'items', v_items,
    'events', v_events,
    'proposals', v_proposals,
    'adjustments', v_adjustments,
    'audit', v_audit
  );
end;
$$;

revoke all on function public.get_site_quote_request(uuid) from public, anon, authenticated;
grant execute on function public.get_site_quote_request(uuid) to authenticated, service_role;
