// Teste do gerador de contexto (scripts/ai-context/gerar.mjs).
// Monta um repositório sintético em pasta temporária cobrindo os casos que o gerador precisa
// entender (rotas aninhadas, lazy, menu, hooks, edge functions, migrations em ordem,
// barrel re-export, backend HTTP, Python, nested tsconfig) e confere a saída.
// Rodar: node --test scripts/ai-context/gerar.unit.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const GERADOR = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'gerar.mjs');
const w = (root, rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-ia-'));
  w(root, 'package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { dev: 'vite', test: 'vitest run', audit: 'node scripts/audit.mjs' }, dependencies: { react: '18', 'react-router-dom': '6', '@supabase/supabase-js': '2', express: '4', stripe: '14' }, devDependencies: { vitest: '1', typescript: '5', vite: '5' } }));
  w(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, paths: { '@/*': ['./src/*'] } } }));
  w(root, '.env.example', 'VITE_SUPABASE_URL=\nVITE_API_KEY=\n');
  w(root, 'README.md', '# Fixture\n');
  w(root, 'src/main.tsx', `import { QueryClientProvider } from '@tanstack/react-query';\nimport { AppRoutes } from '@/routes/AppRoutes';\nexport const Root = () => <QueryClientProvider><AppRoutes/></QueryClientProvider>;`);
  w(root, 'src/routes/AppRoutes.tsx', `import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Login from '@/pages/Login';
import { lazy } from 'react';
const Admin = lazy(() => import('@/pages/admin/Admin'));
export function AppRoutes() {
  return (<Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/app" element={<ProtectedRoute><Shell /></ProtectedRoute>}>
      <Route index element={<Home />} />
      <Route path="contacts/:id" element={<ContactPage />} />
    </Route>
    <Route path="/admin" element={<Admin />} />
    <Route {...{ path: '/access-denied' }} element={<Login />} />
    <Route path="/old" element={<Navigate to="/app" />} />
  </Routes>);
}
import { Shell } from '@/components/layout/Shell';
import { Home } from '@/components/home/Home';
import { ContactPage } from '@/components/contacts/ContactPage';`);
  w(root, 'src/components/auth/ProtectedRoute.tsx', `export const ProtectedRoute = ({ children }) => <>{children}</>;`);
  w(root, 'src/components/layout/Shell.tsx', `import { Outlet } from 'react-router-dom';\nexport const Shell = () => <div><Outlet/></div>;`);
  w(root, 'src/pages/ViewRouter.tsx', `import * as Views from '@/pages/lazyViews';\nconst VIEW_MAP = { home: Views.HomeLazy };\nconst SPECIAL_VIEWS = {\n  'achievements': (props) => (\n    <Boundary><Views.AchievementsLazy userId={props.userId} /></Boundary>\n  ),\n};\nexport const ViewRouter = ({ v }) => SPECIAL_VIEWS[v] ? SPECIAL_VIEWS[v]({}) : null;`);
  w(root, 'src/pages/lazyViews.ts', `import { lazy } from 'react';\nexport const HomeLazy = lazy(() => import('@/components/home/Home').then(m => ({ default: m.Home })));\nexport const AchievementsLazy = lazy(() => import('@/components/achievements/Achievements'));`);
  w(root, 'src/components/achievements/Achievements.tsx', `export default function Achievements() { return <ol/>; }`);
  w(root, 'src/components/layout/sidebarNav.ts', `const STAFF: string[] = ['admin', 'supervisor'];\nexport const sidebarGroups = [{ title: 'Principal', items: [{ id: 'home', label: 'Início', path: '/app' }, { id: 'contacts', label: 'Contatos', path: '/app/contacts/:id', roles: ['admin'] }, { id: 'staff', label: 'Equipe', path: '/admin', roles: STAFF }, { id: 'x', label: 'Externo', path: '/login', roles: EXTERNAL }, { id: 'ghost', label: 'Fantasma', path: '/nada' }] }];`);
  w(root, 'src/components/home/Home.tsx', `import { useContacts } from '@/hooks/useContacts';\nexport const Home = () => { const c = useContacts(); return <div>{c.length}</div>; };`);
  w(root, 'src/components/contacts/ContactPage.tsx', `import { Card } from '@/components/ui';\nimport { useContacts } from '@/hooks/useContacts';\nexport const ContactPage = () => { useContacts(); return <Card/>; };`);
  w(root, 'src/components/ui/index.ts', `export { Card } from './Card';\nexport * from './Button';`);
  w(root, 'src/components/ui/Card.tsx', `export const Card = () => <div/>;`);
  w(root, 'src/components/ui/Button.tsx', `export const Button = () => <button/>;`);
  w(root, 'src/components/ui/Unused.tsx', `export const Unused = () => <i/>;`);
  w(root, 'src/pages/Login.tsx', `export default function Login() { return <form/>; }`);
  w(root, 'src/pages/admin/Admin.tsx', `import { supabase } from '@/lib/supabase';\nexport const Admin = () => { const role = 'admin'; if (role === 'admin') supabase.rpc('is_admin'); return <div/>; };`);
  w(root, 'src/hooks/useContacts.ts', `import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
export function useContacts() { return useQuery(['c'], async () => { const { data } = await supabase.from('contacts').select('*'); await supabase.functions.invoke('send-email', { body: {} }); return data; }); }`);
  w(root, 'src/lib/supabase.ts', `import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_ANON);\nconst flag = isFeatureEnabled('novo-inbox');`);
  w(root, 'src/hooks/__tests__/useContacts.test.ts', `import { useContacts } from '../useContacts';\nit('x', () => {}); test('y', () => {});`);
  w(root, 'server/api.ts', `import express from 'express';\nconst app = express();\napp.get('/health', (req, res) => res.send('ok'));\napp.post('/webhook/stripe', handler);`);
  w(root, 'backend/app.py', `from fastapi import FastAPI\nimport os\nfrom . import models\napp = FastAPI()\n@app.get('/items')\ndef items():\n    return os.environ.get('DB_URL')\n`);
  w(root, 'backend/models.py', `from sqlalchemy.orm import DeclarativeBase\nclass Base(DeclarativeBase):\n    pass\nclass Item(Base):\n    pass\n`);
  w(root, 'supabase/config.toml', `project_id = "x"\n\n[functions.stripe-webhook]\nverify_jwt = false\n`);
  w(root, 'supabase/functions/send-email/index.ts', `const key = Deno.env.get('RESEND_API_KEY');\nDeno.serve(async (req) => { if (req.method === 'POST') { await supabase.from('emails').insert({}); } return fetch('https://api.resend.com/x'); });`);
  w(root, 'supabase/functions/stripe-webhook/index.ts', `Deno.serve(async (req) => { await supabase.from('payments').insert({}); return new Response('ok'); });`);
  w(root, 'supabase/functions/orphan-fn/index.ts', `Deno.serve(() => new Response('x'));`);
  w(root, 'supabase/migrations/001_init.sql', `create table public.contacts (id uuid primary key default gen_random_uuid(), name text not null, email text, "createdAt" timestamptz default now(), lat double precision, created2 timestamp with time zone);
alter table public.contacts enable row level security;
create policy "contacts_select" on public.contacts for select to authenticated using (true);
create index contacts_email_idx on public.contacts (email);
create table public.legacy (id int);
create table public.emails (id uuid primary key, contact_id uuid references public.contacts(id));
create or replace function public.is_admin(uid uuid) returns boolean language sql as $$ select true; $$;
create type public.app_role as enum ('admin', 'agent');
insert into storage.buckets (id, name) values ('avatars', 'avatars');
select cron.schedule('nightly', '0 3 * * *', $$ select net.http_post('https://x.supabase.co/functions/v1/send-email') $$);`);
  w(root, 'supabase/migrations/002_evolve.sql', `alter table public.contacts add column phone text, drop column email;
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated using (auth.uid() = id);
create policy "contacts_insert" on public.contacts for insert to authenticated with check (true);
drop table public.legacy;
create table public.payments (id uuid primary key, amount numeric);
create trigger trg_pay after insert on public.payments for each row execute function public.is_admin();
alter table public.contacts alter column phone set not null, alter column phone set default 'n/a';
do $$ begin
  drop policy if exists "contacts_insert" on public.contacts;
  create policy "contacts_insert" on public.contacts for insert to service_role with check (true);
  execute format('create policy %I on public.payments for select using (true)', 'dyn');
end $$;`);
  w(root, 'src/integrations/supabase/types.ts', `export type Database = {\n  public: {\n    Tables: {\n      contacts: {\n        Row: {\n          id: string\n          name: string\n          phone: string | null\n          extra_col: string\n        }\n        Insert: { id?: string }\n      }\n    }\n  }\n}`);
  w(root, 'scripts/audit.mjs', `// Audita o banco.\nconsole.log(process.env.DB_URL);`);
  w(root, 'scripts/orphan.sh', `#!/bin/sh\necho x`);
  w(root, '.github/workflows/ci.yml', `name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run test\n      - run: node scripts/audit.mjs\n        env:\n          T: \${{ secrets.DB_TOKEN }}\n`);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'feat: fixture'], { cwd: root });
  return root;
}

