-- Etapa 24 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Escopo revisado durante a implementação: o plano original previa normalização de
-- e-mail E telefone para E.164. E-mail é seguro de normalizar em SQL puro (trim +
-- lower, sem ambiguidade). Telefone para E.164 de verdade exige inferir código de país,
-- tratar números já formatados de jeitos diferentes e uma biblioteca de parsing decente
-- (libphonenumber ou equivalente) — não existe hoje nem no TypeScript
-- (api/_lib/contracts.ts guarda o telefone como veio, só valida formato) nem faria
-- sentido reimplementar em PL/pgSQL com garantia de correção. Implementar aqui uma
-- versão simplificada seria pior que não normalizar: criaria uma falsa sensação de
-- dado limpo. Escopo desta migration: só e-mail. Telefone para E.164 fica como
-- follow-up explícito, exigindo decisão de produto (biblioteca, suposição de país) —
-- não uma trava silenciosa.
--
-- api/_lib/contracts.ts já normaliza e-mail (trim + toLowerCase) antes de qualquer
-- insert via API — hoje o único caminho de escrita. Isto adiciona a mesma garantia no
-- banco: defesa em profundidade contra qualquer escrita futura fora da API (admin,
-- outra aplicação, correção manual via Studio).

create or replace function site_private.normalize_email(p_email text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select lower(btrim(p_email));
$$;

comment on function site_private.normalize_email(text) is
  'Etapa 24: trim + lower. Único normalizador de e-mail usado nas constraints de quote_requests, contact_requests e customer_profiles — evita que uma delas normalize diferente da outra.';

revoke all on function site_private.normalize_email(text) from public, anon, authenticated;
grant execute on function site_private.normalize_email(text) to service_role;

do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count from site_private.quote_requests
  where email <> site_private.normalize_email(email);
  if v_bad_count > 0 then
    raise exception using errcode = '23514',
      message = format('invariant_violated: %s linhas em quote_requests.email não normalizadas — corrigir antes de aplicar a constraint', v_bad_count);
  end if;

  select count(*) into v_bad_count from site_private.contact_requests
  where email <> site_private.normalize_email(email);
  if v_bad_count > 0 then
    raise exception using errcode = '23514',
      message = format('invariant_violated: %s linhas em contact_requests.email não normalizadas — corrigir antes de aplicar a constraint', v_bad_count);
  end if;

  select count(*) into v_bad_count from site_private.customer_profiles
  where verified_email <> site_private.normalize_email(verified_email);
  if v_bad_count > 0 then
    raise exception using errcode = '23514',
      message = format('invariant_violated: %s linhas em customer_profiles.verified_email não normalizadas — corrigir antes de aplicar a constraint', v_bad_count);
  end if;
end;
$$;

alter table site_private.quote_requests
  add constraint quote_requests_email_normalized_check
  check (email = site_private.normalize_email(email));

alter table site_private.contact_requests
  add constraint contact_requests_email_normalized_check
  check (email = site_private.normalize_email(email));

alter table site_private.customer_profiles
  add constraint customer_profiles_verified_email_normalized_check
  check (verified_email = site_private.normalize_email(verified_email));

comment on constraint quote_requests_email_normalized_check on site_private.quote_requests is
  'Etapa 24: e-mail sempre armazenado já normalizado (trim + lower), não só normalizado na leitura via índice.';
