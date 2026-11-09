import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// db:site:dictionary e db:site:schema-doc só rodam de verdade com o Supabase local no ar
// (database.yml). Aqui os scripts reais rodam numa árvore temporária com um `npx` falso no
// PATH que responde no formato do `supabase db query`: prova a montagem do documento, o
// tratamento de erro e — pelo caso de ida e volta — que o gerador reproduz byte a byte os
// documentos versionados quando o banco devolve as mesmas linhas.

const REPO = fileURLToPath(new URL('..', import.meta.url));
const DICTIONARY = fs.readFileSync(path.join(REPO, 'docs', 'DATABASE_DICTIONARY.md'), 'utf8');
const SCHEMA = fs.readFileSync(path.join(REPO, 'docs', 'DATABASE_SCHEMA.md'), 'utf8');

const FAKE_NPX = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const sql = args.at(-1);
const fixture = JSON.parse(fs.readFileSync(process.env.FAKE_SUPABASE_FIXTURE, 'utf8'));
fs.appendFileSync(process.env.FAKE_SUPABASE_LOG, JSON.stringify({ args: args.slice(0, -1), sql, workdir: process.env.SUPABASE_WORKDIR, cwd: process.cwd() }) + '\\n');
if (fixture.exitCode) {
  process.stderr.write('failed to connect to postgres: connection refused\\n');
  process.exit(fixture.exitCode);
}
const key = sql.includes('obj_description(c.oid)') ? 'tables'
  : sql.includes('col_description') ? 'columns'
  : sql.includes('pg_proc') ? 'functions'
  : sql.includes('pg_constraint') ? 'foreignKeys'
  : sql.includes('select relname from pg_class') ? 'tableNames'
  : null;
if (!key) {
  process.stderr.write('consulta inesperada\\n');
  process.exit(3);
}
process.stderr.write('Connecting to local database...\\n');
const rows = fixture[key];
const result = fixture.agentMode ? { boundary: 'abc', rows, warning: 'untrusted' } : rows;
process.stdout.write((fixture.banner || '') + JSON.stringify(result, null, 2) + '\\n');
`;

function parseCommittedDictionary() {
  const tables = [];
  const columns = [];
  const functions = [];
  const lines = DICTIONARY.split('\n');
  let table = null;
  let inFunctions = false;
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^### `site_private\.(.+)`$/.exec(lines[index]);
    if (heading) {
      table = heading[1];
      // O comentário da tabela vai do parágrafo após o título até a linha em branco antes do cabeçalho de colunas.
      const comment = lines.slice(index + 2, lines.indexOf('| Coluna | Tipo | Comentário |', index) - 1).join('\n');
      tables.push({ relname: table, obj_description: comment.startsWith('_Sem comment on table') ? null : comment });
      continue;
    }
    if (lines[index].startsWith('## Funções públicas')) inFunctions = true;
    const row = /^\| `([^`]+)` \| `([^`]*)` \| (.*) \|$/.exec(lines[index]);
    if (!row) continue;
    const comment = row[3] === '—' ? null : row[3].replace(/\\\|/g, '|').replace(/<br>/g, '\n');
    if (inFunctions) functions.push({ proname: row[1], args: row[2], comment });
    else columns.push({ relname: table, attname: row[1], type: row[2], comment });
  }
  return { tables, columns, functions };
}

function parseCommittedSchema() {
  const tableNames = [];
  const foreignKeys = [];
  for (const line of SCHEMA.split('\n')) {
    const relation = /^ {2}(\w+) \}o--\|\| (\w+) : references$/.exec(line);
    if (relation) foreignKeys.push({ from_table: `site_private.${relation[1]}`, to_table_raw: relation[2] === 'users' ? 'auth.users' : relation[2], conname: 'fk' });
    else if (/^ {2}\w+$/.test(line)) tableNames.push({ relname: line.trim() });
  }
  return { tableNames, foreignKeys };
}

function workspace(t, fixture, { migrations = ['20260908230000_a.sql', latestRealMigration()] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'database docs é-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts/_lib', 'docs', 'bin', 'site-supabase/supabase/migrations']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ['generate-database-dictionary.mjs', 'generate-database-schema-doc.mjs', '_lib/supabaseDbQuery.mjs']) {
    fs.copyFileSync(path.join(REPO, 'scripts', file), path.join(root, 'scripts', file));
  }
  for (const name of migrations) fs.writeFileSync(path.join(root, 'site-supabase', 'supabase', 'migrations', name), '');
  fs.writeFileSync(path.join(root, 'bin', 'npx'), FAKE_NPX, { mode: 0o755 });
  fs.writeFileSync(path.join(root, 'fixture.json'), JSON.stringify(fixture));
  const log = path.join(root, 'calls.log');
  fs.writeFileSync(log, '');
  return {
    root,
    calls: () => fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)),
    doc: (name) => fs.readFileSync(path.join(root, 'docs', name), 'utf8'),
    hasDoc: (name) => fs.existsSync(path.join(root, 'docs', name)),
    run: (script, { cwd = os.tmpdir() } = {}) => spawnSync(process.execPath, [path.join(root, 'scripts', script)], {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`,
        FAKE_SUPABASE_FIXTURE: path.join(root, 'fixture.json'),
        FAKE_SUPABASE_LOG: log,
      },
    }),
  };
}