const root = fixture();
const out = path.join(root, 'inventario/ia');
execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
const J = (f) => JSON.parse(fs.readFileSync(path.join(out, f), 'utf8'));

test('gera todos os arquivos e sem erros de seção', () => {
  for (const f of ['INDEX.md', 'manifest.json', 'rotas.json', 'modulos.json', 'componentes.json', 'hooks.json', 'edge-functions.json', 'banco.json', 'ferramentas.json', 'scripts.json', 'testes.json', 'logica.json', 'grafo.json', 'grafo-arestas.json', 'convencoes.json', 'baseline.json', 'grafo-graphify.json']) assert.ok(fs.existsSync(path.join(out, f)), f);
  assert.deepEqual(J('manifest.json').erros, []);
  assert.equal(J('manifest.json').commit.length, 40);
});

test('rotas: aninhamento, index, lazy, proteção herdada e fecho transitivo', () => {
  const r = J('rotas.json'); const by = Object.fromEntries(r.urls.filter((u) => !u.indice).map((u) => [u.caminho, u]));
  assert.equal(by['/login'].arquivo, 'src/pages/Login.tsx');
  assert.equal(by['/app'].arquivo, 'src/components/layout/Shell.tsx');
  assert.equal(by['/app'].protegida, true);
  assert.equal(by['/app/contacts/:id'].arquivo, 'src/components/contacts/ContactPage.tsx');
  assert.equal(by['/app/contacts/:id'].pai, '/app');
  assert.equal(by['/app/contacts/:id'].protegida, true, 'filha herda proteção do pai');
  assert.ok(r.urls.some((u) => u.indice && u.caminho === '/app' && u.arquivo === 'src/components/home/Home.tsx'), 'rota index');
  assert.equal(by['/admin'].lazy, true);
  assert.equal(by['/admin'].arquivo, 'src/pages/admin/Admin.tsx');
  assert.deepEqual(by['/app/contacts/:id'].tabelas, ['contacts']);
  assert.deepEqual(by['/app/contacts/:id'].edges, ['send-email']);
  assert.deepEqual(by['/app/contacts/:id'].hooks_locais, ['useContacts']);
  assert.deepEqual(by['/admin'].papeis, ['admin']);
  assert.equal(by['/access-denied'].arquivo, 'src/pages/Login.tsx', 'path via spread');
  assert.equal(by['/old'].tipo, 'redirect'); assert.equal(by['/old'].redireciona, '/app');
  const vistas = Object.fromEntries(r.vistas.map((v) => [v.id, v]));
  assert.equal(vistas.home.arquivo, 'src/components/home/Home.tsx');
  assert.equal(vistas.achievements.arquivo, 'src/components/achievements/Achievements.tsx', 'SPECIAL_VIEWS com função');
});

test('rotas HTTP de backend (express) e Python (FastAPI)', () => {
  const r = J('rotas.json');
  assert.ok(r.rotas_http_backend.some((x) => x.metodo === 'GET' && x.caminho === '/health' && x.arquivo === 'server/api.ts'));
  assert.ok(r.rotas_http_backend.some((x) => x.metodo === 'GET' && x.caminho === '/items' && x.arquivo === 'backend/app.py'));
});

test('menu: resolve destino, grupo, papéis e aponta item sem destino', () => {
  const r = J('rotas.json'); const m = Object.fromEntries(r.menu.map((x) => [x.rotulo, x]));
  assert.equal(m['Início'].resolve_para, 'src/components/layout/Shell.tsx');
  assert.equal(m['Início'].grupo, 'Principal');
  assert.deepEqual(m['Contatos'].papeis, ['admin']);
  assert.deepEqual(J('baseline.json').alertas.menu_sem_destino, ['Fantasma -> /nada']);
  assert.deepEqual(m['Equipe'].papeis, ['admin', 'supervisor'], 'roles por constante');
  assert.equal(m['Externo'].papeis_nao_resolvidos, 'EXTERNAL');
});

test('módulos: menu → módulo → hooks → edges → tabelas', () => {
  const mod = J('modulos.json').modulos.find((x) => x.modulo === 'components/contacts');
  assert.deepEqual(mod.itens_menu, ['Contatos']);
  assert.deepEqual(mod.hooks_locais, ['useContacts']);
  assert.deepEqual(mod.edges, ['send-email']);
  assert.deepEqual(mod.tabelas, ['contacts']);
  assert.ok(mod.depende_de_modulos.includes('hooks/useContacts.ts') || mod.depende_de_modulos.includes('hooks'));
  assert.ok(mod.depende_de_modulos.includes('components/ui'));
});

test('barrel re-export não gera órfão; componente sem uso é órfão', () => {
  const co = J('componentes.json'); const by = Object.fromEntries(co.componentes.map((x) => [x.arquivo, x]));
  assert.equal(by['src/components/ui/Card.tsx'].orfao, false, 'reexportado pelo index.ts');
  assert.equal(by['src/components/ui/Button.tsx'].orfao, false, 'export * from');
  assert.equal(by['src/components/ui/Unused.tsx'].orfao, true);
  assert.ok(J('componentes.json').componentes.some((x) => x.arquivo === 'src/pages/Login.tsx' && x.export_default === 'Login'));
});

