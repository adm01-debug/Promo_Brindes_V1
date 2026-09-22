-- Etapa 42 do plano de 20260917. Projeto: doufsxqlfjyuvxuezpln (banco principal).
--
-- Estado atual (lido via pg_policies em 20/09/2026):
--   system_settings_admin_all           | ALL    | {authenticated}     | is_admin(auth.uid())
--   system_settings_public_read_maintenance | SELECT | {anon,authenticated} | key = 'maintenance_mode'
--
-- Para authenticated + SELECT, as duas políticas permissivas se aplicam (Postgres
-- avalia OR entre políticas permissivas do mesmo comando) — é exatamente o achado do
-- performance advisor (multiple_permissive_policies). Consolidar SEM mudar quem vê o
-- quê: dividir a política ALL do admin em INSERT/UPDATE/DELETE (deixa de cobrir SELECT)
-- e ter uma única política de SELECT com as duas condições unidas por OR. anon continua
-- só enxergando a linha de maintenance_mode (is_admin(auth.uid()) para anon não tem
-- auth.uid(), então a condição extra nunca concede nada a mais para anon).
--
-- Equivalência comportamental (antes → depois), por (role, comando):
--   authenticated + SELECT: is_admin(uid()) OR key='maintenance_mode'  → idêntico, 1 policy em vez de 2
--   authenticated + INSERT/UPDATE/DELETE: is_admin(uid())              → idêntico, sem mudança de condição
--   anon + SELECT: key='maintenance_mode'                              → idêntico (is_admin(uid()) com uid() nulo para anon é false)
--
-- Bloqueada pelo classificador de permissões do Claude Code (escrita em banco de
-- produção compartilhado, e é mudança de controle de acesso — merece revisão humana
-- antes de rodar, não só a trava automática). Rode manualmente após revisar:
--   psql "$MAIN_DB_CONNECTION_STRING" -f docs/sql/canonical-principal/pendente_consolidar_policy_system_settings.sql

begin;

drop policy if exists system_settings_admin_all on public.system_settings;

create policy system_settings_admin_insert on public.system_settings
  for insert to authenticated
  with check (is_admin((select auth.uid())));

create policy system_settings_admin_update on public.system_settings
  for update to authenticated
  using (is_admin((select auth.uid())))
  with check (is_admin((select auth.uid())));

create policy system_settings_admin_delete on public.system_settings
  for delete to authenticated
  using (is_admin((select auth.uid())));

drop policy if exists system_settings_public_read_maintenance on public.system_settings;

create policy system_settings_read on public.system_settings
  for select to anon, authenticated
  using (key = 'maintenance_mode' or is_admin((select auth.uid())));

commit;

-- Verificação pós-execução:
--   select policyname, cmd, roles from pg_policies where tablename = 'system_settings';
--   -- esperado: 4 policies (insert/update/delete de admin + select unificado), nenhuma
--   -- delas com cmd = 'ALL'.
--   get_advisors(type="performance") não deve mais listar multiple_permissive_policies
--   para system_settings.
