-- Etapa 26 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- As 14 tabelas de site_private (13 + status_transitions, criada na Fase 1) já têm
-- `enable row level security` e zero policies — deny-all por padrão para quem não é
-- dono. `force row level security` fecha a última brecha: sem `force`, o DONO da tabela
-- (o role que rodou as migrations) continua bypassando RLS mesmo com ela habilitada;
-- só `bypassrls` no role OU ser dono ignora RLS por padrão. Nenhuma role hoje deveria
-- se conectar como dona destas tabelas em operação normal (site_api usa bypassrls
-- explicitamente — Etapa 25 — e service_role idem, por convenção do Supabase), mas
-- `force` é defesa em profundidade: se uma nova role um dia herdar a posse por engano,
-- ainda precisa de bypassrls explícito para ler/escrever.

alter table site_private.quote_requests force row level security;
alter table site_private.quote_items force row level security;
alter table site_private.contact_requests force row level security;
alter table site_private.notification_deliveries force row level security;
alter table site_private.notification_provider_events force row level security;
alter table site_private.rate_limit_buckets force row level security;
alter table site_private.customer_profiles force row level security;
alter table site_private.quote_request_events force row level security;
alter table site_private.proposal_documents force row level security;
alter table site_private.quote_adjustment_requests force row level security;
alter table site_private.consent_receipts force row level security;
alter table site_private.shared_selections force row level security;
alter table site_private.shared_selection_rate_limits force row level security;
alter table site_private.status_transitions force row level security;

-- alter default privileges já cobre tables (20260908230000) e functions
-- (20260908230000); sequences ficava fora — a única sequence de aplicação é
-- quote_protocol_seq (Etapa 19), já revogada explicitamente na sua própria migration.
-- Adiciona o default para qualquer sequence futura não ficar acessível por acidente.
alter default privileges in schema site_private revoke all on sequences from public, anon, authenticated;