function latestRealMigration() {
  return fs.readdirSync(path.join(REPO, 'site-supabase', 'supabase', 'migrations')).filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort().at(-1);
}

test('ida e volta: com as mesmas linhas do banco, o dicionário gerado é idêntico ao versionado', (t) => {
  const fixture = parseCommittedDictionary();
  assert.ok(fixture.tables.length > 10 && fixture.columns.length > 100 && fixture.functions.length > 20, 'sanity: o documento versionado foi lido');
  for (const agentMode of [false, true]) {
    const ws = workspace(t, { ...fixture, agentMode });
    const result = ws.run('generate-database-dictionary.mjs');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(ws.doc('DATABASE_DICTIONARY.md'), DICTIONARY);
    assert.match(result.stdout, new RegExp(`^Escrito .*DATABASE_DICTIONARY\\.md \\(${fixture.tables.length} tabelas, ${fixture.functions.length} funções públicas\\)\\.\\n$`));
    const calls = ws.calls();
    assert.equal(calls.length, 3);
    for (const call of calls) {
      assert.deepEqual(call.args, ['supabase@2.115.0', 'db', 'query', '--local', '--output-format', 'json']);
      assert.equal(call.workdir, 'site-supabase');
      assert.equal(fs.realpathSync(call.cwd), fs.realpathSync(ws.root), 'consulta roda na raiz do repositório, não no cwd de quem chamou');
    }
    assert.match(calls[2].sql, /order by p\.proname, 2;/, 'sobrecargas de função têm ordem determinística');
  }
});

