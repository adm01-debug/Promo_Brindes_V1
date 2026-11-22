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
  application_name text,
  occurred_at timestamptz not null default now()
);

comment on table site_private.pii_read_audit_log is
  'PF-34: audita leituras (SELECT) de colunas de contato do titular em tabelas de PII. Não armazena o valor lido, só que uma leitura aconteceu, para quem e quando.';

alter table site_private.pii_read_audit_log enable row level security;
alter table site_private.pii_read_audit_log force row level security;
revoke all on site_private.pii_read_audit_log from public, anon, authenticated, site_api;
grant select, insert on site_private.pii_read_audit_log to service_role;

-- Função de log compartilhada. security definer para a RPC conseguir gravar mesmo
-- quando invocada por authenticated (a RPC só le, a gravação de auditoria é do site).
create or replace function site_private.log_pii_read(p_table_name text, p_subject uuid default null)
returns void
language plpgsql
security definer
set search_path = site_private
as $$
begin
  insert into site_private.pii_read_audit_log (table_name, subject, performed_by, application_name)
  values (p_table_name, p_subject, coalesce(auth.uid()::text, 'anonymous'), current_setting('application_name', true));
end;
$$;

comment on function site_private.log_pii_read(text, uuid) is
  'PF-34: registra uma leitura de PII na trilha de auditoria. Chamada por RPCs que leem colunas de contato.';

revoke all on function site_private.log_pii_read(text, uuid) from public, anon, authenticated;
grant execute on function site_private.log_pii_read(text, uuid) to authenticated;

create index if not exists pii_read_audit_log_subject_occurred_idx
  on site_private.pii_read_audit_log (subject, occurred_at desc, id);

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

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
    'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
    'decisionGroup', item.decision_group_snapshot
  ) order by item.position), '[]'::jsonb) into v_items
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
    'id', v_request.id, 'protocol', upper(left(v_request.id::text, 8)), 'status', v_request.status,
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
