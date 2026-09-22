-- Blindagem preventiva encontrada na verificação adversarial da migration
-- 20260920100000 (auditoria de 5 agentes, plano de 20260917, Etapa 31).
--
-- notification_deliveries.delivery_state_source_event_id referencia
-- notification_provider_events(id) sem on delete cascade/set null (confdeltype = 'a',
-- NO ACTION) — a mesma classe de FK que causou o bug corrigido em 20260920100000. Hoje
-- não é explorável: nenhuma rotina apaga notification_provider_events diretamente (só via
-- cascade a partir de notification_deliveries, caminho já testado e confirmado seguro —
-- o agente adversarial reproduziu inclusive a referência circular real que
-- apply_site_notification_provider_event grava em produção e confirmou que a ordem de
-- avaliação do CASCADE dentro do mesmo DELETE não deixa órfão). Mas é um ponto frágil: se
-- uma rotina futura algum dia apagar eventos de provedor diretamente (não via cascade da
-- delivery), reproduz exatamente a classe de bug já corrigida uma vez.
--
-- on delete set null é a escolha certa aqui, não cascade: apagar o EVENTO de provedor não
-- deveria apagar a DELIVERY inteira (relação é o inverso semântico do bug original) — só
-- desfazer a referência para o evento que deixou de existir.

alter table site_private.notification_deliveries
  drop constraint notification_deliveries_delivery_state_source_event_id_fkey,
  add constraint notification_deliveries_delivery_state_source_event_id_fkey
    foreign key (delivery_state_source_event_id)
    references site_private.notification_provider_events(id)
    on delete set null;
