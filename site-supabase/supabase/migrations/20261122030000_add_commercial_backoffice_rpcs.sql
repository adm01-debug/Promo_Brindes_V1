-- F-03: back-office minimo do site — listar orcamentos, mudar status e triar ajustes
-- pela UI, sem depender de SQL manual no Studio.
--
-- Estado anterior (auditado): o site so tinha LEITURA para o titular
-- (public.get_my_quote_requests / get_my_quote_request) e o portal do cliente em
-- src/pages/CustomerAccountPage.tsx. Nao existia nenhuma RPC de escrita comercial,
-- nenhuma tela /admin e nenhuma nocao de operador: mudar status exigia UPDATE manual,
-- e site_private.enforce_status_transition rejeitava o update fora de ordem com 22023
-- sem nenhuma trilha de quem tentou.
--
-- Esta migration entrega o lado de banco do back-office:
--   1. site_private.commercial_operators — quem pode operar (allowlist por auth.users).
--   2. public.assert_site_operator() (helper privado de checagem).
--   3. public.list_site_quote_requests() — fila paginada com filtros.
--   4. public.get_site_quote_request() — detalhe completo, incluindo itens e eventos internos.
--   5. public.update_site_quote_status() — muda status respeitando status_transitions.
--   6. public.reply_site_quote_adjustment() — triagem do ajuste pedido pelo cliente.
--   7. public.publish_site_quote_proposal() — publica proposta versionada (produtor que
--      faltava para F-23, que so tinha leitura + URL de 60s).
--
-- ADITIVA, exclusiva do Supabase isolado do site xlzmclcjdncjfdrjxclt.
-- PROIBIDO aplicar no catalogo canonico doufsxqlfjyuvxuezpln.
--
-- Autorizacao: diferente das RPCs do portal (que usam auth.uid() = titular), aqui a
-- identidade e do operador. A allowlist e uma tabela no schema privado, sem policy de
-- RLS para anon/authenticated — so service_role escreve nela. As RPCs sao security
-- definer e recusam quem nao estiver na allowlist ativa, mesmo com JWT valido.
--
-- Todas as escritas passam a ser registradas em site_private.commercial_audit_log,
-- que fecha o gap de "quem mudou o status" que o trigger log_admin_write nao cobria
-- para chamadas de RPC.

-- === 1. Allowlist de operadores =================================================

create table if not exists site_private.commercial_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table site_private.commercial_operators is
  'Allowlist do back-office comercial (F-03). Só service_role escreve; as RPCs de escrita comercial recusam chamador fora daqui, mesmo com JWT válido.';

alter table site_private.commercial_operators enable row level security;
alter table site_private.commercial_operators force row level security;

revoke all on site_private.commercial_operators from public, anon, authenticated;
grant select, insert, update, delete on site_private.commercial_operators to service_role;

drop trigger if exists commercial_operators_set_updated_at on site_private.commercial_operators;
create trigger commercial_operators_set_updated_at
  before update on site_private.commercial_operators
  for each row execute function site_private.set_updated_at();

create index if not exists commercial_operators_active_idx
  on site_private.commercial_operators (user_id)
  where is_active;

-- === 2. Trilha de auditoria comercial ===========================================

create table if not exists site_private.commercial_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text not null check (length(actor_label) between 2 and 160),
  action text not null check (action in ('status_changed', 'adjustment_replied', 'proposal_published')),
  quote_request_id uuid not null references site_private.quote_requests(id) on delete cascade,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

comment on table site_private.commercial_audit_log is
  'Trilha append-only das escritas feitas pelo back-office (F-03): quem mudou o quê e quando. Sem policy para anon/authenticated; leitura só por service_role.';

alter table site_private.commercial_audit_log enable row level security;
alter table site_private.commercial_audit_log force row level security;

revoke all on site_private.commercial_audit_log from public, anon, authenticated;
-- O grant de service_role herdado de 20260908230000 inclui update e delete; sem
-- revogar explicitamente, a credencial de servico poderia reescrever a trilha.
revoke update, delete, truncate on site_private.commercial_audit_log from service_role;
grant select, insert on site_private.commercial_audit_log to service_role;

create index if not exists commercial_audit_log_request_created_idx
  on site_private.commercial_audit_log (quote_request_id, created_at desc);

-- === 3. Checagem de operador ====================================================

create or replace function site_private.assert_site_operator()
returns site_private.commercial_operators
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select * into v_operator
  from site_private.commercial_operators operator
  where operator.user_id = v_user_id and operator.is_active;

  if not found then
    raise exception using errcode = '42501', message = 'not_a_site_operator';
  end if;

  return v_operator;
end;
$$;

comment on function site_private.assert_site_operator() is
  'Recusa com 42501 quando o chamador não está na allowlist ativa de operadores (F-03).';

revoke all on function site_private.assert_site_operator() from public, anon;

