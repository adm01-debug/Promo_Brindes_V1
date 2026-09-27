-- Hardening de segurança e governança após auditoria de 27/09/2026.
-- Exclusivo do Supabase isolado xlzmclcjdncjfdrjxclt.
-- Nunca aplicar no banco canônico do Promo Gifts.
--
-- PDFs são temporariamente removidos do fluxo de anexos. Uma blacklist textual
-- não consegue provar que um PDF é inerte: nomes podem ser codificados e ações
-- podem estar dentro de object streams. PNG, JPEG e WebP continuam disponíveis;
-- PDF volta somente com análise estrutural/CDR isolada e antimalware.

delete from site_private.customer_briefing_assets
where mime_type = 'application/pdf';

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']::text[]
where id = 'customer-briefing-assets';

alter table site_private.customer_briefing_assets
  drop constraint if exists customer_briefing_assets_mime_type_check;
alter table site_private.customer_briefing_assets
  add constraint customer_briefing_assets_mime_type_check
  check (mime_type in ('image/png', 'image/jpeg', 'image/webp'));

create or replace function public.create_my_briefing_asset(
  p_original_name text,
  p_mime_type text,
  p_size_bytes integer,
  p_kind text default 'reference'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_name text := btrim(pg_catalog.regexp_replace(coalesce(p_original_name, ''), '[[:cntrl:]/\\]+', ' ', 'g'));
  v_extension text;
  v_path text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if length(v_name) not between 1 and 160
    or coalesce(p_mime_type, '') not in ('image/png', 'image/jpeg', 'image/webp')
    or coalesce(p_size_bytes, 0) not between 1 and 10485760
    or coalesce(p_kind, '') not in ('logo', 'reference') then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 150922));
  if (select count(*) from site_private.customer_briefing_assets where customer_user_id = v_user_id) >= 10
    or coalesce((select sum(size_bytes) from site_private.customer_briefing_assets where customer_user_id = v_user_id), 0) + p_size_bytes > 52428800 then
    raise exception using errcode = 'P0001', message = 'briefing_asset_limit_reached';
  end if;

  v_extension := case p_mime_type
    when 'image/png' then 'png'
    when 'image/jpeg' then 'jpg'
    when 'image/webp' then 'webp'
  end;
  v_path := v_user_id::text || '/' || v_id::text || '.' || v_extension;

  insert into site_private.customer_briefing_assets (
    id, customer_user_id, kind, original_name, storage_path, mime_type, size_bytes
  ) values (
    v_id, v_user_id, p_kind, v_name, v_path, p_mime_type, p_size_bytes
  );

  return jsonb_build_object(
    'id', v_id, 'kind', p_kind, 'name', v_name, 'path', v_path,
    'mimeType', p_mime_type, 'sizeBytes', p_size_bytes,
    'expiresAt', now() + interval '30 days'
  );
end;
$$;

-- Limites persistentes por conta para os dois endpoints autenticados de maior
-- custo. O hash nunca armazena o UUID do titular no bucket efêmero.
alter table site_private.rate_limit_buckets
  drop constraint if exists rate_limit_buckets_request_kind_check;
alter table site_private.rate_limit_buckets
  add constraint rate_limit_buckets_request_kind_check
  check (request_kind in ('quote', 'contact', 'adjustment', 'briefing_asset_verification', 'proposal_download'));

create or replace function site_private.consume_rate_limit(
  p_request_kind text,
  p_identifier_hash text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if p_request_kind not in ('quote', 'contact', 'adjustment', 'briefing_asset_verification', 'proposal_download')
    or p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_window <= interval '0 seconds' then
    raise exception using errcode = '22023', message = 'invalid_rate_limit_input';
  end if;
  insert into site_private.rate_limit_buckets as bucket (
    request_kind, identifier_hash, window_started_at, request_count, updated_at
  ) values (p_request_kind, p_identifier_hash, now(), 1, now())
  on conflict (request_kind, identifier_hash) do update set
    request_count = case when bucket.window_started_at <= now() - p_window then 1 else bucket.request_count + 1 end,
    window_started_at = case when bucket.window_started_at <= now() - p_window then now() else bucket.window_started_at end,
    updated_at = now()
  returning request_count into v_count;
  if v_count > p_limit then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

create or replace function public.get_my_briefing_asset_verification(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  perform site_private.consume_rate_limit(
    'briefing_asset_verification',
    encode(extensions.digest(v_user_id::text, 'sha256'), 'hex'),
    20,
    interval '15 minutes'
  );
  return (
    select jsonb_build_object(
      'id', asset.id,
      'bucket', asset.storage_bucket,
      'path', asset.storage_path,
      'mimeType', asset.mime_type,
      'sizeBytes', asset.size_bytes,
      'verifiedAt', asset.verified_at
    )
    from site_private.customer_briefing_assets asset
    where asset.id = p_id
      and asset.customer_user_id = v_user_id
      and asset.quote_request_id is null
      and asset.expires_at > now()
  );
end;
$$;

create or replace function public.get_my_proposal_document(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_document jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  perform site_private.consume_rate_limit(
    'proposal_download',
    encode(extensions.digest(v_user_id::text, 'sha256'), 'hex'),
    30,
    interval '15 minutes'
  );
  select jsonb_build_object(
    'bucket', proposal.storage_bucket,
    'path', proposal.storage_path,
    'title', proposal.title
  ) into v_document
  from site_private.proposal_documents proposal
  join site_private.quote_requests request on request.id = proposal.quote_request_id
  where proposal.id = p_proposal_id
    and proposal.published_at is not null
    and request.customer_user_id = v_user_id
    and request.status <> 'spam';
  return v_document;
end;
$$;

-- Completa a cobertura de escritas manuais em tabelas de negócio. As duas
-- exclusões anteriores (rate_limit_buckets e status_transitions) permanecem
-- deliberadas por alto churn e por serem tabela de política, respectivamente.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'customer_briefing_assets', 'customer_occasion_favorites', 'customer_selections',
    'erased_customer_identities', 'storage_deletion_queue'
  ]
  loop
    execute format('drop trigger if exists %I_log_admin_write on site_private.%I', v_table, v_table);
    execute format(
      'create trigger %I_log_admin_write after insert or update or delete on site_private.%I for each row execute function site_private.log_admin_write()',
      v_table, v_table
    );
  end loop;
end;
$$;

-- A matriz oficial de event triggers do PostgreSQL 17 suporta estes comandos.
-- Registrar mudanças de RLS, privilégios padrão, schemas, tipos e extensões
-- fecha a lacuna de governança sem ampliar privilégios de nenhuma role.
drop event trigger if exists log_admin_ddl_trigger;
create event trigger log_admin_ddl_trigger on ddl_command_end
  when tag in (
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE FUNCTION', 'ALTER FUNCTION',
    'DROP FUNCTION', 'CREATE INDEX', 'DROP INDEX', 'CREATE TRIGGER', 'DROP TRIGGER',
    'CREATE POLICY', 'ALTER POLICY', 'DROP POLICY', 'ALTER DEFAULT PRIVILEGES',
    'CREATE SCHEMA', 'ALTER SCHEMA', 'DROP SCHEMA', 'CREATE TYPE', 'ALTER TYPE',
    'DROP TYPE', 'CREATE EXTENSION', 'ALTER EXTENSION', 'DROP EXTENSION', 'GRANT', 'REVOKE'
  )
  execute function site_private.log_admin_ddl();

comment on table site_private.customer_briefing_assets is
  'Logos e referências privadas em PNG, JPEG ou WebP. PDFs ficam bloqueados até existir análise estrutural/CDR isolada e antimalware.';
