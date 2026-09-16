-- Etapa 25 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- api/_lib/siteDatabase.ts autentica com SITE_SUPABASE_SECRET_KEY (service_role), que
-- ignora RLS e tem select/insert/update/delete em TODAS as tabelas de site_private. O
-- vazamento dessa chave entrega o banco inteiro. site_api é uma role de privilégio
-- mínimo: só as 13 funções que api/ realmente chama com credencial de serviço (as
-- outras 5 funções granted a service_role — get_my_quote_request(s),
-- get_my_proposal_document, claim_my_quote_requests, request_my_quote_adjustment — são
-- na prática chamadas com o JWT do próprio cliente, role authenticated, encaminhado
-- por api/customer-proposals.ts; confirmado lendo o código antes de decidir o escopo).
--
-- Decisão de design importante: as 13 funções são SECURITY INVOKER, não DEFINER.
-- Converter para DEFINER seria a alternativa mais simples (só EXECUTE bastaria), mas é
-- mais arriscada — qualquer bug numa função DEFINER expõe o privilégio elevado do dono,
-- não o da role limitada que a chamou. Mantidas INVOKER: site_api recebe grants diretos
-- e estreitos por tabela/operação, exatamente o que cada função (e os triggers que ela
-- aciona em cascata — protocolo, timeline, fila, rate limit) realmente usa. Mapeado por
-- leitura de pg_proc.prosrc no banco local e validado empiricamente com `set role
-- site_api` executando as 13 funções de ponta a ponta (ver
-- site-supabase/supabase/tests/database/site_api_privileges.test.sql).
--
-- O corte de produção (trocar a variável na Vercel, gerar o JWT com role:site_api) é
-- deliberadamente um passo manual separado, fora desta migration — ver
-- docs/RUNBOOK_SITE_API_CUTOVER.md.

create role site_api nologin noinherit bypassrls;
comment on role site_api is
  'Etapa 25: role de privilégio mínimo para api/_lib/siteDatabase.ts. Só EXECUTE nas 13 RPCs de serviço e os grants de tabela/sequência estritamente necessários para elas (SECURITY INVOKER).';

-- bypassrls: todas as 13 tabelas de site_private têm RLS habilitada e ZERO policies
-- (deny-all por padrão para quem não é dona nem tem bypassrls — confirmado ao rodar o
-- teste empírico abaixo sem este atributo: toda escrita falhava com 42501). service_role
-- também tem bypassrls por convenção do Supabase; a redução de privilégio real de
-- site_api não vem de RLS (que exigiria reescrever, em policies, exatamente a mesma
-- lógica de autorização que já vive nas funções SECURITY INVOKER — duplicando a fonte
-- de verdade), vem de limitar QUAIS tabelas/operações são alcançáveis: de "todas as
-- tabelas, todas as operações" (service_role) para só as 13 combinações
-- tabela×operação que as 13 RPCs de serviço realmente usam.

grant site_api to authenticator;
grant usage on schema public to site_api;
grant usage on schema site_private to site_api;

-- === EXECUTE: as 13 RPCs de serviço + as funções/triggers que elas acionam =========

grant execute on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) to site_api;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to site_api;
grant execute on function public.claim_site_quote_notification(uuid, text) to site_api;
grant execute on function public.create_site_contact_request(jsonb, jsonb) to site_api;
grant execute on function public.create_site_quote_request(jsonb, jsonb) to site_api;
grant execute on function public.create_site_shared_selection(jsonb, text, text) to site_api;
grant execute on function public.finalize_site_data_retention(uuid[], text[], integer) to site_api;
grant execute on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) to site_api;
grant execute on function public.get_site_data_retention_candidates(integer) to site_api;
grant execute on function public.get_site_shared_selection(uuid) to site_api;
grant execute on function public.record_site_notification_provider_acceptance(uuid, uuid, text, text) to site_api;
grant execute on function public.revoke_site_shared_selection(uuid, text) to site_api;
grant execute on function public.site_notification_queue_health() to site_api;

-- Funções internas de site_private chamadas por dentro das 13 acima, ou por triggers
-- que elas disparam em cascata (todas SECURITY INVOKER: executam com o privilégio de
-- quem chama, não do dono).
grant execute on function site_private.consume_rate_limit(text, text, integer, interval) to site_api;
grant execute on function site_private.notification_policy() to site_api;
grant execute on function site_private.next_retry_at(smallint, timestamptz, double precision) to site_api;
grant execute on function site_private.get_expired_site_data_candidates(integer) to site_api;
grant execute on function site_private.finalize_expired_site_data(uuid[], text[], integer) to site_api;
grant execute on function site_private.set_updated_at() to site_api;
grant execute on function site_private.assign_quote_protocol() to site_api;
grant execute on function site_private.mod11_check_digit(text) to site_api;
grant execute on function site_private.enqueue_quote_confirmations() to site_api;
grant execute on function site_private.record_quote_status_event() to site_api;
grant execute on function site_private.enforce_status_transition() to site_api;
grant execute on function site_private.normalize_email(text) to site_api;

grant usage on sequence site_private.quote_protocol_seq to site_api;

-- === Tabelas: só select/insert/update/delete pontuais, nunca "all tables" ===========
--
-- Nenhuma linha abaixo concede mais do que a operação que alguma das 13 funções (ou
-- seus triggers) realmente executa. select é necessário mesmo em tabelas só-de-escrita
-- porque insert ... on conflict, upsert e verificações de duplicata (client_request_id,
-- etc.) fazem leitura.

grant select, insert on site_private.quote_requests to site_api;
grant delete on site_private.quote_requests to site_api; -- retention (finalize_expired_site_data)
grant select, insert on site_private.quote_items to site_api;
grant select, insert on site_private.consent_receipts to site_api;
grant select, insert, delete on site_private.contact_requests to site_api; -- delete: retention
grant select, insert, update on site_private.notification_deliveries to site_api;
grant delete on site_private.notification_deliveries to site_api; -- retention
grant select, insert on site_private.notification_provider_events to site_api;
grant select, insert on site_private.quote_request_events to site_api;
grant select, insert, update on site_private.rate_limit_buckets to site_api;
grant delete on site_private.rate_limit_buckets to site_api; -- retention
grant select, insert, update on site_private.shared_selections to site_api;
grant delete on site_private.shared_selections to site_api; -- retention
grant select, insert, update on site_private.shared_selection_rate_limits to site_api;
grant delete on site_private.shared_selection_rate_limits to site_api; -- retention
grant select, delete on site_private.proposal_documents to site_api; -- retention lê e apaga; nunca insere (isso é fluxo administrativo, fora do escopo de site_api)
grant select on site_private.status_transitions to site_api; -- lido pelo trigger enforce_status_transition