test('hooks: tabelas/edges e cobertura por teste', () => {
  const h = J('hooks.json').hooks.find((x) => x.arquivo === 'src/hooks/useContacts.ts');
  assert.deepEqual(h.hooks_exportados, ['useContacts']);
  assert.deepEqual(h.tabelas, ['contacts']);
  assert.equal(h.usado_por, 2);
  assert.equal(h.coberto_por_testes, 1);
  assert.equal(J('testes.json').arquivos[0].casos, 2);
});

test('edge functions: verify_jwt, env, quem chama, cron e órfãs', () => {
  const e = J('edge-functions.json'); const by = Object.fromEntries(e.edges.map((x) => [x.nome, x]));
  assert.equal(by['send-email'].verify_jwt, true);
  assert.deepEqual(by['send-email'].env, ['RESEND_API_KEY']);
  assert.deepEqual(by['send-email'].metodos, ['POST']);
  assert.deepEqual(by['send-email'].chamada_pelo_front, ['src/hooks/useContacts.ts']);
  assert.equal(by['send-email'].chamada_por_sql_ou_cron, true);
  assert.deepEqual(by['send-email'].hosts_externos, ['api.resend.com']);
  assert.equal(by['stripe-webhook'].verify_jwt, false);
  assert.equal(by['stripe-webhook'].orfa, false, 'webhook sem jwt não é órfã');
  assert.equal(by['orphan-fn'].orfa, true);
});

test('banco: migrations em ordem (add/drop coluna, drop+create policy, drop table), cron, buckets, drift', () => {
  const b = J('banco.json'); const t = b.tabelas.contacts;
  assert.deepEqual(Object.keys(t.colunas), ['created2', 'createdAt', 'id', 'lat', 'name', 'phone'], 'email removida, phone adicionada');
  assert.equal(t.colunas.lat.tipo, 'double precision');
  assert.equal(t.colunas.created2.tipo, 'timestamp with time zone');
  assert.equal(t.colunas.phone.nn, true, 'SET NOT NULL aplicado');
  assert.equal(t.colunas.phone.default, "'n/a'");
  assert.equal(t.policies.find((p) => p.nome === 'contacts_insert').para, 'service_role', 'policy recriada dentro de DO $$');
  assert.equal(b.avisos.length, 1, 'DDL dinâmico sinalizado');
  assert.equal(t.colunas.name.nn, true);
  assert.equal(t.rls, true);
  assert.deepEqual(t.policies.map((p) => p.nome + ':' + p.comando), ['contacts_insert:insert', 'contacts_select:select']);
  assert.deepEqual(t.indices.map((i) => i.nome), ['contacts_email_idx']);
  assert.equal(b.tabelas.legacy, undefined, 'drop table');
  assert.deepEqual(b.tabelas.emails.fks, ['contact_id->contacts']);
  assert.deepEqual(b.tabelas.payments.triggers, ['trg_pay']);
  assert.equal(b.tabelas.payments.sem_rls, true);
  assert.deepEqual(b.funcoes, ['is_admin']);
  assert.deepEqual(b.enums.app_role, ['admin', 'agent']);
  assert.deepEqual(b.cron_jobs, [{ nome: 'nightly', agenda: '0 3 * * *', migration: '001_init.sql', chama_edge: 'send-email' }]);
  assert.ok(b.buckets.some((x) => x.nome === 'avatars' && x.criado_em_sql));
  assert.deepEqual(t.drift, { so_na_migration: ['createdAt', 'lat', 'created2'], so_no_types: ['extra_col'] });
  assert.deepEqual(b.rpcs_usadas_no_codigo, [{ nome: 'is_admin', definida: true, usada_em: 1 }]);
});

test('ferramentas: env, workflows, scripts, integrações, permissões, flags, providers', () => {
  const f = J('ferramentas.json');
  assert.deepEqual(f.env.usadas_mas_nao_declaradas, ['VITE_ANON']);
  assert.equal(f.workflows[0].nome, 'CI');
  assert.deepEqual(f.workflows[0].gatilhos, ['pull_request', 'push']);
  assert.deepEqual(f.workflows[0].secrets, ['DB_TOKEN']);
  assert.deepEqual(f.workflows[0].scripts_usados, ['scripts/audit.mjs']);
  const s = Object.fromEntries(J('scripts.json').scripts.map((x) => [x.arquivo, x]));
  assert.deepEqual(s['scripts/audit.mjs'].npm_scripts, ['audit']);
  assert.equal(s['scripts/audit.mjs'].orfao, false);
  assert.equal(s['scripts/orphan.sh'].orfao, true);
  assert.ok(f.integracoes.sdks.some((x) => x.servico === 'Stripe'));
  assert.ok(f.integracoes.webhooks_recebidos.includes('stripe-webhook'));
  assert.ok(f.integracoes.webhooks_recebidos.includes('POST /webhook/stripe'));
  assert.deepEqual(f.permissoes.papeis_no_codigo, [{ papel: 'admin', ocorrencias: 2 }]);
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'novo-inbox', arquivos: 1 }]);
  assert.ok(f.providers.providers.includes('QueryClientProvider'));
  assert.equal(f.stack.framework, 'React');
  assert.deepEqual(f.stack.backend_http, ['express', 'fastapi']);
});

test('grafo, convenções e determinismo', () => {
  const g = J('grafo.json');
  assert.ok(g.hubs[0].arquivo === 'src/lib/supabase.ts' || g.hubs[0].arquivo === 'src/hooks/useContacts.ts');
  assert.equal(g.ciclos.total, 0);
  const c = J('convencoes.json');
  assert.equal(c.alias_imports['(raiz)']['@/'], 'src/');
  assert.equal(c.typescript.strict, true);
  assert.match(c.nomenclatura.componentes, /^PascalCase/);
  const antes = fs.readFileSync(path.join(out, 'rotas.json'), 'utf8');
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
  assert.equal(fs.readFileSync(path.join(out, 'rotas.json'), 'utf8'), antes, 'saída determinística');
  const l = J('logica.json'); assert.ok(l.arquivos.some((x) => x.arquivo === 'backend/models.py' && x.exports.includes('Item')));
});

test('INDEX.md: rodapé de publicação é genérico por padrão e segue ai-context.config.json → publicacao', () => {
  const idx = fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8');
  assert.match(idx, /Publicado pelo workflow de contexto do repositório/);
  assert.doesNotMatch(idx, /contexto-ia/, 'nome de branch/workflow de um repo específico não pode estar fixo no gerador');
  w(root, 'ai-context.config.json', JSON.stringify({ publicacao: 'Publicado na branch `xyz` pelo workflow `xyz.yml`.' }));
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
  assert.match(fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8'), /Publicado na branch `xyz` pelo workflow `xyz.yml`\./);
  fs.rmSync(path.join(root, 'ai-context.config.json'));
});

function isolatedFixture(t, prepare) {
  const fixtureRoot = fixture();
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  prepare(fixtureRoot);
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: fixtureRoot });
  return (name) => JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'inventario/ia', name), 'utf8'));
}

