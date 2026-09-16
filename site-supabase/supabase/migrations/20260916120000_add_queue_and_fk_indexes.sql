-- Etapas 13, 14, 15 e 16 do plano de correções
-- (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md). Migration aditiva,
-- exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Medido antes de escrever: fixture sintética de 22.500 linhas em
-- notification_deliveries (gerada localmente, nunca aplicada em produção) mostrou
-- Seq Scan + Sort em memória para a consulta de reivindicação da fila (12ms; cresce
-- com o volume). Índices existentes (notification_deliveries_pending_idx,
-- notification_deliveries_retry_idx) não têm channel como coluna líder nem cobrem a
-- ordenação (next_attempt_at, created_at, id) exigida pela consulta real — descoberto
-- só ao medir, não bastava ler as migrations. Reaproveitados/mantidos como estão;
-- nenhum dos dois é removido nesta migration porque outras consultas (saúde da fila,
-- por status) ainda os usam.
--
-- Etapa 16 revisada: a auditoria original supôs ~7 FKs sem índice de suporte a partir
-- de uma leitura estática das migrations. Consultando pg_constraint/pg_index no banco
-- local (fonte de verdade), só 3 FKs realmente carecem de índice — os demais (portal
-- do cliente, retenção, e-mail não reivindicado) já foram cobertos nas migrations de
-- 09-11/09.

-- === Etapa 13: consulta de reivindicação (ramo comum: pending/failed) ==============
--
-- Medido e descartado. Um índice novo liderado por channel foi testado primeiro
-- (channel, next_attempt_at, created_at, id) e comparado contra o baseline: com uma
-- fixture de 120.000 linhas em distribuição realista de regime permanente (99,6% sent,
-- só uma fração elegível pequena — o teste inicial com 22.500 linhas majoritariamente
-- 'pending' mascarava isso), o índice novo nunca foi escolhido pelo planner. O motivo:
-- em produção o worker chama claim_site_notification_deliveries com os DOIS canais de
-- uma vez (api/notifications.ts, configuredChannels()), então `channel = any(...)`
-- praticamente não filtra nada — um índice liderado por essa coluna não ganha
-- seletividade. O índice já existente notification_deliveries_pending_idx (status,
-- created_at) where status in ('pending','failed'), combinado com
-- notification_deliveries_processing_lease_idx (Etapa 14, abaixo), já produz um
-- Bitmap Or eficiente (~1ms mesmo com 120k linhas). Criar o índice liderado por
-- channel só acrescentaria custo de escrita sem ganho de leitura — não incluído.

-- === Etapa 14: recuperação de lease expirada (ramo raro) ===========================

create index concurrently if not exists notification_deliveries_processing_lease_idx
  on site_private.notification_deliveries (lease_expires_at)
  where status = 'processing';

comment on index site_private.notification_deliveries_processing_lease_idx is
  'Etapa 14: recuperação de jobs presos em processing com lease expirada. Cardinalidade típica é pequena (só jobs realmente travados), então não precisa de channel/request_kind na predicate.';

-- === Etapa 15: unicidade de reconciliação (provider, provider_message_id) ==========
--
-- notification_deliveries_provider_lookup_idx (etapa 30 do plano anterior, migration
-- 20260915150000) já indexa (provider, provider_message_id) where provider_message_id
-- is not null, mas não é único. apply_site_notification_provider_event busca com
-- "limit 1" (20260915150000, linha ~86) presumindo no máximo uma entrega por
-- (provider, provider_message_id) — nunca verificado como invariante. Torna explícito.

do $$
declare
  v_duplicates integer;
begin
  select count(*) into v_duplicates
  from (
    select provider, provider_message_id
    from site_private.notification_deliveries
    where provider_message_id is not null
    group by provider, provider_message_id
    having count(*) > 1
  ) dup;
  if v_duplicates > 0 then
    raise exception using errcode = '23505',
      message = format('invariant_violated: %s pares (provider, provider_message_id) duplicados em notification_deliveries — corrigir os dados antes de aplicar a unicidade', v_duplicates);
  end if;
end;
$$;

drop index concurrently if exists site_private.notification_deliveries_provider_lookup_idx;
create unique index concurrently if not exists notification_deliveries_provider_message_key
  on site_private.notification_deliveries (provider, provider_message_id)
  where provider_message_id is not null;

comment on index site_private.notification_deliveries_provider_message_key is
  'Etapa 15: torna explícita a invariante que apply_site_notification_provider_event já presumia (limit 1). Substitui o índice não-único notification_deliveries_provider_lookup_idx com o mesmo shape de predicate.';

-- === Etapa 16: FKs sem índice de suporte (as 3 confirmadas por consulta ao catálogo) ==

create index concurrently if not exists consent_receipts_quote_request_id_idx
  on site_private.consent_receipts (quote_request_id)
  where quote_request_id is not null;

create index concurrently if not exists consent_receipts_contact_request_id_idx
  on site_private.consent_receipts (contact_request_id)
  where contact_request_id is not null;

create index concurrently if not exists quote_adjustment_requests_requested_by_idx
  on site_private.quote_adjustment_requests (requested_by);
