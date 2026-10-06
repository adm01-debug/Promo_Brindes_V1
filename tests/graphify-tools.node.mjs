import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  GRAPH_FINGERPRINT_CONFIG_FILES,
  compareGraphStructures,
  enrichTypeScriptReferences,
  evaluateGraphBenchmark,
  explainGraphNode,
  fingerprintEntries,
  findSensitiveArtifacts,
  normalizeGraphReport,
  normalizeQuery,
  projectGapMetrics,
  promoteCandidate,
  resolveGraphNode,
  shortestGraphPath,
  splitGraphSourceFiles,
  validateGraph,
  validateSeparatedCorpora,
} from '../scripts/graphify.mjs';

const navigationGraph = {
  directed: false,
  nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase(), source_file: `src/${id}.ts`, source_location: 'L1' })),
  links: [{ source: 'a', target: 'b', relation: 'imports', confidence: 'EXTRACTED' }, { source: 'b', target: 'c', relation: 'calls' }],
};

function makeTestDirectory(prefix) {
  const testRoot = path.join(process.cwd(), '.graphify-work');
  fs.mkdirSync(testRoot, { recursive: true, mode: 0o700 });
  return fs.mkdtempSync(path.join(testRoot, prefix));
}

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
  assert.ok(GRAPH_FINGERPRINT_CONFIG_FILES.includes('package.json'));
  assert.ok(GRAPH_FINGERPRINT_CONFIG_FILES.includes('package-lock.json'));
});

