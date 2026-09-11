import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fingerprintEntries, findSensitiveArtifacts, normalizeQuery, validateGraph } from '../scripts/graphify.mjs';

test('fingerprint muda ao mudar conteúdo e preserva ordem determinística', () => {
  const source = new Map([['src/b.ts', 'export const b = 2;'], ['src/a.ts', 'export const a = 1;']]);
  const first = fingerprintEntries(['src/b.ts', 'src/a.ts'], (entry) => source.get(entry));
  const same = fingerprintEntries(['src/a.ts', 'src/b.ts'], (entry) => source.get(entry));
  source.set('src/b.ts', 'export const b = 3;');
  assert.equal(first, same);
  assert.notEqual(first, fingerprintEntries(['src/a.ts', 'src/b.ts'], (entry) => source.get(entry)));
});

test('validação do grafo rejeita endpoints ausentes e caminhos fora da raiz', () => {
  assert.throws(() => validateGraph({ directed: false, nodes: [{ id: 'a', source_file: 'src/a.ts' }], links: [{ source: 'a', target: 'missing' }] }), /nós ausentes/);
  assert.throws(() => validateGraph({ directed: false, nodes: [{ id: 'a', source_file: '../.env' }], links: [] }), /fora da raiz/);
});

test('consulta em português expande termos do domínio sem executar conteúdo', () => {
  const expanded = normalizeQuery('Quero montar um orçamento pelo carrinho');
  assert.match(expanded, /quote request/);
  assert.match(expanded, /quote cart/);
  assert.throws(() => normalizeQuery(''), /Informe uma pergunta/);
  assert.throws(() => normalizeQuery('x'.repeat(501)), /máximo de 500/);
});

test('o grafo preserva relações de vizinhança para uma análise limitada', () => {
  const health = validateGraph({ directed: false, nodes: [{ id: 'quote', source_file: 'src/quote.ts' }, { id: 'cart', source_file: 'src/cart.ts' }], links: [{ source: 'quote', target: 'cart' }] });
  assert.deepEqual(health, { nodes: 2, links: 1, directed: false, selfLoops: 0 });
});

test('varredura de artefatos identifica token de exemplo sem expor o valor', () => {
  const directory = fs.mkdtempSync('/tmp/promo-brindes-graphify-test-');
  try {
    fs.writeFileSync(`${directory}/graph.json`, '{"note":"sbp_abcdefghijklmnopqrstuvwxyz123456"}');
    const findings = findSensitiveArtifacts(directory);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].kind, 'Supabase personal access token');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('varredura bloqueia famílias adicionais de token antes do upload', () => {
  const directory = fs.mkdtempSync('/tmp/promo-brindes-graphify-test-');
  try {
    fs.writeFileSync(`${directory}/artifact.txt`, 'ghp_abcdefghijklmnopqrstuvwxyz123456 vercel_token_abcdefghijklmnopqrstuvwxyz AWS=AKIAABCDEFGHIJKLMNOP');
    const kinds = findSensitiveArtifacts(directory).map((finding) => finding.kind);
    assert.deepEqual(kinds.sort(), ['AWS access key', 'GitHub token', 'Vercel token']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
