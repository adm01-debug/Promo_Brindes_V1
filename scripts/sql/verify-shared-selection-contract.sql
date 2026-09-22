-- Ensaio transacional: somente no banco isolado do site, após db:site:guard.
-- Não envia mensagens, não usa PII e reverte link/rate limit ao terminar.
begin;
set local statement_timeout = '8s';
set local lock_timeout = '2s';
do $$
declare
  v_result jsonb;
  v_read jsonb;
  v_token uuid;
  v_items jsonb := '[
    {"id":"11111111-1111-4111-8111-111111111111","q":100,"c":"Azul petróleo"},
    {"id":"22222222-2222-4222-8222-222222222222","q":200,"d":"alternative"}
  ]'::jsonb;
begin
  v_result := public.create_site_shared_selection(v_items, repeat('a',64), repeat('b',64));
  v_token := (v_result->>'token')::uuid;
  v_read := public.get_site_shared_selection(v_token, repeat('c',64));
  if v_read->'items' is distinct from v_items then
    raise exception 'shared_selection_roundtrip_failed';
  end if;
  perform public.revoke_site_shared_selection(v_token, repeat('a',64), repeat('d',64));
  if public.get_site_shared_selection(v_token, repeat('e',64)) is not null then
    raise exception 'shared_selection_revocation_failed';
  end if;
end;
$$;
select true as shared_selection_roundtrip_and_revocation_verified;
rollback;
