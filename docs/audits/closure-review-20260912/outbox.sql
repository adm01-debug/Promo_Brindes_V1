-- Executar somente no container LOCAL supabase_db_site-promo-brindes.
-- Dados sintéticos, transaction rollback; não chama provedores ou serviços externos.
begin;
set local statement_timeout = '10s';

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values
  ('a0190912-0000-4000-8000-000000000001', 'audit-closure-retry-final', repeat('a',64), 'site-promo-brindes', 'Auditoria', 'Empresa sintética', 'audit@example.invalid', '11999999999', now()),
  ('a0190912-0000-4000-8000-000000000002', 'audit-closure-stale-worker', repeat('b',64), 'site-promo-brindes', 'Auditoria', 'Empresa sintética', 'audit@example.invalid', '11999999999', now());

insert into site_private.notification_deliveries (
  id, request_kind, request_id, channel, audience, status, attempts, updated_at
) values
  ('b0190912-0000-4000-8000-000000000001', 'quote', 'a0190912-0000-4000-8000-000000000001', 'whatsapp', 'customer', 'processing', 5, now() - interval '20 minutes'),
  ('b0190912-0000-4000-8000-000000000002', 'quote', 'a0190912-0000-4000-8000-000000000002', 'whatsapp', 'customer', 'processing', 4, now() - interval '20 minutes');

create temporary table audit_claim as select public.claim_site_notification_deliveries(array['whatsapp'],25) payload;
select jsonb_build_object('id','R03','scenario','fifth_attempt_crash','status',status,'attempts',attempts,
  'claimed', exists(select 1 from audit_claim, lateral jsonb_array_elements(payload) j where j->>'id'=d.id::text))
from site_private.notification_deliveries d where id='b0190912-0000-4000-8000-000000000001';

select jsonb_build_object('id','R04','scenario','old_worker_can_finalize_new_claim',
  'newAttempt',(select attempts from site_private.notification_deliveries where id='b0190912-0000-4000-8000-000000000002'),
  'oldCallAccepted',public.finalize_site_notification_delivery('b0190912-0000-4000-8000-000000000002','failed',null,null,'old_worker',300));

rollback;
