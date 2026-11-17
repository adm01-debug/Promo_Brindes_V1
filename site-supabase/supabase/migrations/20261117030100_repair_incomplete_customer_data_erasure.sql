-- Reparo dos titulares que JA pediram apagamento antes de 20261117030000.
--
-- DESTRUTIVO E SEM VOLTA. Separado em arquivo proprio de proposito: o dono pode
-- aplicar 20261117030000 (que conserta todo pedido FUTURO) sem aplicar este, e
-- este nao pode ser revertido depois de aplicado — nao ha copia dos campos.
--
-- O que apaga: briefing.actionName, campaign.occasion.name e campaign.occasion.id
-- de request_metadata, e kit_name_snapshot dos itens, das solicitacoes cujo
-- contact_name ja e o placeholder gravado pela versao antiga da funcao. E cancela
-- as entregas ainda reivindicaveis (pending/failed/processing) desses titulares,
-- que hoje podem disparar para o endereco falso @erased.invalid.
--
-- Escopo exclusivo do Supabase isolado do site xlzmclcjdncjfdrjxclt.
--
-- DESTRUTIVO E SEM VOLTA, e por isso separado e explicito: estas tres linhas completam
-- o apagamento de quem JA pediu (contact_name = placeholder, gravado pela funcao
-- antiga) e cujo texto livre sobreviveu. Sem elas o fix so vale para pedidos futuros e
-- a promessa continua falsa para os pedidos ja atendidos. Aditivo em schema; o que muda
-- e dado de titular que ja exerceu o direito de apagamento. contact_requests nao entra
-- aqui pelo mesmo motivo que nao entra na funcao (ver cabecalho da funcao acima):
-- a tabela nunca guardou campaign/briefing e nada enfileira request_kind = 'contact'.
update site_private.quote_requests request set
  request_metadata = site_private.erase_titular_request_metadata(request.request_metadata)
where request.contact_name = '[apagado a pedido do titular]'
  and request.request_metadata is distinct from site_private.erase_titular_request_metadata(request.request_metadata);

update site_private.quote_items item set
  kit_name_snapshot = '[apagado a pedido do titular]'
where item.kit_name_snapshot is not null
  and item.kit_name_snapshot <> '[apagado a pedido do titular]'
  and exists (
    select 1 from site_private.quote_requests request
    where request.id = item.quote_request_id
      and request.contact_name = '[apagado a pedido do titular]'
  );

update site_private.notification_deliveries delivery set
  status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
where delivery.status in ('pending', 'failed', 'processing')
  and delivery.request_kind = 'quote'
  and exists (
    select 1 from site_private.quote_requests request
    where request.id = delivery.request_id
      and request.contact_name = '[apagado a pedido do titular]'
  );