test('ida e volta: com as mesmas linhas do banco, o ERD gerado é idêntico ao versionado', (t) => {
  const fixture = parseCommittedSchema();
  assert.ok(fixture.tableNames.length > 10 && fixture.foreignKeys.length > 5, 'sanity: o documento versionado foi lido');
  const ws = workspace(t, fixture);
  const result = ws.run('generate-database-schema-doc.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(ws.doc('DATABASE_SCHEMA.md'), SCHEMA);
  assert.match(result.stdout, new RegExp(`\\(${fixture.tableNames.length} tabelas, ${fixture.foreignKeys.length} relações\\)\\.\\n$`));
});

test('gerar duas vezes produz o mesmo arquivo e a data vem da migration mais recente, não do relógio', (t) => {
  const ws = workspace(t, parseCommittedDictionary(), { migrations: ['20260101000000_a.sql', '20270315123000_b.sql', 'README.md', '2028_fora_do_padrao.sql'] });
  assert.equal(ws.run('generate-database-dictionary.mjs').status, 0);
  const first = ws.doc('DATABASE_DICTIONARY.md');
  assert.match(first, /migration mais recente \(2027-03-15\)/);
  assert.equal(ws.run('generate-database-dictionary.mjs').status, 0);
  assert.equal(ws.doc('DATABASE_DICTIONARY.md'), first);
});

test('comentário com quebra de linha ou barra vertical não parte a tabela Markdown', (t) => {
  const ws = workspace(t, {
    tables: [{ relname: 'pedidos', obj_description: null }, { relname: 'sem_colunas', obj_description: 'Tabela <vazia> & rara' }],
    columns: [
      { relname: 'pedidos', attname: 'status', type: 'text', comment: 'a|b\nsegunda linha\r\nterceira' },
      { relname: 'pedidos', attname: 'id', type: 'uuid', comment: null },
    ],
    functions: [{ proname: 'f', args: '', comment: 'linha 1\nlinha 2 | fim' }],
    banner: 'aviso [1] de 2\n',
  });
  const result = ws.run('generate-database-dictionary.mjs');
  assert.equal(result.status, 0, result.stderr);
  const doc = ws.doc('DATABASE_DICTIONARY.md');
  assert.ok(doc.includes('| `status` | `text` | a\\|b<br>segunda linha<br>terceira |\n'));
  assert.ok(doc.includes('| `id` | `uuid` | — |\n'));
  assert.ok(doc.includes('| `f` | `` | linha 1<br>linha 2 \\| fim |\n'));
  assert.ok(doc.includes('### `site_private.pedidos`\n\n_Sem comment on table'));
  assert.ok(doc.includes('### `site_private.sem_colunas`\n\nTabela <vazia> & rara\n\n| Coluna | Tipo | Comentário |\n|---|---|---|\n\n'));
  for (const line of doc.split('\n')) {
    if (line.startsWith('|')) assert.ok(line.endsWith('|'), `linha de tabela incompleta: ${line}`);
  }
});

test('ERD: identificador entre aspas na FK aponta para a mesma entidade da lista de tabelas; FK para outro schema usa o nome da tabela', (t) => {
  const ws = workspace(t, {
    tableNames: [{ relname: 'a-b' }, { relname: 'c' }],
    foreignKeys: [
      { from_table: 'site_private."a-b"', to_table_raw: 'auth.users', conname: 'x' },
      { from_table: 'c', to_table_raw: 'c', conname: 'y' },
    ],
    agentMode: true,
  });
  assert.equal(ws.run('generate-database-schema-doc.mjs').status, 0);
  const doc = ws.doc('DATABASE_SCHEMA.md');
  assert.ok(doc.includes('erDiagram\n  a_b\n  c\n  a_b }o--|| users : references\n  c }o--|| c : references\n```\n'), doc);
});

test('banco fora do ar: código 1, mensagem acionável em uma linha e nenhum arquivo escrito', (t) => {
  for (const script of ['generate-database-dictionary.mjs', 'generate-database-schema-doc.mjs']) {
    const ws = workspace(t, { exitCode: 1 });
    const result = ws.run(script);
    assert.equal(result.status, 1, script);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /failed to connect to postgres: connection refused\n/, 'stderr do CLI é preservado');
    assert.match(result.stderr, /db:site:(dictionary|schema-doc) falhou: supabase db query --local falhou \(código 1.*SUPABASE_WORKDIR=site-supabase supabase start\)\n$/);
    assert.doesNotMatch(result.stderr, /\n\s+at /, 'sem stack trace');
    assert.equal(ws.hasDoc('DATABASE_DICTIONARY.md') || ws.hasDoc('DATABASE_SCHEMA.md'), false);
    assert.equal(ws.calls().length, 1, 'para na primeira consulta que falha');
  }
});

test('sem nenhuma migration no padrão: código 1 e mensagem clara em vez de TypeError', (t) => {
  const ws = workspace(t, parseCommittedDictionary(), { migrations: ['README.md'] });
  const result = ws.run('generate-database-dictionary.mjs');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^db:site:dictionary falhou: nenhuma migration <14 dígitos>_<descrição>\.sql em /m);
  assert.equal(ws.hasDoc('DATABASE_DICTIONARY.md'), false);
});

test('resultado acima de 1 MiB não estoura o buffer padrão do Node (ENOBUFS)', (t) => {
  const big = 'x'.repeat(4_000);
  const columns = Array.from({ length: 600 }, (_, index) => ({ relname: 'grande', attname: `c${index}`, type: 'text', comment: big }));
  const ws = workspace(t, { tables: [{ relname: 'grande', obj_description: 'grande' }], columns, functions: [] });
  const result = ws.run('generate-database-dictionary.mjs');
  assert.equal(result.status, 0, result.stderr.slice(0, 400));
  assert.ok(ws.doc('DATABASE_DICTIONARY.md').length > 2_000_000);
});