test('git: histórico preserva data, assunto e barras verticais sem executar shell', (t) => {
  const read = isolatedFixture(t, (dir) => {
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-q', '-m', 'fix: assunto | literal'], { cwd: dir });
  });
  const commits = read('baseline.json').git.ultimos_commits;
  assert.equal(commits.length, 2);
  assert.equal(commits[0].assunto, 'fix: assunto | literal');
  assert.match(commits[0].sha, /^[a-f0-9]{7,40}$/);
  assert.match(commits[0].data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(commits[1].assunto, 'feat: fixture');
});

test('banco: arquivos _foreign e _superseded não alteram a reconstrução vigente', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'supabase/migrations/_foreign/singu/001_foreign.sql', `create table public.foreign_only (id int);
select cron.schedule('archived-job', '* * * * *', $$ select net.http_post('https://x.supabase.co/functions/v1/orphan-fn') $$);`);
    w(dir, 'supabase/migrations/_superseded/000_old.sql', `alter table public.contacts add column archived_only text;
create table public.legacy (id int);
create or replace function public.archived_fn() returns boolean language sql as $$ select true $$;
create policy "archived_policy" on public.contacts for select using (true);`);
  });
  const banco = read('banco.json');
  assert.equal(banco.migrations, 2);
  assert.equal(banco.tabelas.foreign_only, undefined);
  assert.equal(banco.tabelas.legacy, undefined);
  assert.equal(banco.tabelas.contacts.colunas.archived_only, undefined);
  assert.ok(!banco.tabelas.contacts.policies.some((p) => p.nome === 'archived_policy'));
  assert.deepEqual(banco.funcoes, ['is_admin']);
  assert.deepEqual(banco.cron_jobs.map((c) => c.nome), ['nightly']);
  const orphan = read('edge-functions.json').edges.find((e) => e.nome === 'orphan-fn');
  assert.equal(orphan.chamada_por_sql_ou_cron, false);
  assert.equal(orphan.orfa, true);
});

test('alertas de aplicação ignoram testes, stories e tooling, preservando seus inventários', (t) => {
  const read = isolatedFixture(t, (dir) => {
    const sample = `supabase.from('ghost_table').select('*'); supabase.rpc('ghost_rpc');
supabase.functions.invoke('ghost-edge'); supabase.functions.invoke('orphan-fn');`;
    for (const file of ['src/__tests__/calls.test.ts', 'src/components/Demo.stories.tsx', 'supabase/functions/send-email/sample.test.ts',
      'scripts/check.mjs', 'tools/check.mjs', '.github/scripts/check.mjs', 'docs/example.ts', 'packages/demo/scripts/check.mjs']) w(dir, file, sample);
    w(dir, 'worker/job.ts', `supabase.from('runtime_table').select('*'); supabase.rpc('runtime_rpc');
supabase.functions.invoke('runtime-missing'); supabase.functions.invoke('runtime-fn');`);
    w(dir, 'supabase/functions/runtime-fn/index.ts', `Deno.serve(() => new Response('ok'));`);
  });
  const baseline = read('baseline.json');
  assert.deepEqual(baseline.alertas.tabelas_usadas_sem_definicao, ['runtime_table']);
  assert.deepEqual(baseline.alertas.rpcs_sem_definicao, ['runtime_rpc']);
  assert.deepEqual(baseline.alertas.edges_chamadas_sem_pasta, ['runtime-missing']);
  const edges = Object.fromEntries(read('edge-functions.json').edges.map((e) => [e.nome, e]));
  assert.equal(edges['orphan-fn'].orfa, true);
  assert.deepEqual(edges['orphan-fn'].chamada_pelo_front, []);
  assert.deepEqual(edges['orphan-fn'].chamada_por_edges, []);
  assert.equal(edges['runtime-fn'].orfa, false);
  assert.deepEqual(edges['runtime-fn'].chamada_pelo_front, ['worker/job.ts']);
  assert.ok(read('scripts.json').scripts.some((s) => s.arquivo === 'scripts/check.mjs'));
  assert.ok(read('testes.json').arquivos.some((s) => s.arquivo === 'src/__tests__/calls.test.ts'));
});

test('alertas respeitam srcDirs explícito quando uma pasta de ferramentas contém a aplicação', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'ai-context.config.json', JSON.stringify({ srcDirs: ['tools'] }));
    w(dir, 'tools/app.ts', `supabase.from('tools_runtime').select('*'); supabase.rpc('tools_rpc'); supabase.functions.invoke('tools-edge');`);
  });
  const alerts = read('baseline.json').alertas;
  assert.ok(alerts.tabelas_usadas_sem_definicao.includes('tools_runtime'));
  assert.ok(alerts.rpcs_sem_definicao.includes('tools_rpc'));
  assert.ok(alerts.edges_chamadas_sem_pasta.includes('tools-edge'));
});

test('diretórios de fixtures permanecem no inventário de testes sem criar alertas de aplicação', (t) => {
  const fixtureFiles = ['src/fixtures/calls.ts', 'src/components/__fixtures__/calls.ts',
    'supabase/functions/send-email/fixtures/calls.ts', 'packages/demo/src/__fixtures__/calls.ts'];
  const read = isolatedFixture(t, (dir) => {
    const sample = `supabase.from('fixture_table').select('*'); supabase.rpc('fixture_rpc');
supabase.functions.invoke('fixture-edge'); supabase.functions.invoke('orphan-fn');`;
    for (const file of fixtureFiles) w(dir, file, sample);
    w(dir, 'src/fixtures-dashboard.ts', `supabase.from('dashboard_table').select('*');
supabase.rpc('dashboard_rpc'); supabase.functions.invoke('dashboard-edge');`);
  });
  const alerts = read('baseline.json').alertas;
  assert.deepEqual(alerts.tabelas_usadas_sem_definicao, ['dashboard_table']);
  assert.deepEqual(alerts.rpcs_sem_definicao, ['dashboard_rpc']);
  assert.deepEqual(alerts.edges_chamadas_sem_pasta, ['dashboard-edge']);
  const files = new Set(read('testes.json').arquivos.map((entry) => entry.arquivo));
  for (const file of fixtureFiles) assert.ok(files.has(file), file);
  assert.ok(!files.has('src/fixtures-dashboard.ts'));
  const orphan = read('edge-functions.json').edges.find((edge) => edge.nome === 'orphan-fn');
  assert.equal(orphan.orfa, true);
  assert.deepEqual(orphan.chamada_pelo_front, []);
  assert.deepEqual(orphan.chamada_por_edges, []);
});

