import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compareGraphStructures, evaluateGraphBenchmark, explainGraphNode, fingerprintEntries, findSensitiveArtifacts, normalizeQuery, resolveGraphNode, shortestGraphPath, validateGraph } from '../scripts/graphify.mjs';

const navigationGraph = {
  directed: false,
  nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase(), source_file: `src/${id}.ts`, source_location: 'L1' })),
  links: [{ source: 'a', target: 'b', relation: 'imports', confidence: 'EXTRACTED' }, { source: 'b', target: 'c', relation: 'calls' }],
};

test('path encontra menor caminho, identidade e nós desconectados sem inventar relações', () => {
  assert.deepEqual(shortestGraphPath(navigationGraph, 'A', 'c').map((node) => node.id), ['a', 'b', 'c']);
  assert.deepEqual(shortestGraphPath(navigationGraph, 'a', 'a').map((node) => node.id), ['a']);
  assert.deepEqual(shortestGraphPath(navigationGraph, 'a', 'd'), []);
  assert.deepEqual(shortestGraphPath({ ...navigationGraph, directed: true }, 'c', 'a'), []);
});

test('explain preserva fonte e confiança e identifica conexões de entrada', () => {
  const result = explainGraphNode({ ...navigationGraph, directed: true }, 'B');
  assert.equal(result.node.source_file, 'src/b.ts');
  assert.deepEqual(result.connections.map((edge) => edge.direction), ['entrada', 'saída']);
  assert.equal(result.connections[0].confidence, 'EXTRACTED');
  assert.equal(result.connections[1].confidence, 'confiança não informada');
});

test('nomes ambíguos e símbolos ausentes não escolhem um resultado arbitrário', () => {
  const graph = { ...navigationGraph, nodes: [...navigationGraph.nodes, { id: 'other-a', label: 'A' }] };
  assert.throws(() => resolveGraphNode(graph, 'missing'), /não encontrado/);
  // IDs são desambiguadores explícitos, mesmo quando há rótulos homônimos.
  assert.equal(resolveGraphNode(graph, 'a').id, 'a');
  graph.nodes.push({ id: 'x', label: 'same' }, { id: 'y', label: 'same' });
  assert.throws(() => resolveGraphNode(graph, 'same'), /ambíguo/);
});

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
  assert.match(normalizeQuery('Como valida os dados?'), /normalizeLeadPayload contracts/);
  assert.match(normalizeQuery('Como retém dados antigos?'), /retention site_retention/);
  assert.throws(() => normalizeQuery(''), /Informe uma pergunta/);
  assert.throws(() => normalizeQuery('x'.repeat(501)), /máximo de 500/);
});

test('o grafo preserva relações de vizinhança para uma análise limitada', () => {
  const health = validateGraph({ directed: false, nodes: [{ id: 'quote', source_file: 'src/quote.ts' }, { id: 'cart', source_file: 'src/cart.ts' }], links: [{ source: 'quote', target: 'cart' }] });
  assert.deepEqual(health, { nodes: 2, links: 1, directed: false, selfLoops: 0 });
});

test('comparação base/head relata mudanças estruturais sem inferir causalidade', () => {
  const base = { directed: false, nodes: [{ id: 'a', source_file: 'src/a.ts' }, { id: 'b', source_file: 'src/b.ts' }], links: [{ source: 'a', target: 'b' }] };
  const head = { directed: false, nodes: [{ id: 'b', source_file: 'src/b.ts' }, { id: 'c', source_file: 'src/c.ts' }], links: [{ source: 'b', target: 'c' }] };
  const comparison = compareGraphStructures(base, head);
  assert.deepEqual(comparison.addedNodes, ['c']);
  assert.deepEqual(comparison.removedNodes, ['a']);
  assert.deepEqual(comparison.addedSources, ['src/c.ts']);
  assert.deepEqual(comparison.removedSources, ['src/a.ts']);
  assert.equal(comparison.addedEdges.length, 1);
  assert.equal(comparison.removedEdges.length, 1);
});

test('benchmark exige recuperação pelo grafo e busca direta para cada cenário', () => {
  const results = evaluateGraphBenchmark(
    [{ id: 'B01', question: 'Como funciona o orçamento?', source: 'src/QuotePage.tsx', directSearch: 'submit' }],
    () => 'NODE QuotePage.tsx [src=src/QuotePage.tsx loc=L1]',
    () => 'async function submit() {}',
  );
  assert.deepEqual(results, [{ id: 'B01', source: 'src/QuotePage.tsx', graphFound: true, directFound: true }]);
});

test('varredura de artefatos identifica token de exemplo sem expor o valor', () => {
  const directory = fs.mkdtempSync('/tmp/promo-brindes-graphify-test-');
  try {
    const examplePat = `sbp_${'abcdefghijklmnopqrstuvwxyz123456'}`;
    fs.writeFileSync(`${directory}/graph.json`, JSON.stringify({ note: examplePat }));
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
    const githubToken = `ghp_${'abcdefghijklmnopqrstuvwxyz123456'}`;
    const vercelToken = `vercel_token_${'abcdefghijklmnopqrstuvwxyz'}`;
    // Constrói a assinatura apenas em runtime: é uma fixture para validar o
    // detector, não uma credencial que deva parecer exposta ao scanner.
    const awsKey = `${['A', 'K', 'I', 'A'].join('')}${'ABCDEFGHIJKLMNOP'}`;
    fs.writeFileSync(`${directory}/artifact.txt`, `${githubToken} ${vercelToken} AWS=${awsKey}`);
    const kinds = findSensitiveArtifacts(directory).map((finding) => finding.kind);
    assert.deepEqual(kinds.sort(), ['AWS access key', 'GitHub token', 'Vercel token']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
