import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { BASELINE_PATH, WATCHED_NAMESPACES, findOrphans, readBaseline } from '../scripts/check-orphan-refs.mjs';

test('aponta só o blob que não está na main nem na linha de base', () => {
  const blobs = {
    'autosave/a': [{ blob: 'a'.repeat(40), path: 'src/novo.ts' }, { blob: 'b'.repeat(40), path: 'src/ja-na-main.ts' }],
    'autosave/b': [{ blob: 'c'.repeat(40), path: 'docs/triado.md' }],
  };
  const orphans = findOrphans(
    Object.keys(blobs),
    new Set(['b'.repeat(40)]),
    new Set(['c'.repeat(40)]),
    (ref) => blobs[ref],
  );
  assert.deepEqual(orphans, [{ ref: 'autosave/a', blob: 'a'.repeat(40), path: 'src/novo.ts' }]);
});

test('linha de base ausente não é erro; inválida falha com a causa', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orphan-refs-'));
  try {
    const file = path.join(directory, 'baseline.json');
    assert.deepEqual([...readBaseline(file)], []);
    fs.writeFileSync(file, '{"sem":"triaged"}');
    assert.throws(() => readBaseline(file), /Linha de base inválida/);
    fs.writeFileSync(file, JSON.stringify({ triaged: [{ blob: 'd'.repeat(40) }] }));
    assert.deepEqual([...readBaseline(file)], ['d'.repeat(40)]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('a linha de base versionada tem veredito legível em toda entrada', () => {
  const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  assert.ok(parsed.triaged.length > 0, 'linha de base vazia esconderia tudo');
  for (const entry of parsed.triaged) {
    assert.match(entry.blob, /^[0-9a-f]{40}$/, `blob inválido em ${entry.path}`);
    assert.ok(entry.path && entry.ref, 'entrada sem ref ou caminho não é auditável');
    // Sem motivo escrito, a linha de base vira um silenciador anônimo.
    assert.ok(entry.verdict && entry.verdict.length > 20, `veredito curto demais em ${entry.path}`);
  }
  assert.deepEqual(WATCHED_NAMESPACES, ['refs/autosave']);
});