-- === 4. Fila paginada de orçamentos =============================================

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
      or request.protocol = upper(v_search)
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
        or request.protocol = upper(v_search)
        or request.company ilike '%' || v_search || '%'
        or request.contact_name ilike '%' || v_search || '%'
        or request.email ilike '%' || v_search || '%'
        or request.phone ilike '%' || v_search || '%'
      )
    order by request.created_at desc
    limit v_limit offset v_offset
  ) page;

  return jsonb_build_object(
    'operator', v_operator.display_name,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'requests', v_rows
  );
end;
$$;

comment on function public.list_site_quote_requests(text, text, integer, integer) is
  'Fila paginada do back-office (F-03): filtro por status e busca por protocolo, empresa, contato, e-mail ou telefone. Só operador ativo.';

-- === 5. Detalhe interno do orçamento ============================================

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

comment on function public.get_site_quote_request(uuid) is
  'Detalhe interno do orçamento para o back-office (F-03), com itens, eventos de ambas as audiências, propostas, ajustes, status permitidos pela state machine e trilha de auditoria.';

-- === 6. Mudar status ============================================================

create or replace function public.update_site_quote_status(
  p_request_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_target text := nullif(btrim(coalesce(p_status, '')), '');
  v_previous text;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if v_target is null then
    raise exception using errcode = '22023', message = 'status_required';
  end if;

  select request.status into v_previous
  from site_private.quote_requests request where request.id = p_request_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  -- Reaproveita a state machine: o trigger BEFORE UPDATE rejeita com 22023, mas aqui
  -- antecipamos o erro para devolver mensagem específica e não deixar o cliente
  -- adivinhar quais transições existem.
  if v_target <> v_previous and not exists (
    select 1 from site_private.status_transitions transition
    where transition.entity = 'quote_requests'
      and transition.from_status = v_previous
      and transition.to_status = v_target
  ) then
    raise exception using errcode = '22023',
      message = format('invalid_status_transition: %s -> %s', v_previous, v_target);
  end if;

  -- 'quoted' promete uma proposta no portal. Só `publish_site_quote_proposal` pode
  -- levar o pedido até lá; senão o cliente veria o evento "Proposta disponível" sem
  -- nenhuma versão para abrir.
  if v_target = 'quoted' then
    raise exception using errcode = '22023', message = 'quoted_requires_proposal_publication';
  end if;

  update site_private.quote_requests request
  set status = v_target
  where request.id = p_request_id and request.status = v_previous;

  if not found then
    raise exception using errcode = '40001', message = 'quote_request_changed_concurrently';
  end if;

  if v_target <> v_previous then
    insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
    values (auth.uid(), v_operator.display_name, 'status_changed', p_request_id,
      jsonb_build_object('from', v_previous, 'to', v_target));
  end if;

  return jsonb_build_object('id', p_request_id, 'previousStatus', v_previous, 'status', v_target);
end;
$$;

comment on function public.update_site_quote_status(uuid, text) is
  'Muda o status de um orçamento respeitando site_private.status_transitions e registra a trilha (F-03). O update é condicionado ao status lido, então duas abas abertas não sobrescrevem uma à outra.';

-- === 7. Triagem do ajuste pedido pelo cliente ===================================

create or replace function public.reply_site_quote_adjustment(
  p_adjustment_id uuid,
  p_response text,
  p_status text default 'resolved'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_response text := nullif(btrim(coalesce(p_response, '')), '');
  v_status text := nullif(btrim(coalesce(p_status, 'resolved')), '');
  v_adjustment site_private.quote_adjustment_requests%rowtype;
begin
  if p_adjustment_id is null then
    raise exception using errcode = '22023', message = 'adjustment_id_required';
  end if;
  if v_response is null then
    raise exception using errcode = '22023', message = 'response_required';
  end if;
  -- Espelha o check da tabela (20260910130000): new/triaged/resolved/closed.
  if v_status not in ('triaged', 'resolved', 'closed') then
    raise exception using errcode = '22023', message = 'invalid_adjustment_status';
  end if;

  select * into v_adjustment
  from site_private.quote_adjustment_requests adjustment
  where adjustment.id = p_adjustment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'adjustment_not_found';
  end if;

  -- A resposta do operador é registrada como trilha: a tabela de ajustes guarda só o
  -- pedido do cliente e o estado do atendimento, não o texto da resposta.
  update site_private.quote_adjustment_requests adjustment
  set status = v_status
  where adjustment.id = p_adjustment_id;

  insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
  values (auth.uid(), v_operator.display_name, 'adjustment_replied', v_adjustment.quote_request_id,
    jsonb_build_object('adjustmentId', p_adjustment_id, 'status', v_status, 'response', v_response));

  return jsonb_build_object('id', p_adjustment_id, 'status', v_status);
end;
$$;

comment on function public.reply_site_quote_adjustment(uuid, text, text) is
  'Responde a um ajuste pedido pelo cliente (F-03): move o estado e grava o texto da resposta na trilha. Trava a linha com FOR UPDATE para não sobrescrever uma resposta concorrente.';

-- === 8. Publicar proposta versionada (produtor de F-23) =========================

create or replace function public.publish_site_quote_proposal(
  p_request_id uuid,
  p_title text,
  p_storage_path text,
  p_valid_until date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_path text := nullif(btrim(coalesce(p_storage_path, '')), '');
  v_request site_private.quote_requests%rowtype;
  v_next_version integer;
  v_proposal_id uuid;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if v_title is null then
    raise exception using errcode = '22023', message = 'title_required';
  end if;
  if v_path is null then
    raise exception using errcode = '22023', message = 'storage_path_required';
  end if;
  -- Mesmas regras do download (api/customer-proposals.ts): sem barra inicial, sem
  -- '..', sem barra invertida, terminando em .pdf. Caminho inválido falharia só no
  -- clique do cliente, depois do pedido já anunciar a proposta.
  if v_path ~ '^/' or position('..' in v_path) > 0 or position(chr(92) in v_path) > 0
     or v_path !~* '\.pdf$' then
    raise exception using errcode = '22023', message = 'invalid_storage_path';
  end if;

  select * into v_request from site_private.quote_requests request where request.id = p_request_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  -- Uma proposta só faz sentido com o pedido em 'in_progress', que é o único estado
  -- com transição para 'quoted' na state machine.
  if v_request.status <> 'in_progress' then
    raise exception using errcode = '22023',
      message = format('proposal_requires_in_progress: status atual %s', v_request.status);
  end if;

  select coalesce(max(proposal.version), 0) + 1 into v_next_version
  from site_private.proposal_documents proposal where proposal.quote_request_id = p_request_id;

  -- A versão anterior deixa de ser a corrente sem perder o histórico (F-23 exibe todas).
  update site_private.proposal_documents proposal
  set superseded_at = now()
  where proposal.quote_request_id = p_request_id and proposal.superseded_at is null;

  insert into site_private.proposal_documents (
    quote_request_id, version, title, storage_bucket, storage_path, valid_until, published_at
  ) values (
    p_request_id, v_next_version, v_title, 'customer-proposals', v_path, p_valid_until, now()
  )
  returning id into v_proposal_id;

  -- O trigger quote_requests_record_customer_event já publica "Proposta disponível"
  -- para o cliente quando o status vira 'quoted'. Este registro fica só na trilha
  -- interna (audience internal) para guardar a versão, sem duplicar no portal.
  -- A descrição NÃO copia v_title: `erase_customer_data` anonimiza
  -- proposal_documents (onde o título vive) mas não quote_request_events, então um
  -- título com o nome do titular sobreviveria ao pedido de exclusão.
  insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
  values (
    p_request_id, 'proposal_published',
    format('Proposta v%s publicada', v_next_version),
    format('Versao %s publicada pelo comercial.', v_next_version), 'internal'
  );

  update site_private.quote_requests request
  set status = 'quoted'
  where request.id = p_request_id and request.status = 'in_progress';

  if not found then
    raise exception using errcode = '40001', message = 'quote_request_changed_concurrently';
  end if;

  insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
  values (auth.uid(), v_operator.display_name, 'proposal_published', p_request_id,
    jsonb_build_object('proposalId', v_proposal_id, 'version', v_next_version, 'storagePath', v_path));

  return jsonb_build_object(
    'proposalId', v_proposal_id,
    'version', v_next_version,
    'status', 'quoted'
  );
end;
$$;

comment on function public.publish_site_quote_proposal(uuid, text, text, date) is
  'Publica uma proposta versionada e move o pedido para quoted (F-03, produtor que faltava para F-23). Exige status in_progress; a versão anterior vira histórica por superseded_at.';

-- === 9. Permissões ==============================================================

revoke all on function public.list_site_quote_requests(text, text, integer, integer) from public, anon;
revoke all on function public.get_site_quote_request(uuid) from public, anon;
revoke all on function public.update_site_quote_status(uuid, text) from public, anon;
revoke all on function public.reply_site_quote_adjustment(uuid, text, text) from public, anon;
revoke all on function public.publish_site_quote_proposal(uuid, text, text, date) from public, anon;

grant execute on function public.list_site_quote_requests(text, text, integer, integer) to authenticated, service_role;
grant execute on function public.get_site_quote_request(uuid) to authenticated, service_role;
grant execute on function public.update_site_quote_status(uuid, text) to authenticated, service_role;
grant execute on function public.reply_site_quote_adjustment(uuid, text, text) to authenticated, service_role;
grant execute on function public.publish_site_quote_proposal(uuid, text, text, date) to authenticated, service_role;