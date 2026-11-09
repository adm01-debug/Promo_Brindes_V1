import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// scripts/sql/verify-shared-selection-contract.sql só executa contra um Postgres com as
// migrations do site. Este teste estático segura o que dá para garantir sem banco: o ensaio
// não deixa resíduo (begin/rollback, com timeouts) e chama as RPCs com a aridade que a
// migration mais recente de cada uma define — uma mudança de assinatura quebra aqui, não
// na hora em que alguém roda o ensaio contra o banco isolado.

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SQL = fs.readFileSync(path.join(ROOT, 'scripts', 'sql', 'verify-shared-selection-contract.sql'), 'utf8');
const MIGRATIONS_DIR = path.join(ROOT, 'site-supabase', 'supabase', 'migrations');

function balancedArguments(text, openIndex) {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "'") quoted = !quoted;
    if (!quoted && char === '(') {
      depth += 1;
      if (depth === 1) continue;
    }
    if (!quoted && char === ')') {
      depth -= 1;
      if (depth === 0) {
        if (current.trim()) parts.push(current.trim());
        return parts;
      }
    }
    if (!quoted && depth === 1 && char === ',') {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  throw new Error('parênteses não fechados');
}

function calledFunctions(sql) {
  return [...sql.matchAll(/public\.([a-z_]+)\(/g)].map((match) => ({
    name: match[1],
    arity: balancedArguments(sql, match.index + match[0].length - 1).length,
  }));
}

function latestSignature(name) {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql')).sort();
  let signature = null;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const match of sql.matchAll(new RegExp(`create (?:or replace )?function public\\.${name}\\(`, 'gi'))) {
      const parameters = balancedArguments(sql, match.index + match[0].length - 1);
      signature = { file, total: parameters.length, required: parameters.filter((parameter) => !/\bdefault\b/i.test(parameter)).length };
    }
  }
  return signature;
}

test('o ensaio é transacional, com timeouts, e termina em rollback sem commit', () => {
  const statements = SQL.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
  assert.match(statements, /^begin;\n/);
  assert.match(statements, /\nrollback;\n?$/);
  assert.doesNotMatch(statements, /\bcommit\b/i);
  assert.match(statements, /set local statement_timeout = '\d+s';/);
  assert.match(statements, /set local lock_timeout = '\d+s';/);
  assert.match(statements, /select true as shared_selection_roundtrip_and_revocation_verified;/);
});

test('cada RPC é chamada com a aridade definida na migration mais recente', () => {
  const calls = calledFunctions(SQL);
  assert.deepEqual([...new Set(calls.map((call) => call.name))].sort(), [
    'create_site_shared_selection',
    'get_site_shared_selection',
    'revoke_site_shared_selection',
  ]);
  for (const call of calls) {
    const signature = latestSignature(call.name);
    assert.ok(signature, `public.${call.name} não está definida em nenhuma migration`);
    assert.ok(
      call.arity >= signature.required && call.arity <= signature.total,
      `public.${call.name} chamada com ${call.arity} argumento(s); ${signature.file} define de ${signature.required} a ${signature.total}`,
    );
  }
});

test('o leitor de argumentos não se confunde com vírgulas e parênteses dentro de chamadas aninhadas e strings', () => {
  assert.deepEqual(balancedArguments("f(a, repeat('a,)(',64), g(b, c))", 1), ['a', "repeat('a,)(',64)", 'g(b, c)']);
  assert.deepEqual(balancedArguments('f()', 1), []);
  assert.throws(() => balancedArguments('f(a, (b', 1), /não fechados/);
});
