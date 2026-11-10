// scripts/inventario/banco.sql contra um PostgreSQL de verdade, descartável, com as migrations
// reais de site-supabase/supabase/migrations. Prova o que o teste estático não prova: a consulta
// roda inteira numa transação SOMENTE LEITURA, como papel de leitura, e devolve o que promete.
//
// Precisa de initdb/pg_ctl/psql na máquina (runner ubuntu-24.04 tem). Sem eles — ou se o servidor
// não subir — os testes são PULADOS com o motivo, nunca falham: quem cobra o banco.sql em toda
// máquina é o teste estático de tests/inventario-estado.node.mjs.
//
//   node --test tests/inventario-banco-sql.node.mjs        (PGBIN=/caminho/bin escolhe o Postgres)
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  conferirOrigem,
  extrairInventario,
  montarInventario,
  tabelasDasMigrations,
  versoesDoRepo,
} from '../scripts/inventario/gerar-banco.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const MIGRATIONS = path.join(RAIZ, 'site-supabase/supabase/migrations');
const SQL = fs.readFileSync(path.join(RAIZ, 'scripts/inventario/banco.sql'), 'utf8');

// O mínimo do Supabase que as migrations do site pressupõem, mais dois papéis de leitura:
// um como o do endpoint read-only da Management API (BYPASSRLS) e um sujeito a RLS.
const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator nologin;
create role supabase_auth_admin nologin;
create role supabase_storage_admin nologin;
create role leitor_com_bypass login bypassrls;
grant pg_read_all_data to leitor_com_bypass;
create role leitor_sob_rls login;
grant pg_read_all_data to leitor_sob_rls;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb, created_at timestamptz default now(), email_confirmed_at timestamptz,
  deleted_at timestamptz, is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint,
  allowed_mime_types text[], owner uuid, created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, owner_id text, metadata jsonb, created_at timestamptz default now(),
  updated_at timestamptz default now(), path_tokens text[]);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable
  as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
`;

// Ledger do \`supabase db push\` e as duas tabelas do pg_cron, com o mesmo RLS que a extensão cria.
const LEDGER_E_CRON = `
create schema supabase_migrations;
create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
create schema cron;
create table cron.job (jobid bigserial primary key, schedule text not null, command text not null,
  nodename text not null default 'localhost', nodeport int not null default 5432,
  database text not null default current_database(), username text not null default current_user,
  active boolean not null default true, jobname text);
alter table cron.job enable row level security;
create policy cron_job_policy on cron.job using (username = current_user);
create table cron.job_run_details (jobid bigint, runid bigserial primary key, job_pid integer, database text,
  username text, command text, status text, return_message text, start_time timestamptz, end_time timestamptz);
alter table cron.job_run_details enable row level security;
create policy cron_job_run_details_policy on cron.job_run_details using (username = current_user);
`;

const DADOS = `
set session_replication_role = replica;
insert into site_private.notification_deliveries
  (request_kind, request_id, channel, audience, status, attempts, next_attempt_at, lease_token, lease_expires_at, last_error_code, last_error_at) values
  -- travadas de verdade: 3
  ('quote', gen_random_uuid(), 'email', 'customer', 'pending', 0, now() - interval '2 hours', null, null, null, null),
  ('quote', gen_random_uuid(), 'email', 'customer', 'failed', 2, now() - interval '1 hour', null, null, 'smtp_timeout', now() - interval '1 hour'),
  ('quote', gen_random_uuid(), 'whatsapp', 'customer', 'processing', 1, now() - interval '3 hours', gen_random_uuid(), now() - interval '2 hours', null, null),
  -- em andamento ou no prazo: não é travada
  ('quote', gen_random_uuid(), 'email', 'customer', 'pending', 0, now(), null, null, null, null),
  ('quote', gen_random_uuid(), 'whatsapp', 'customer', 'processing', 1, now() - interval '3 hours', gen_random_uuid(), now() + interval '5 minutes', null, null),
  -- estados finais com next_attempt_at antigo: nunca são travada
  ('quote', gen_random_uuid(), 'email', 'customer', 'exhausted', 5, now() - interval '3 days', null, null, 'email_provider_not_configured', now() - interval '3 days'),
  ('quote', gen_random_uuid(), 'whatsapp', 'customer', 'exhausted', 5, now() - interval '1 day', null, null,
   'Falha ao enviar para maria.silva@cliente.example (+55 11 99999-0000)', now() - interval '1 day'),
  ('quote', gen_random_uuid(), 'email', 'customer', 'cancelled', 1, now() - interval '2 days', null, null, null, null),
  ('quote', gen_random_uuid(), 'email', 'customer', 'sent', 1, now() - interval '5 days', null, null, 'fetch failed', now() - interval '5 days'),
  -- erro antigo, fora da janela de 7 dias
  ('quote', gen_random_uuid(), 'whatsapp', 'customer', 'sent', 2, now() - interval '30 days', null, null, 'erro_antigo', now() - interval '30 days');
