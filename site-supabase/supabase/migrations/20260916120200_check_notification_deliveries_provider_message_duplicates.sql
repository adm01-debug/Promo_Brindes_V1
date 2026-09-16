-- Etapa 15 do plano de correções — validação de invariante antes de tornar
-- (provider, provider_message_id) único (ver 20260916120300 em diante).
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