// ---------- repositório estilo Vercel (api/*.ts) com Supabase em subpasta ----------
const gitCommit = (dir, env = {}) => {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'feat: mini'], { cwd: dir, env: { ...process.env, ...env } });
};
function miniRepo(files, { commit = true, commitEnv = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-ia-mini-'));
  for (const [rel, text] of Object.entries(files)) w(dir, rel, text);
  if (commit) gitCommit(dir, commitEnv);
  return dir;
}
const gerar = (dir, args = [], env = {}) => spawnSync(process.execPath, [GERADOR, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
const leitor = (dir, sub = 'inventario/ia') => (name) => (name.endsWith('.json') ? JSON.parse(fs.readFileSync(path.join(dir, sub, name), 'utf8')) : fs.readFileSync(path.join(dir, sub, name), 'utf8'));

const VERCEL = {
  'package.json': JSON.stringify({ name: 'site', version: '1.0.0', scripts: { test: 'vitest run', 'graph:update': 'node scripts/graphify.mjs update', 'graph:query': 'node scripts/graphify.mjs query', 'ctx:test': 'python3 scripts/ctx/test_generate.py', 'ctx:gen': 'python3 scripts/ctx/generate.py' }, dependencies: { react: '19', 'react-router-dom': '7', '@supabase/supabase-js': '2' }, devDependencies: { vitest: '3', vite: '7', typescript: '5' } }),
  'package-lock.json': '{}',
  'ai-context.config.json': JSON.stringify({ srcDirs: ['src', 'api', 'shared'], typesFile: 'src/types/db.types.ts' }),
  'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }),
  'tsconfig.app.json': '{\n  /* Bundler mode */\n  "compilerOptions": {\n    "strict": true, // comentário\n    "jsx": "react-jsx",\n  },\n  "include": ["src"]\n}\n',
  'vercel.json': JSON.stringify({ crons: [{ path: '/api/retention', schedule: '0 3 * * *' }], functions: { 'api/leads.ts': { maxDuration: 30 } }, rewrites: [{ source: '/sitemap.xml', destination: '/api/sitemap' }, { source: '/catalogo', destination: '/api/site-page?page=catalogo' }, { source: '/conta', destination: '/api/site-page?page=conta' }] }),
  '.env.example': 'SITE_SECRET=\nCRON_SECRET=\nRESEND_WEBHOOK_SECRET=\nALERT_WEBHOOK_URL=\n# VITE_DOC_ONLY=opcional, só no preview\n',
  'index.html': '<script src="/boot.js"></script>',
  'public/boot.js': 'window.x = 1;',
  'api/leads.ts': "import { handleLead } from './_lib/handler';\nexport default function handler(request, response) { return handleLead('quote', request, response); }",
  'api/_lib/handler.ts': "export async function handleLead(kind, request, response) {\n  if (request.method !== 'POST') return response.status(405).end();\n  const rpcName = kind === 'quote' ? 'create_lead' : 'create_contact';\n  await fetch(`${process.env.SITE_URL}/rest/v1/rpc/${rpcName}`, { headers: { apikey: process.env.SITE_SECRET } });\n}",
  'api/_lib/handler.test.ts': "import { handleLead } from './handler';\nit('x', () => {});",
  'api/sitemap.ts': "export default function handler(request, response) {\n  if (request.method && !['GET', 'HEAD'].includes(request.method)) return response.status(405).end();\n  response.send('<xml/>');\n}",
  'api/site-page.ts': "export default function handler(request, response) { response.send('<html/>'); }",
  'api/retention.ts': "async function rpc<T>(baseUrl: string, key: string, name: string, body: object): Promise<T> { return (await fetch(`${baseUrl}/rest/v1/rpc/${name}`)).json(); }\nexport default async function handler(request, response) {\n  if (request.method !== 'GET') return response.status(405).end();\n  if (request.headers.authorization !== process.env.CRON_SECRET) return response.status(401).end();\n  await rpc<{ n?: number }>(\n    process.env.SITE_URL,\n    process.env.SITE_SECRET,\n    'purge_old',\n    {},\n  );\n}",
  'api/events-resend.ts': "export default function handler(request, response) {\n  if (request.method !== 'POST') return response.status(405).end();\n  verify(process.env.RESEND_WEBHOOK_SECRET);\n}",
  'api/notify.ts': "async function rpc<T>(name: string, body: object): Promise<T> { return (await fetch(`${process.env.SITE_URL}/rest/v1/rpc/${name}`)).json(); }\nexport default async function handler(request, response) {\n  if (request.method !== 'GET') return response.status(405).end();\n  await rpc<unknown>('claim_jobs', {});\n  await fetch(`${process.env.SITE_URL}/rest/v1/rpc/queue_health`);\n  await fetch(process.env.ALERT_WEBHOOK_URL);\n}",
  'src/main.tsx': "import { App } from './App';\nexport const Root = () => <App />;",
  'src/App.tsx': "import { Routes, Route } from 'react-router-dom';\nimport { HomePage } from './pages/HomePage';\nimport { AuthConfirmPage } from './pages/AuthConfirmPage';\nimport { AccountPage } from './pages/AccountPage';\nimport { RequireAuth } from './components/RequireAuth';\nimport { links } from './components/navLinks';\nexport const nav = links;\nexport const App = () => (<Routes>\n  <Route path=\"/\" element={<HomePage />} />\n  <Route path=\"/auth/confirm\" element={<AuthConfirmPage />} />\n  <Route path=\"/conta\" element={<RequireAuth><AccountPage /></RequireAuth>} />\n</Routes>);",
  'src/components/RequireAuth.tsx': 'export const RequireAuth = ({ children }) => <>{children}</>;',
  'src/components/navLinks.ts': "export const links = [{ label: 'Início', to: '/' }, { label: 'Instagram', href: 'https://instagram.com/loja' }, { label: 'Fantasma', to: '/nada' }];",
  'src/pages/HomePage.tsx': "import { sendLead } from '../lib/api';\nexport const HomePage = () => { if (import.meta.env.VITE_NEW_CHECKOUT_ENABLED) sendLead(); return <main />; };",
  'src/pages/AuthConfirmPage.tsx': "export const AuthConfirmPage = ({ payload }) => {\n  const ok = payload.role === 'anon';\n  return <div role=\"status\" aria-live=\"polite\"><span role='alert'>{String(ok)}</span>{import.meta.env.VITE_DOC_ONLY}{import.meta.env.VITE_MISSING}{process.env.NODE_ENV}{process.env.VERCEL_ENV}</div>;\n};",
  'src/pages/AccountPage.tsx': "import { supabase } from '../lib/api';\nexport const AccountPage = () => { supabase.rpc('get_mine'); return <section />; };",
  'src/lib/api.ts': "export const supabase = createClient();\nexport const sendLead = () => fetch('/api/leads', { method: 'POST' });",
  'src/types/db.types.ts': 'export type Database = {\n  public: {\n    Tables: {\n      [_ in never]: never\n    }\n    Functions: {}\n  }\n  site_private: {\n    Tables: {\n      leads: {\n        Row: {\n          id: string\n          email: string\n          extra: string\n        }\n        Insert: { id?: string }\n      }\n    }\n  }\n}\nexport const Constants = { public: { Enums: {} }, site_private: { Enums: {} } } as const',
  'site-supabase/supabase/config.toml': 'project_id = "site"\n',
  'site-supabase/supabase/migrations/20260101000000_init.sql': `create schema if not exists site_private;
create table site_private.leads (id uuid primary key, email text not null);
alter table site_private.leads enable row level security;
create index leads_email_idx on site_private.leads (email);
create index leads_old_idx on site_private.leads (id);
drop index if exists site_private.leads_old_idx;
create or replace function site_private.touch() returns trigger language plpgsql as $$ begin return new; end $$;
create or replace function site_private.gone() returns void language sql as $$ select 1 $$;
drop function if exists site_private.gone();
create or replace function public.create_lead(p jsonb) returns jsonb language sql as $$ select p $$;
create or replace function public.create_contact(p jsonb) returns jsonb language sql as $$ select p $$;
create or replace function public.purge_old() returns int language sql as $$ select 1 $$;
create or replace function public.claim_jobs() returns int language sql as $$ select 1 $$;
create or replace function public.queue_health() returns int language sql as $$ select 1 $$;
create or replace function public.get_mine() returns int language sql as $$ select 1 $$;
create or replace function public.unused_fn() returns int language sql as $$ select 1 $$;
create or replace function public.get_sel(p_token uuid) returns int language sql as $$ select 1 $$;
create or replace function public.get_sel(p_token uuid, p_hash text default md5('a,b')) returns int language sql as $$ select 2 $$;
drop function public.get_sel(uuid);
create trigger trg_touch before update on site_private.leads for each row execute function site_private.touch();
create view site_private.v_leads as select * from site_private.leads;
create type site_private.lead_status as enum ('new', 'done');`,
  'site-supabase/supabase/tests/database/leads.test.sql': 'select plan(1);',
  'docs/sql/canonical/001_catalog.sql': 'create table public.catalog_only (id int);\ncreate or replace function public.catalog_fn() returns int language sql as $$ select 1 $$;',
  'docs/audits/reproduce.mjs': "console.log('auditoria');",
  'scripts/tooling.mjs': "// Ferramenta com trechos de exemplo em string.\nconst sample = `app.get('/fake', h); export const useFake = () => 1; pgTable('fake_table', { id: text('id') }); isFeatureEnabled('fake-flag'); if (role === 'fake_role') {} fetch('https://tooling-only.test/x');`;\nexport const useToolHook = () => sample;",
  'scripts/ctx/generate.py': 'def main():\n    pass\n',
  'scripts/ctx/test_generate.py': 'def test_a():\n    pass\n',
  'tests/api/leads.test.ts': "import handler from '../../api/leads';\nit('x', async () => { await fetch('https://test-only.test/x'); });",
};
const vdir = miniRepo(VERCEL);
const vhead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: vdir, encoding: 'utf8' }).trim();
w(vdir, 'graphify-out/graph.json', JSON.stringify({ directed: false, nodes: [{ id: 'a', label: 'A', source_file: 'src/App.tsx', community: 0, community_name: 'Community 0' }], links: [] }));
w(vdir, 'graphify-out/project-meta.json', JSON.stringify({ commit: vhead }));
w(vdir, 'graphify-out/GRAPH_REPORT.md', '# Graph report\n');
const vrun = gerar(vdir, ['--quiet']);
const V = leitor(vdir);
process.on('exit', () => { fs.rmSync(vdir, { recursive: true, force: true }); fs.rmSync(root, { recursive: true, force: true }); });

test('vercel: gera sem erro de seção e sem ruído em stderr', () => {
  assert.equal(vrun.status, 0, vrun.stderr);
  assert.equal(vrun.stderr, '');
  assert.deepEqual(V('manifest.json').erros, []);
});

test('vercel api/: _lib e testes não são rota; função aparece em rotas_http_backend com método, fecho, rewrites, cron e chamador', () => {
  const r = V('rotas.json');
  const apis = r.urls.filter((u) => u.tipo === 'api').map((u) => u.caminho);
  assert.deepEqual(apis, ['/api/events-resend', '/api/leads', '/api/notify', '/api/retention', '/api/site-page', '/api/sitemap']);
  const by = Object.fromEntries(r.rotas_http_backend.map((x) => [x.caminho, x]));
  assert.deepEqual(Object.keys(by), apis, 'só funções reais; nada de scripts/ nem de testes');
  assert.equal(by['/api/leads'].metodo, 'POST', 'método lido do handler importado quando a entrada só delega');
  assert.equal(by['/api/leads'].arquivo, 'api/leads.ts');
  assert.deepEqual(by['/api/leads'].rpcs, ['create_contact', 'create_lead']);
  assert.deepEqual(by['/api/leads'].diretos, { tabelas: [], rpcs: [], env: [] }, 'a entrada só delega: nada direto, tudo pelo fecho');
  assert.deepEqual(by['/api/notify'].diretos.rpcs, ['claim_jobs', 'queue_health']);
  assert.deepEqual(by['/api/leads'].env, ['SITE_SECRET', 'SITE_URL']);
  assert.equal(by['/api/leads'].max_duration, 30);
  assert.deepEqual(by['/api/leads'].chamada_por, ['src/lib/api.ts']);
  assert.equal(by['/api/sitemap'].metodo, 'GET,HEAD');
  assert.deepEqual(by['/api/sitemap'].rewrites_de, ['/sitemap.xml']);
  assert.deepEqual(by['/api/site-page'].rewrites_de, ['/catalogo', '/conta']);
  assert.equal(by['/api/site-page'].metodo, 'ANY');
  assert.equal(by['/api/retention'].cron, '0 3 * * *');
  assert.deepEqual(by['/api/retention'].rpcs, ['purge_old'], 'nome da RPC como 3º argumento do helper');
  assert.deepEqual(by['/api/notify'].rpcs, ['claim_jobs', 'queue_health'], 'rpc<T>(nome) e /rest/v1/rpc/<nome>');
  assert.equal(by['/api/notify'].cron, null);
  assert.equal(r.resumo.rotas_http_backend, 6);
  const f = V('ferramentas.json');
  assert.deepEqual(f.stack.backend_http, ['vercel-functions']);
  assert.deepEqual(f.integracoes.webhooks_recebidos, ['POST /api/events-resend'], 'webhook recebido pelo segredo de assinatura; URL de alerta de saída não conta');
  const mod = V('modulos.json').modulos.find((m) => m.modulo === 'api');
  assert.deepEqual(mod.telas, [], 'função serverless não é contada duas vezes como tela');
  assert.equal(mod.rotas_http.length, 6);
  assert.ok(!V('modulos.json').modulos.find((m) => m.modulo === 'api/_lib').telas.length);
  const logica = Object.fromEntries(V('logica.json').arquivos.map((x) => [x.arquivo, x]));
  assert.equal(logica['api/leads.ts'].orfao, false, 'ponto de entrada da Vercel não é órfão');
  assert.equal(logica['scripts/ctx/generate.py'].orfao, false, 'script chamado por npm não é órfão');
  assert.deepEqual(V('convencoes.json').onde_ficam.telas, ['src/pages (3)']);
  const idx = V('INDEX.md');
  assert.match(idx, /`POST \/api\/leads` → api\/leads\.ts/);
  assert.match(idx, /`GET,HEAD \/api\/sitemap` → api\/sitemap\.ts \(rewrites: \/sitemap\.xml\)/);
  assert.match(idx, /`GET \/api\/retention` → api\/retention\.ts \(cron 0 3 \* \* \*\)/);
});

test('ferramentas (scripts/, docs/) e testes não poluem hooks, rotas HTTP, flags, papéis, hosts nem o banco', () => {
  assert.deepEqual(V('hooks.json').hooks.map((h) => h.arquivo), []);
  const f = V('ferramentas.json');
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'NEW_CHECKOUT_ENABLED', arquivos: 1 }], 'flag real por sufixo _ENABLED; flag de exemplo em scripts/ fora');
  assert.deepEqual(f.permissoes.papeis_no_codigo, [{ papel: 'anon', ocorrencias: 1 }], 'role="status"/role=\'alert\' são ARIA, não papel de permissão');
  assert.deepEqual(f.integracoes.hosts_externos.map((h) => h.host), ['instagram.com']);
  const b = V('banco.json');
  assert.equal(b.tabelas.fake_table, undefined);
  assert.ok(!b.fonte.includes('drizzle'));
  assert.ok(V('scripts.json').scripts.some((s) => s.arquivo === 'scripts/tooling.mjs'), 'o script continua no inventário de scripts');
});