insert into site_private.storage_deletion_queue (bucket, object_path, queued_at)
  values ('customer-briefing-assets', 'cliente-1/logo-secreto.png', '2026-01-02 03:04:05+00');
insert into cron.job (schedule, command, jobname, active) values
  ('*/5 * * * *', $c$select net.http_post(url := 'https://hook.example/api?token=SEGREDO_DA_URL',
      headers := '{"Authorization":"Bearer abcdefghijklmnopqrstuvwxyz0123456789"}'::jsonb);
    select public.site_notification_queue_health()$c$, 'fila', true),
  ('0 3 * * *', 'select 1', null, true),
  ('0 4 * * *', 'select 2', null, false);
insert into cron.job_run_details (jobid, status, start_time, end_time, username, return_message)
  select 1, case when g % 2 = 0 then 'failed' else 'succeeded' end, now() - g * interval '1 hour',
         now() - g * interval '1 hour' + interval '2 seconds', 'postgres', 'mensagem com dado de linha'
    from generate_series(1, 20) g;
insert into cron.job_run_details (jobid, status, start_time, end_time, username)
  values (2, 'failed', now() - interval '10 days', now() - interval '10 days', 'postgres');
`;

// Nomes que quebram SQL montado por concatenação, regex e ordenação.
const HOSTIL = `
create table site_private."Pedidos Ação ""x"" 'y'" (id int);
insert into site_private."Pedidos Ação ""x"" 'y'" values (1), (2);
create table site_private."a$b" (id int);
create table site_private."x(y" (id int);
create table site_private."t""; drop table site_private.quote_requests; --" (id int);
create view public.v_usa_cifrao as select * from site_private."a$b";
create function public.sobrecarga(text) returns int language sql security definer set search_path = '' as $f$ select 2 $f$;
create function public.sobrecarga(integer) returns int language sql as $f$ select 1 $f$;
`;

function acharBinarios() {
  const candidatos = [process.env.PGBIN];
  for (const base of ['/usr/lib/postgresql', '/usr/local/opt', '/opt/homebrew/opt']) {
    if (!fs.existsSync(base)) continue;
    for (const versao of fs.readdirSync(base).sort().reverse()) candidatos.push(path.join(base, versao, 'bin'));
  }
  candidatos.push(...(process.env.PATH ?? '').split(path.delimiter));
  const dir = candidatos.find((d) => d && ['initdb', 'pg_ctl', 'psql'].every((b) => fs.existsSync(path.join(d, b))));
  return dir ? { initdb: path.join(dir, 'initdb'), pgCtl: path.join(dir, 'pg_ctl'), psql: path.join(dir, 'psql') } : null;
}

/** Sobe o servidor (só socket unix, sem TCP). Devolve `{ motivo }` quando não dá, para o teste pular. */
function subirPostgres() {
  const bin = acharBinarios();
  if (!bin) return { motivo: 'initdb/pg_ctl/psql não encontrados (defina PGBIN para apontar o PostgreSQL)' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-pg-'));
  const porta = String(20000 + (process.pid % 20000));
  // O servidor não roda como root: nesse caso usa o usuário `postgres` do sistema, se existir.
  let como = [];
  let parar = () => {};
  try {
    if (process.getuid?.() === 0) {
      const uid = Number(execFileSync('id', ['-u', 'postgres'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
      const gid = Number(execFileSync('id', ['-g', 'postgres'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
      fs.chownSync(dir, uid, gid);
      como = ['runuser', '-u', 'postgres', '--'];
    }
    const rodar = (comando, args) => execFileSync(como[0] ?? comando, [...como.slice(1), ...(como.length ? [comando] : []), ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: dir,
    });
    const dados = path.join(dir, 'dados');
    rodar(bin.initdb, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C']);
    const opcoes = `-c listen_addresses='' -c unix_socket_directories='${dir}' -p ${porta} -c fsync=off -c autovacuum=off`;
    rodar(bin.pgCtl, ['-D', dados, '-l', path.join(dir, 'servidor.log'), '-o', opcoes, '-w', '-t', '60', 'start']);
    parar = () => {
      try { rodar(bin.pgCtl, ['-D', dados, '-m', 'immediate', '-w', 'stop']); } catch { /* já parado */ }
      fs.rmSync(dir, { recursive: true, force: true });
    };
    const psql = (banco, sql, papel = 'postgres') => execFileSync(bin.psql, [
      '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-h', dir, '-p', porta, '-U', papel, '-d', banco, '-f', '-',
    ], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });

    psql('postgres', 'create database site;');
    psql('site', STUBS);
    for (const arquivo of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
      psql('site', fs.readFileSync(path.join(MIGRATIONS, arquivo), 'utf8'));
    }
    return { psql, parar, versao: psql('postgres', 'show server_version;').trim() };
  } catch (erro) {
    parar();
    fs.rmSync(dir, { recursive: true, force: true });
    const detalhe = String(erro.stderr || erro.message).trim().split('\n').slice(-2).join(' | ').slice(0, 300);
    return { motivo: `PostgreSQL descartável não subiu ou não aceitou as migrations: ${detalhe}` };
  }
}

const pg = subirPostgres();
after(() => pg.parar?.());
const pular = pg.motivo ? { skip: pg.motivo } : {};

// Daqui para baixo o servidor existe: erro nos dados do teste é falha, não motivo para pular.
if (!pg.motivo) {
  try {
    const ledger = versoesDoRepo(RAIZ).map((v) => `('${v}')`).join(', ');
    pg.psql('postgres', 'create database cheio template site;');
    pg.psql('cheio', `${LEDGER_E_CRON}\ninsert into supabase_migrations.schema_migrations (version) values ${ledger};\n${DADOS}`);
    pg.psql('postgres', 'create database hostil template cheio;');
    pg.psql('hostil', HOSTIL);
  } catch (erro) {
    pg.parar();
    throw new Error(`dados do teste não entraram no PostgreSQL descartável: ${String(erro.stderr || erro.message).trim().slice(-400)}`, { cause: erro });
  }
}

/** Roda o banco.sql como a Management API roda: uma transação somente leitura, papel de leitura. */
function inventariar(banco, papel = 'leitor_com_bypass') {
  const saida = pg.psql(banco, `begin transaction read only;\n${SQL}\ncommit;`, papel);
  return JSON.parse(saida.trim());
}

test('banco.sql roda inteiro em transação somente leitura e passa na prova de origem', pular, () => {
  const dado = extrairInventario([{ inventario: inventariar('cheio') }]);
  const origem = conferirOrigem(dado, tabelasDasMigrations(RAIZ), versoesDoRepo(RAIZ));
  assert.equal(origem.tabelas_das_migrations_presentes, origem.tabelas_nas_migrations);
  assert.equal(dado.resumo.ledger_registros, versoesDoRepo(RAIZ).length);
  assert.equal(dado.resumo.leitura_filtrada_por_rls, 0);
  assert.equal(dado.resumo.postgres, pg.versao);
  assert.deepEqual(dado.resumo.schemas, ['public', 'site_private']);
  assert.ok(dado.tabelas.every((t) => t.esquema === 'site_private' && t.linhas_exatas === true && Number.isInteger(t.linhas)));
  assert.deepEqual(dado.tabelas.map((t) => t.nome), dado.tabelas.map((t) => t.nome).toSorted());
  // status_transitions é populada pelas migrations e tem RLS forçado sem policy: prova que a contagem ignora RLS.
  const transicoes = dado.tabelas.find((t) => t.nome === 'status_transitions');
  assert.ok(transicoes.rls && transicoes.rls_forcado && transicoes.policies === 0 && transicoes.linhas > 0);
  assert.ok(dado.funcoes.some((f) => f.nome === 'site_notification_queue_health' && f.esquema === 'public' && f.search_path_fixo));
});

test('banco.sql: a transação somente leitura barra escrita, e a consulta não muda nada no banco', pular, () => {
  assert.throws(
    () => pg.psql('cheio', 'begin transaction read only;\ndelete from site_private.storage_deletion_queue;\ncommit;', 'leitor_com_bypass'),
    /read-only transaction|permission denied/,
  );
  const antes = pg.psql('cheio', 'select count(*) from site_private.storage_deletion_queue;').trim();
  inventariar('cheio');
  assert.equal(pg.psql('cheio', 'select count(*) from site_private.storage_deletion_queue;').trim(), antes);
});

test('banco.sql: fila travada conta só o que ainda vai ser tentado; erro sai como código, nunca como texto', pular, () => {
  const dado = inventariar('cheio');
  assert.equal(dado.fila.notificacao_vencidas, 3, 'pending vencida + failed vencida + processing com lease vencido');
  assert.deepEqual(dado.fila.notificacao_por_status, { cancelled: 1, exhausted: 2, failed: 1, pending: 2, processing: 2, sent: 2 });
  assert.deepEqual(dado.fila.notificacao_erros_7d, { email_provider_not_configured: 1, fora_do_padrao: 2, smtp_timeout: 1 });
  assert.equal(dado.fila.notificacao_tentativas_max, 5);
  assert.equal(dado.fila.remocao_storage_pendente, 1);
  assert.equal(dado.fila.remocao_storage_mais_antiga, '2026-01-02T03:04:05Z');

  const inventario = montarInventario(extrairInventario(dado), {}, {}, {});
  const porTipo = Object.fromEntries(inventario.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.match(porTipo.fila_notificacao_travada[0], /^3 entrega/);
  assert.match(porTipo.fila_notificacao_esgotada[0], /^2 entrega/);
  assert.deepEqual(porTipo.fila_notificacao_com_erro, ['email_provider_not_configured: 1', 'fora_do_padrao: 2', 'smtp_timeout: 1']);
  assert.ok(porTipo.remocao_storage_atrasada);
  // Nada de dado de linha: destinatário, caminho de arquivo, comando ou mensagem do cron.
  assert.doesNotMatch(JSON.stringify(inventario), /maria|cliente\.example|99999|logo-secreto|SEGREDO_DA_URL|Bearer|hook\.example|dado de linha|fetch failed/);
});

test('banco.sql: pg_cron sai com nome estável, só o nome das funções chamadas e as contas certas', pular, () => {
  const { cron, resumo } = inventariar('cheio');
  assert.equal(cron.disponivel, true);
  assert.deepEqual(cron.jobs.map((j) => [j.nome, j.agenda, j.ativo]), [
    ['fila', '*/5 * * * *', true], ['job_2', '0 3 * * *', true], ['job_3', '0 4 * * *', false],
  ]);
  assert.deepEqual(cron.jobs[0].chama, ['net.http_post', 'public.site_notification_queue_health']);
  assert.deepEqual(
    { e7: cron.jobs[0].execucoes_7d, f7: cron.jobs[0].falhas_7d, taxa: cron.jobs[0].taxa_falha_7d_pct, dur: cron.jobs[0].duracao_max_s_7d },
    { e7: 20, f7: 10, taxa: 50, dur: 2 },
  );
  assert.match(cron.jobs[0].ultima_falha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.deepEqual({ e7: cron.jobs[1].execucoes_7d, taxa: cron.jobs[1].taxa_falha_7d_pct, ultima: cron.jobs[1].ultima_falha }, { e7: 0, taxa: 0, ultima: null });
  assert.deepEqual(cron.historico, { linhas: 21, mais_de_7_dias: 1 });
  assert.ok(cron.horas_paradas_7d.length >= 1 && cron.horas_paradas_7d.every((h) => /^\d{4}-\d{2}-\d{2}T\d{2}:00Z$/.test(h.hora)));
  assert.deepEqual(cron.horas_paradas_7d.map((h) => h.hora), cron.horas_paradas_7d.map((h) => h.hora).toSorted());
  assert.deepEqual({ jobs: resumo.cron_jobs, ativos: resumo.cron_ativos }, { jobs: 3, ativos: 2 });
});

test('banco.sql: sem pg_cron e sem ledger a consulta não quebra, e o gerador recusa o banco sem ledger', pular, () => {
  const dado = inventariar('site');
  assert.deepEqual(dado.cron, { disponivel: false, jobs: [], horas_paradas_7d: [], historico: { linhas: 0, mais_de_7_dias: 0 } });
  assert.deepEqual({ r: dado.resumo.ledger_registros, v: dado.resumo.ledger_versao_max }, { r: 0, v: null });
  assert.equal(dado.fila.notificacao_vencidas, 0);
  assert.throws(
    () => conferirOrigem(extrairInventario(dado), tabelasDasMigrations(RAIZ), versoesDoRepo(RAIZ)),
    /nao tem ledger de migrations/,
  );
});

test('banco.sql: nome com aspas, acento, $, parêntese e tentativa de injeção não quebra nem engana a consulta', pular, () => {
  const dado = inventariar('hostil');
  const porNome = Object.fromEntries(dado.tabelas.map((t) => [t.nome, t]));
  assert.equal(porNome['Pedidos Ação "x" \'y\''].linhas, 2);
  assert.equal(porNome['a$b'].citada_no_banco, true, 'view cita a tabela: o $ do nome não pode virar âncora de regex');
  assert.equal(porNome['x(y'].citada_no_banco, false);
  assert.equal(porNome['t"; drop table site_private.quote_requests; --'].linhas, 0);
  assert.equal(porNome.quote_requests.linhas, 0, 'a tabela do "drop" continua lá');
  assert.deepEqual(dado.tabelas.map((t) => t.nome), dado.tabelas.map((t) => t.nome).toSorted());
  // Sobrecarga: ordem pelo tipo do argumento, não pela ordem de criação.
  assert.deepEqual(dado.funcoes.filter((f) => f.nome === 'sobrecarga').map((f) => f.security_definer), [false, true]);
  assert.equal(extrairInventario(dado).format_version, 1);
});

test('banco.sql: papel sujeito a RLS é denunciado e o gerador recusa, em vez de publicar tudo zerado', pular, () => {
  const dado = inventariar('cheio', 'leitor_sob_rls');
  assert.ok(dado.tabelas.every((t) => t.linhas === 0), 'sob RLS as contagens saem 0 falsos');
  assert.deepEqual(dado.cron.jobs, []);
  assert.equal(dado.resumo.leitura_filtrada_por_rls, dado.tabelas.length + 2);
  assert.throws(() => extrairInventario(dado), /sujeito a RLS/);
});

test('banco.sql: duas execuções seguidas dão o mesmo resultado, fora o carimbo de data', pular, () => {
  const semCarimbo = (dado) => ({ ...dado, medido_em: null });
  assert.deepEqual(semCarimbo(inventariar('hostil')), semCarimbo(inventariar('hostil')));
  assert.match(inventariar('hostil').medido_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});
