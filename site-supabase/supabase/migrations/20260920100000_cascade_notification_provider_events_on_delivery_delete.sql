-- Achado da execução do plano de 20260917 (auditoria contínua, Etapa 31 — verificação de
-- cobertura de retenção): `site_private.finalize_expired_site_data` (Etapa 33/16-09) faz
-- `delete from site_private.notification_deliveries` diretamente para deliveries de quotes
-- e contatos expirados, mas `notification_provider_events.delivery_id` referencia essa
-- tabela sem `on delete cascade` (default: NO ACTION). Reproduzido no banco local: a
-- função inteira falha com violação de FK sempre que existe ao menos um
-- notification_provider_event para a delivery sendo purgada — ou seja, para qualquer
-- notificação que de fato recebeu um webhook de status do provedor (delivered/bounced/
-- complained), o caso comum, não a exceção. Como a função não tem tratamento de exceção
-- por linha, a falha aborta a transação inteira: nenhuma das deleções do lote (incluindo
-- contact_requests, rate_limit_buckets, shared_selections, que vêm depois no mesmo
-- statement) chega a acontecer.
--
-- notification_provider_events é metadado sobre uma delivery específica — sem valor
-- independente depois que a delivery em si é purgada — então cascade é a semântica
-- correta, não uma exclusão explícita adicional na função de retenção (mais simples e
-- protege qualquer caminho futuro de deleção de notification_deliveries, não só este).

alter table site_private.notification_provider_events
  drop constraint notification_provider_events_delivery_id_fkey,
  add constraint notification_provider_events_delivery_id_fkey
    foreign key (delivery_id) references site_private.notification_deliveries(id) on delete cascade;