test('supabase em subpasta: migrations, pgTAP, schema qualificado, drift por schema e RPCs', () => {
  const b = V('banco.json');
  assert.deepEqual(b.fonte, ['site-supabase/supabase/migrations', 'src/types/db.types.ts']);
  assert.equal(b.migrations, 1, 'SQL de docs/ não é migration');
  assert.equal(b.tabelas.catalog_only, undefined);
  assert.deepEqual(b.funcoes, ['claim_jobs', 'create_contact', 'create_lead', 'get_mine', 'get_sel', 'purge_old', 'queue_health', 'site_private.touch', 'unused_fn'], 'schema preservado; drop de uma sobrecarga antiga (get_sel(uuid)) não apaga a função; drop da única assinatura (site_private.gone) apaga');
  assert.deepEqual(b.views, ['site_private.v_leads']);
  assert.deepEqual(b.enums, { 'site_private.lead_status': ['new', 'done'] });
  assert.deepEqual(b.triggers, [{ nome: 'trg_touch', quando: 'before', evento: 'update', tabela: 'site_private.leads', funcao: 'site_private.touch' }]);
  const t = b.tabelas['site_private.leads'];
  assert.deepEqual(t.indices.map((i) => i.nome), ['leads_email_idx'], 'drop index com schema');
  assert.deepEqual(t.colunas_types, { email: 'string', extra: 'string', id: 'string' });
  assert.deepEqual(t.drift, { so_na_migration: [], so_no_types: ['extra'] });
  assert.deepEqual(V('baseline.json').alertas.tabelas_com_drift_migration_vs_types, ['site_private.leads']);
  assert.deepEqual(b.rpcs_usadas_no_codigo.map((r) => r.nome), ['claim_jobs', 'create_contact', 'create_lead', 'get_mine', 'purge_old', 'queue_health']);
  assert.ok(b.rpcs_usadas_no_codigo.every((r) => r.definida));
  const t2 = V('testes.json');
  assert.deepEqual(t2.sql, ['site-supabase/supabase/tests/database/leads.test.sql']);
  const c = V('convencoes.json');
  assert.equal(c.onde_ficam.migrations, 'site-supabase/supabase/migrations');
  assert.ok(V('ferramentas.json').configs.includes('site-supabase/supabase/config.toml'));
});