test('promoção copia o candidato para staging no filesystem de destino', () => {
  const candidateParent = fs.mkdtempSync(path.join(os.tmpdir(), 'graphify-candidate-'));
  const destinationParent = makeTestDirectory('test-promote-');
  const candidate = path.join(candidateParent, 'graphify-out');
  const destination = path.join(destinationParent, 'graphify-out');
  try {
    fs.mkdirSync(candidate);
    fs.writeFileSync(path.join(candidate, 'graph.json'), '{"nodes":[],"links":[]}\n');
    fs.mkdirSync(destination);
    fs.writeFileSync(path.join(destination, 'old.txt'), 'old');
    promoteCandidate(candidate, destination);
    assert.equal(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'), '{"nodes":[],"links":[]}\n');
    assert.equal(fs.existsSync(path.join(destination, 'old.txt')), false);
    assert.equal(fs.existsSync(`${destination}.previous`), false);
  } finally {
    fs.rmSync(candidateParent, { recursive: true, force: true });
    fs.rmSync(destinationParent, { recursive: true, force: true });
  }
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
  assert.match(normalizeQuery('Como a sessão termina?'), /auth signOut CustomerAuthContext/);
  assert.match(normalizeQuery('Como a sessao termina?'), /auth signOut CustomerAuthContext/);
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

test('corpus principal e SQL são separados sem perder arquivos', () => {
  const files = ['src/App.tsx', 'api/index.ts', 'site-supabase/supabase/migrations/001.sql', 'site-supabase/supabase/tests/example.test.sql'];
  assert.deepEqual(splitGraphSourceFiles(files), {
    main: ['api/index.ts', 'src/App.tsx'],
    database: ['site-supabase/supabase/migrations/001.sql', 'site-supabase/supabase/tests/example.test.sql'],
  });
});

test('referências TypeScript conectam tipos a consumidores sem inventar tipos externos', () => {
  const directory = makeTestDirectory('test-types-');
  try {
    fs.mkdirSync(`${directory}/src`, { recursive: true });
    fs.writeFileSync(`${directory}/src/types.ts`, [
      'export interface QuoteEvent { id: string }',
      "export type DeliveryStatus = 'sent' | 'pending';",
    ].join('\n'));
    fs.writeFileSync(`${directory}/src/consumer.ts`, [
      "import type { QuoteEvent, DeliveryStatus } from './types.js';",
      'export function summarize(event: QuoteEvent): DeliveryStatus {',
      "  return event.id ? 'sent' : 'pending';",
      '}',
      'export function external(value: Promise<string>): string { return String(value); }',
    ].join('\n'));
    const graphPath = `${directory}/graph.json`;
    fs.writeFileSync(graphPath, JSON.stringify({
      directed: false,
      nodes: [
        { id: 'types-file', label: 'types.ts', source_file: 'src/types.ts' },
        { id: 'event', label: 'QuoteEvent', source_file: 'src/types.ts', _callable_class: true },
        { id: 'consumer-file', label: 'consumer.ts', source_file: 'src/consumer.ts' },
        { id: 'summarize', label: 'summarize()', source_file: 'src/consumer.ts' },
      ],
      links: [{ source: 'types-file', target: 'event', relation: 'contains', confidence: 'EXTRACTED' }],
    }));
    const result = enrichTypeScriptReferences(graphPath, directory, ['src/types.ts', 'src/consumer.ts']);
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    const status = graph.nodes.find((node) => node.label === 'DeliveryStatus');
    assert.ok(status, 'type alias ausente deve ganhar nó determinístico');
    assert.ok(graph.links.some((link) => link.source === 'summarize' && link.target === 'event' && link.relation === 'type_reference'));
    assert.ok(graph.links.some((link) => link.source === 'summarize' && link.target === status.id && link.relation === 'type_reference'));
    assert.equal(graph.nodes.some((node) => node.label === 'Promise'), false, 'tipo externo não deve ser inventado');
    assert.equal(result.nodesAdded, 1);
    assert.equal(result.typeReferenceEdgesAdded, 2);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('nomes TypeScript repetidos permanecem ambíguos após a terceira declaração', () => {
  const directory = makeTestDirectory('test-ambiguous-types-');
  try {
    fs.mkdirSync(`${directory}/src`, { recursive: true });
    for (const name of ['a', 'b', 'c']) {
      fs.writeFileSync(`${directory}/src/${name}.ts`, 'export interface RepeatedType { value: string }\n');
    }
    fs.writeFileSync(`${directory}/src/consumer.ts`, 'export type Consumer = RepeatedType;\n');
    const graphPath = `${directory}/graph.json`;
    fs.writeFileSync(graphPath, JSON.stringify({
      directed: false,
      nodes: ['a', 'b', 'c', 'consumer'].map((name) => ({ id: `${name}-file`, label: `${name}.ts`, source_file: `src/${name}.ts` })),
      links: [],
    }));
    enrichTypeScriptReferences(graphPath, directory, ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/consumer.ts']);
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    const repeatedIds = new Set(graph.nodes.filter((node) => node.label === 'RepeatedType').map((node) => node.id));
    assert.equal(graph.links.some((link) => link.relation === 'type_reference' && repeatedIds.has(link.target)), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('relatório usa baixa conectividade e exclui configuração da métrica', () => {
  const directory = makeTestDirectory('test-report-');
  try {
    const graph = {
      directed: false,
      nodes: [
        { id: 'file', label: 'feature.ts', source_file: 'src/feature.ts', community: 1 },
        { id: 'type', label: 'FeatureOptions', source_file: 'src/feature.ts', community: 1 },
        { id: 'helper', label: 'unusedHelper()', source_file: 'src/feature.ts', community: 1 },
        { id: 'consumer', label: 'useFeature()', source_file: 'src/consumer.ts', community: 1 },
        { id: 'recursive', label: 'recursive()', source_file: 'src/recursive.ts', community: 1 },
        { id: 'package', label: 'react', source_file: 'package.json', community: 2 },
        { id: 'concept', label: 'external-package', community: 3 },
      ],
      links: [
        { source: 'file', target: 'type', relation: 'contains' },
        { source: 'file', target: 'helper', relation: 'contains' },
        { source: 'file', target: 'consumer', relation: 'contains' },
        { source: 'type', target: 'consumer', relation: 'type_reference' },
        { source: 'recursive', target: 'recursive', relation: 'calls' },
        { source: 'package', target: 'file', relation: 'imports' },
      ],
    };
    const graphPath = `${directory}/graph.json`;
    const reportPath = `${directory}/GRAPH_REPORT.md`;
    fs.writeFileSync(graphPath, JSON.stringify(graph));
    fs.writeFileSync(reportPath, '# Graph Report - candidate-123 (2026-10-05)\n\n## Graph Freshness\n- Run `graphify update .` after code changes (no API cost).\n\n## Knowledge Gaps\n- **2 isolated node(s):** noise\n\n## Suggested Questions\n');
    const metrics = projectGapMetrics(graph);
    assert.deepEqual(metrics.lowConnectivityNodes.map((node) => node.id).sort(), ['consumer', 'helper', 'recursive', 'type']);
    const normalized = normalizeGraphReport(reportPath, graphPath, { title: 'Promo Brindes', updateCommand: 'npm run graph:update' });
    const report = fs.readFileSync(reportPath, 'utf8');
    assert.match(report, /^# Relatório Graphify — Promo Brindes/m);
    assert.match(report, /4 nós de baixa conectividade/);
    assert.doesNotMatch(report, /isolated node/);
    assert.match(report, /npm run graph:update/);
    assert.equal(normalized.excludedConfigurationNodes, 1);
    assert.equal(normalized.excludedConceptNodes, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('validação impede mistura entre mapa principal e mapa SQL', () => {
  const main = { nodes: [{ id: 'app', source_file: 'src/App.tsx' }], links: [] };
  const database = { nodes: [{ id: 'migration', source_file: 'site-supabase/supabase/migrations/001.sql' }], links: [] };
  assert.deepEqual(validateSeparatedCorpora(main, database), { sqlInMain: 0, nonSqlInDatabase: 0 });
  assert.throws(() => validateSeparatedCorpora({ nodes: database.nodes, links: [] }, database), /Mapa principal contém/);
  assert.throws(() => validateSeparatedCorpora(main, { nodes: main.nodes, links: [] }), /Mapa de banco contém/);
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
  const directory = makeTestDirectory('test-sensitive-');
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
  const directory = makeTestDirectory('test-sensitive-families-');
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