test('rotas: proteção vem do wrapper, não do nome da página; menu externo não é destino quebrado', () => {
  const by = Object.fromEntries(V('rotas.json').urls.map((u) => [u.caminho, u]));
  assert.equal(by['/auth/confirm'].protegida, false, 'AuthConfirmPage sem wrapper é pública');
  assert.equal(by['/conta'].protegida, true);
  assert.deepEqual(by['/conta'].wrappers, ['RequireAuth']);
  assert.deepEqual(by['/conta'].rpcs, ['get_mine']);
  assert.deepEqual(V('baseline.json').alertas.menu_sem_destino, ['Fantasma -> /nada']);
  assert.ok(V('rotas.json').menu.some((m) => m.rotulo === 'Instagram'));
});

test('env: variável de plataforma ou só citada no .env.example não vira alerta', () => {
  const env = V('ferramentas.json').env;
  assert.deepEqual(env.usadas_mas_nao_declaradas, ['SITE_URL', 'VITE_MISSING', 'VITE_NEW_CHECKOUT_ENABLED']);
  assert.deepEqual(env.declaradas_no_env_example, ['ALERT_WEBHOOK_URL', 'CRON_SECRET', 'RESEND_WEBHOOK_SECRET', 'SITE_SECRET']);
});

test('convenções: strict via references e tsconfig com comentários; alias de fallback não é convenção; npm_scripts por nome exato', () => {
  const c = V('convencoes.json');
  assert.equal(c.typescript.strict, true);
  assert.deepEqual(c.alias_imports, {});
  const s = Object.fromEntries(V('scripts.json').scripts.map((x) => [x.arquivo, x]));
  assert.deepEqual(s['scripts/ctx/generate.py'].npm_scripts, ['ctx:gen'], 'test_generate.py não é generate.py');
  const g = V('grafo.json');
  assert.deepEqual(g.orfaos, [], 'docs/, scripts/ e public/ são pontos de entrada, não código morto');
});

test('tsconfig com comentários: paths continuam valendo', (t) => {
  const dir = miniRepo({ 'package.json': '{}', 'tsconfig.json': '{\n  // alias do projeto\n  "compilerOptions": { "paths": { "#/*": ["./lib/*"], }, },\n}', 'lib/b.ts': 'export const b = 1;', 'src/a.ts': "import { b } from '#/b';\nexport const a = b;" }, { commit: false });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(gerar(dir, ['--quiet']).status, 0);
  const R = leitor(dir);
  assert.deepEqual(R('grafo-arestas.json').arestas['src/a.ts'], ['lib/b.ts']);
  assert.deepEqual(R('convencoes.json').alias_imports, { '(raiz)': { '#/': 'lib/' } });
});

test('graphify: commit vem do project-meta.json, relatório é detectado e as instruções seguem os scripts do repo', () => {
  const g = V('grafo-graphify.json');
  assert.equal(g.presente, true);
  assert.equal(g.commit_do_grafo, vhead);
  assert.equal(g.grafo_atual, true);
  assert.equal(g.relatorio, 'graphify-out/GRAPH_REPORT.md');
  assert.match(g.como_gerar, /^npm run graph:update/);
  const idx = V('INDEX.md');
  assert.doesNotMatch(idx, /DESATUALIZADO/);
  assert.match(idx, /`npm run graph:query -- "<pergunta>"`/);
  assert.doesNotMatch(idx, /uvx|bun run/);
});

test('graphify: sem commit conhecido não afirma desatualizado; grafo de outro commit afirma; json quebrado vira erro de seção', (t) => {
  const dir = miniRepo({ 'package.json': '{}', 'src/a.ts': 'export const a = 1;' });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const R = leitor(dir);
  w(dir, 'graphify-out/graph.json', JSON.stringify({ nodes: [], links: [] }));
  assert.equal(gerar(dir, ['--quiet']).status, 0);
  assert.match(R('INDEX.md'), /commit do grafo não informado/);
  assert.doesNotMatch(R('INDEX.md'), /DESATUALIZADO/);
  assert.match(R('INDEX.md'), /consulta local: `graphify query "<pergunta>"`/, 'sem script graph:query no package.json, cai no CLI');
  w(dir, 'graphify-out/graph.json', JSON.stringify({ built_at_commit: '0'.repeat(40), nodes: [], links: [] }));
  assert.equal(gerar(dir, ['--quiet']).status, 0);
  assert.match(R('INDEX.md'), /grafo do commit `00000000` \(DESATUALIZADO em relação ao HEAD\)/);
  w(dir, 'graphify-out/graph.json', '{ "nodes": [');
  const r = gerar(dir, ['--quiet']);
  assert.equal(r.status, 0, 'seção opcional quebrada não derruba o gerador');
  assert.match(r.stderr, /ERRO na seção graphify/, 'erro de seção aparece em stderr mesmo com --quiet');
  assert.deepEqual(R('manifest.json').erros.map((e) => e.secao), ['graphify']);
  assert.equal(R('grafo-graphify.json').presente, false);
  fs.rmSync(path.join(dir, 'graphify-out'), { recursive: true });
  assert.equal(gerar(dir, ['--quiet']).status, 0);
  assert.match(R('INDEX.md'), /não gerado neste run\. uvx --from "graphifyy\[sql\]" graphify update \./, 'sem script graph:update no package.json, cai no CLI');
});

test('segredos: linha reportada é a do arquivo, mesmo depois de comentário de bloco', (t) => {
  const jwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'abc123'].join('.');
  const dir = miniRepo({ 'package.json': '{}', 'src/a.ts': `/*\n * cabeçalho\n * de três linhas\n */\nexport const a = 1;\nconst k = '${jwt}';\n` }, { commit: false });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(gerar(dir, ['--quiet']).status, 0);
  assert.deepEqual(leitor(dir)('baseline.json').alertas.possiveis_segredos_no_codigo, ['src/a.ts:6']);
});

test('determinismo: duas execuções iguais byte a byte (menos gerado_em) e ordenação independente do locale', (t) => {
  const files = { 'package.json': '{}' };
  for (const n of ['zebra', 'ärende', 'apple', 'écran', 'Zulu', 'über']) files[`src/lib/${n}.ts`] = 'export const x = 1;';
  const dir = miniRepo(files);
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const snapshot = () => Object.fromEntries(fs.readdirSync(path.join(dir, 'inventario/ia')).sort().map((f) => [f, fs.readFileSync(path.join(dir, 'inventario/ia', f), 'utf8').replace(/"gerado_em": "[^"]+"/, '"gerado_em": "X"')]));
  assert.equal(gerar(dir, ['--quiet'], { LC_ALL: 'C', TZ: 'UTC' }).status, 0);
  const a = snapshot();
  assert.equal(gerar(dir, ['--quiet'], { LC_ALL: 'C', TZ: 'UTC' }).status, 0);
  assert.deepEqual(snapshot(), a, 'segunda execução idêntica');
  assert.equal(gerar(dir, ['--quiet'], { LC_ALL: 'sv_SE.UTF-8', LANG: 'sv_SE.UTF-8', TZ: 'Asia/Tokyo' }).status, 0);
  assert.deepEqual(snapshot(), a, 'locale e fuso do ambiente não mudam a saída');
});

test('git: data do commit sai em UTC com sufixo Z, qualquer que seja o fuso do autor ou a versão do git', (t) => {
  const dir = miniRepo({ 'package.json': '{}', 'src/a.ts': 'export const a = 1;' }, { commitEnv: { GIT_AUTHOR_DATE: '2026-01-02T03:04:05-03:00', GIT_COMMITTER_DATE: '2026-01-02T03:04:05-03:00' } });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(gerar(dir, ['--quiet']).status, 0);
  assert.equal(leitor(dir)('baseline.json').git.data_commit, '2026-01-02T06:04:05Z');
  assert.match(leitor(dir)('INDEX.md'), /\(2026-01-02T06:04:05Z\)/);
});

test('CLI: --help não gera nada; flag desconhecida, valor ausente e raiz inexistente saem com 2', (t) => {
  const dir = miniRepo({ 'package.json': '{}', 'src/a.ts': 'export const a = 1;' }, { commit: false });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const semSaida = () => assert.ok(!fs.existsSync(path.join(dir, 'inventario')), 'nada escrito');
  for (const flag of ['--help', '-h']) { const h = gerar(dir, [flag]); assert.equal(h.status, 0); assert.match(h.stdout, /^Uso: node scripts\/ai-context\/gerar\.mjs/); assert.match(h.stdout, /--root/); assert.match(h.stdout, /--out/); assert.match(h.stdout, /--quiet/); semSaida(); }
  for (const args of [['--bogus'], ['--out'], ['--out', '--quiet'], ['--root'], ['--out='], ['solto'], ['--root', path.join(dir, 'nao-existe')], ['--root', path.join(dir, 'package.json')]]) {
    const r = gerar(dir, args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, /\[contexto-ia\] ERRO: /, args.join(' '));
    assert.equal(r.stdout, '', args.join(' '));
    semSaida();
  }
  assert.match(gerar(dir, ['--bogus']).stderr, /argumento desconhecido: --bogus/);
  assert.match(gerar(dir, ['--out']).stderr, /--out exige um valor/);
  assert.match(gerar(dir, ['--root', path.join(dir, 'nao-existe')]).stderr, /não existe ou não é um diretório/);
});

test('CLI: --out=<dir>, caminho com espaço, --out relativo à raiz, env e recusas de destino perigoso', (t) => {
  const dir = miniRepo({ 'package.json': '{}', 'src/a.ts': 'export const a = 1;' }, { commit: false });
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-ia-fora-'));
  t.after(() => { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(fora, { recursive: true, force: true }); });
  const ok = (r) => assert.equal(r.status, 0, r.stderr);
  ok(gerar(fora, [`--root=${dir}`, '--out=saida com espaço/ia', '--quiet']));
  assert.ok(fs.existsSync(path.join(dir, 'saida com espaço/ia/manifest.json')), '--out relativo resolve contra --root, não contra o cwd');
  assert.deepEqual(fs.readdirSync(fora), [], 'cwd intocado');
  ok(gerar(dir, ['--quiet'], { AI_CONTEXT_DIR: 'via-env' }));
  assert.ok(fs.existsSync(path.join(dir, 'via-env/INDEX.md')));
  ok(gerar(fora, ['--quiet'], { AI_CONTEXT_ROOT: dir, AI_CONTEXT_DIR: path.join(fora, 'abs') }));
  assert.equal(leitor(fora, 'abs')('baseline.json').contagens.arquivos_codigo, 1, 'AI_CONTEXT_ROOT + AI_CONTEXT_DIR absoluto');
  const normal = gerar(dir, []);
  ok(normal);
  assert.match(normal.stdout, /\[contexto-ia\] escrito em inventario\/ia\/ \(17 arquivos\)/);
  for (const out of ['.', '..', dir]) { const r = gerar(dir, ['--out', out]); assert.equal(r.status, 2, out); assert.match(r.stderr, /não pode ser a raiz do repositório/); }
  assert.ok(!fs.existsSync(path.join(dir, 'manifest.json')), 'nada escrito na raiz');
  const r = gerar(dir, ['--out', 'package.json']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\[contexto-ia\] ERRO: não foi possível escrever em .*package\.json/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, 'sem stack trace cru');
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), '{}');
});
