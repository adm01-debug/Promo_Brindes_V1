import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// O hook de sessão depende do wrapper (promoção preserva o log dele) e não tem npm script
// próprio: os testes dele entram aqui para rodar em `npm run test:graphify` e no graphify.yml.
import './session-start-hook.node.mjs';
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
  readProjectConfig,
  resolveGraphNode,
  shortestGraphPath,
  splitGraphSourceFiles,
  stageCorpusFiles,
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

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRAPPER = path.join(REPO_ROOT, 'scripts', 'graphify.mjs');

function runCli(script, args, { cwd = REPO_ROOT, env = {} } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function gitIn(cwd, ...args) {
  const env = { ...process.env };
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[name];
  return execFileSync('git', ['-c', 'user.email=teste@example.invalid', '-c', 'user.name=teste', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function writeStub(file, body) {
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return file;
}

/**
 * Cópia mínima e isolada do projeto: o wrapper deriva a raiz do próprio caminho, então os
 * cenários de CLI rodam sobre esta cópia, com um `graphify` falso e sem tocar no grafo real.
 */
function makeProjectFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'graphify-project-')));
  fs.mkdirSync(path.join(root, 'scripts'));
  for (const name of ['graphify.mjs', 'graphify-quality.mjs']) fs.copyFileSync(path.join(REPO_ROOT, 'scripts', name), path.join(root, 'scripts', name));
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  fs.copyFileSync(path.join(REPO_ROOT, '.graphify.project.json'), path.join(root, '.graphify.project.json'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"site-promo-brindes"}\n');
  fs.writeFileSync(path.join(root, 'package-lock.json'), '{}\n');
  fs.writeFileSync(path.join(root, '.graphifyignore'), 'dist/\n');
  fs.writeFileSync(path.join(root, '.graphifyrc'), 'viz_node_limit=2500\n');
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules\ngraphify-out/\n.graphify-work/\nbin/\n');
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(root, 'src', 'b.ts'), 'export const b = 2;\n');
  fs.mkdirSync(path.join(root, 'site-supabase', 'supabase', 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(root, 'site-supabase', 'supabase', 'migrations', '001.sql'), 'select 1;\n');
  gitIn(root, 'init', '-q', '-b', 'main', '.');
  gitIn(root, 'add', '-A');
  gitIn(root, 'commit', '-q', '-m', 'base');
  const output = path.join(root, 'graphify-out');
  fs.mkdirSync(path.join(output, 'database'), { recursive: true });
  const nodes = ['a', 'b', 'c'].map((id) => ({ id, label: `${id}.ts`, source_file: `src/${id}.ts`, source_location: 'L1' }));
  fs.writeFileSync(path.join(output, 'graph.json'), JSON.stringify({ directed: false, nodes, links: [{ source: 'a', target: 'b', relation: 'imports' }, { source: 'a', target: 'c', relation: 'imports' }] }));
  fs.writeFileSync(path.join(output, 'database', 'graph.json'), JSON.stringify({ directed: false, nodes: [{ id: 'm', label: '001.sql', source_file: 'site-supabase/supabase/migrations/001.sql' }], links: [] }));
  fs.writeFileSync(path.join(output, 'project-meta.json'), JSON.stringify({ project: 'Promo_Brindes_V1', mode: 'code-only', graphifyVersion: 'graphify 0.0.0-teste', sourceFingerprint: 'antigo', generatedAt: '2026-01-01T00:00:00.000Z', commit: 'abc', databaseGraph: { nodes: 1, links: 0 } }));
  fs.mkdirSync(path.join(root, 'bin'));
  const graphify = writeStub(path.join(root, 'bin', 'graphify'), 'if [ "$1" = "--version" ]; then echo "graphify 0.0.0-teste"; exit 0; fi\necho "stub: $1 indisponível" >&2\nexit 3');
  const wrapper = path.join(root, 'scripts', 'graphify.mjs');
  return {
    root,
    graphify,
    lockPath: path.join(root, '.graphify-work', 'build.lock'),
    run: (args, env = {}) => runCli(wrapper, args, { cwd: root, env: { GRAPHIFY_BIN: graphify, ...env } }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test('CLI chamado por caminho com symlink executa em vez de sair com 0 em silêncio', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graphify-symlink-'));
  try {
    const link = path.join(directory, 'repo');
    fs.symlinkSync(REPO_ROOT, link, 'dir');
    const result = runCli(path.join(link, 'scripts', 'graphify.mjs'), ['comando-inexistente']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Comando Graphify desconhecido: comando-inexistente/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('--help e -h mostram o uso com código 0; comando desconhecido continua falhando', () => {
  for (const flag of ['--help', '-h', 'help']) {
    const result = runCli(WRAPPER, [flag]);
    assert.equal(result.status, 0, flag);
    assert.match(result.stdout, /^Uso: node scripts\/graphify\.mjs </);
    assert.match(result.stdout, /compare --base/);
  }
  assert.equal(runCli(WRAPPER, ['--versao']).status, 1);
});

test('relatório de comparação é texto: relações sem o separador NUL interno', () => {
  const directory = makeTestDirectory('test-compare-');
  try {
    const base = { directed: false, nodes: [{ id: 'a', source_file: 'src/a.ts' }, { id: 'b', source_file: 'src/b.ts' }], links: [] };
    const head = { ...base, links: [{ source: 'b', target: 'a' }] };
    fs.writeFileSync(path.join(directory, 'base.json'), JSON.stringify(base));
    fs.writeFileSync(path.join(directory, 'head.json'), JSON.stringify(head));
    const output = path.join(directory, 'REPORT.md');
    const result = runCli(WRAPPER, ['compare', '--base', path.join(directory, 'base.json'), '--head', path.join(directory, 'head.json'), '--output', output]);
    assert.equal(result.status, 0, result.stderr);
    const report = fs.readFileSync(output, 'utf8');
    assert.equal(report.includes('\u0000'), false, 'relatório Markdown não pode conter NUL');
    assert.match(report, /^- `a — b`$/m);
    assert.match(report, /## Relações adicionadas \(1\)/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('comparação recusa saída fora da raiz e argumentos ausentes', () => {
  const outside = path.join(os.tmpdir(), 'graphify-fora-da-raiz.md');
  const graph = path.join(makeTestDirectory('test-compare-args-'), 'graph.json');
  try {
    fs.writeFileSync(graph, JSON.stringify({ directed: false, nodes: [{ id: 'a' }], links: [] }));
    const refused = runCli(WRAPPER, ['compare', '--base', graph, '--head', graph, '--output', outside]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /fora da raiz/);
    assert.equal(fs.existsSync(outside), false);
    assert.match(runCli(WRAPPER, ['compare', '--base', graph]).stderr, /Informe o arquivo --head/);
    assert.match(runCli(WRAPPER, ['compare', '--base', '--head', graph]).stderr, /Informe o arquivo --base/);
  } finally {
    fs.rmSync(path.dirname(graph), { recursive: true, force: true });
  }
});

test('rótulo com cifrão não corrompe o relatório e a normalização é idempotente', () => {
  const directory = makeTestDirectory('test-report-dollar-');
  try {
    const graphPath = path.join(directory, 'graph.json');
    const reportPath = path.join(directory, 'GRAPH_REPORT.md');
    fs.writeFileSync(graphPath, JSON.stringify({
      directed: false,
      nodes: [
        { id: 'file', label: 'jquery.ts', source_file: 'src/jquery.ts' },
        { id: 'dollar', label: '$', source_file: 'src/jquery.ts' },
        { id: 'match', label: '$&', source_file: 'src/jquery.ts' },
      ],
      links: [],
    }));
    fs.writeFileSync(reportPath, '# Graph Report - candidato\n\nMARCADOR-DE-INICIO\n\n## Knowledge Gaps\n- noise\n\n## Suggested Questions\nMARCADOR-DE-FIM\n');
    const options = { title: 'Promo Brindes', updateCommand: 'npm run graph:update' };
    normalizeGraphReport(reportPath, graphPath, options);
    const report = fs.readFileSync(reportPath, 'utf8');
    assert.equal(report.split('MARCADOR-DE-INICIO').length - 1, 1, 'o início do relatório não pode ser duplicado dentro da seção');
    assert.equal(report.split('MARCADOR-DE-FIM').length - 1, 1);
    assert.match(report, /2 nós de baixa conectividade:\*\* `\$`, `\$&`/);
    normalizeGraphReport(reportPath, graphPath, options);
    assert.equal(fs.readFileSync(reportPath, 'utf8'), report, 'segunda normalização não pode acrescentar outra seção');

    const bare = path.join(directory, 'BARE.md');
    fs.writeFileSync(bare, '# Graph Report - candidato\n\ncorpo\n');
    normalizeGraphReport(bare, graphPath, options);
    const first = fs.readFileSync(bare, 'utf8');
    normalizeGraphReport(bare, graphPath, options);
    assert.equal(fs.readFileSync(bare, 'utf8'), first);
    assert.equal(first.split('## Lacunas de conhecimento').length - 1, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('staging do corpus recusa caminho que escapa do diretório de destino', () => {
  const directory = makeTestDirectory('test-stage-');
  try {
    fs.mkdirSync(path.join(directory, 'root', 'src'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'root', 'src', 'a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(directory, 'segredo.txt'), 'fora do corpus');
    const destination = path.join(directory, 'destino', 'corpus');
    assert.throws(() => stageCorpusFiles(path.join(directory, 'root'), destination, ['src/a.ts', '../segredo.txt']), /fora do diretório de staging/);
    assert.equal(fs.existsSync(path.join(directory, 'destino', 'segredo.txt')), false);
    assert.equal(fs.readFileSync(path.join(destination, 'src', 'a.ts'), 'utf8'), 'export const a = 1;\n');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('promoção carrega log e trava do hook de sessão no mesmo inode e descarta o resto', () => {
  const directory = makeTestDirectory('test-promote-sidecar-');
  const candidate = path.join(directory, 'candidato');
  const destination = path.join(directory, 'graphify-out');
  let logFd;
  try {
    fs.mkdirSync(candidate);
    fs.writeFileSync(path.join(candidate, 'graph.json'), '{"novo":true}\n');
    fs.mkdirSync(destination);
    fs.writeFileSync(path.join(destination, 'graph.json'), '{"antigo":true}\n');
    fs.writeFileSync(path.join(destination, '.session-built-commit'), 'abc\n');
    fs.writeFileSync(path.join(destination, '.session-start.lock'), '');
    logFd = fs.openSync(path.join(destination, '.session-start.log'), 'a');
    fs.writeSync(logFd, 'antes do build\n');
    const lockInode = fs.statSync(path.join(destination, '.session-start.lock')).ino;
    promoteCandidate(candidate, destination);
    // O hook continua escrevendo pelo descritor aberto antes da troca do diretório.
    fs.writeSync(logFd, 'depois do build\n');
    assert.equal(fs.readFileSync(path.join(destination, '.session-start.log'), 'utf8'), 'antes do build\ndepois do build\n');
    assert.equal(fs.statSync(path.join(destination, '.session-start.lock')).ino, lockInode);
    assert.equal(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'), '{"novo":true}\n');
    assert.equal(fs.existsSync(path.join(destination, '.session-built-commit')), false);
    assert.equal(fs.existsSync(`${destination}.previous`), false);
  } finally {
    if (logFd !== undefined) fs.closeSync(logFd);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('configuração recusa diretório de saída ou de trabalho fora da raiz', () => {
  const directory = makeTestDirectory('test-config-');
  try {
    const valid = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.graphify.project.json'), 'utf8'));
    const write = (overrides) => fs.writeFileSync(path.join(directory, '.graphify.project.json'), JSON.stringify({ ...valid, ...overrides }));
    write({});
    assert.equal(readProjectConfig(directory).outputDirectory, 'graphify-out');
    for (const outputDirectory of ['..', '../fora', 'graphify-out/../..', '/tmp/fora', '.', './']) {
      write({ outputDirectory });
      assert.throws(() => readProjectConfig(directory), /outputDirectory deve ser um subdiretório relativo/, outputDirectory);
    }
    write({ workspaceDirectory: '../.graphify-work' });
    assert.throws(() => readProjectConfig(directory), /workspaceDirectory deve ser um subdiretório relativo/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('status sobrevive a arquivo rastreado apagado do disco e a configuração opcional removida', () => {
  const project = makeProjectFixture();
  try {
    assert.match(project.run(['status']).stdout, /^Graphify: DEFASADO — arquivos de engenharia ou configuração mudaram/);
    fs.rmSync(path.join(project.root, 'src', 'b.ts'));
    const deleted = project.run(['status']);
    assert.equal(deleted.status, 0, deleted.stderr);
    assert.match(deleted.stdout, /^Graphify: DEFASADO/);
    fs.rmSync(path.join(project.root, '.graphifyrc'));
    const withoutOptionalConfig = project.run(['check']);
    assert.match(withoutOptionalConfig.stdout, /^Graphify: DEFASADO/);
    assert.equal(withoutOptionalConfig.stderr, '');
    assert.equal(withoutOptionalConfig.status, 1, 'check continua falhando quando o grafo está defasado');
  } finally {
    project.cleanup();
  }
});

test('CLI ausente gera instrução de instalação em vez de ENOENT cru', () => {
  const project = makeProjectFixture();
  try {
    const result = project.run(['status'], { GRAPHIFY_BIN: path.join(project.root, 'bin', 'nao-existe') });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /não encontrado\. Instale a versão fixada com `python -m pip install -r requirements-graphify\.txt`/);
    assert.doesNotMatch(result.stderr, /spawnSync/);
  } finally {
    project.cleanup();
  }
});

test('subprocesso travado é interrompido pelo limite de tempo com mensagem acionável', () => {
  const project = makeProjectFixture();
  try {
    const slow = writeStub(path.join(project.root, 'bin', 'graphify-lento'), 'exec sleep 30');
    const startedAt = Date.now();
    const result = project.run(['status'], { GRAPHIFY_BIN: slow, GRAPHIFY_TIMEOUT_MS: '300' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /excedeu .*GRAPHIFY_TIMEOUT_MS/);
    assert.ok(Date.now() - startedAt < 15_000, 'não pode esperar o subprocesso terminar sozinho');
  } finally {
    project.cleanup();
  }
});

test('trava de build órfã (processo morto) é recuperada; trava de processo vivo é respeitada', () => {
  const project = makeProjectFixture();
  try {
    fs.mkdirSync(path.dirname(project.lockPath), { recursive: true });
    const deadPid = spawnSync(process.execPath, ['-e', '']).pid;
    fs.writeFileSync(project.lockPath, JSON.stringify({ pid: deadPid, host: os.hostname(), createdAt: new Date().toISOString() }));
    const recovered = project.run(['build']);
    assert.doesNotMatch(recovered.stderr, /Outra geração Graphify/);
    assert.match(recovered.stderr, /falhou com código 3/, 'passou da trava e parou só no graphify falso');
    assert.throws(() => fs.readFileSync(project.lockPath), { code: 'ENOENT' }, 'trava liberada depois da falha');
    assert.ok(fs.existsSync(path.join(project.root, 'graphify-out', 'graph.json')), 'grafo anterior permanece');

    const alive = JSON.stringify({ pid: process.pid, host: os.hostname(), createdAt: new Date().toISOString() });
    fs.writeFileSync(project.lockPath, alive);
    const busy = project.run(['build']);
    assert.equal(busy.status, 1);
    assert.match(busy.stderr, /Outra geração Graphify está em andamento/);
    assert.equal(fs.readFileSync(project.lockPath, 'utf8'), alive, 'trava alheia não pode ser removida');

    fs.writeFileSync(project.lockPath, JSON.stringify({ pid: deadPid, host: 'outro-host', createdAt: new Date().toISOString() }));
    assert.match(project.run(['build']).stderr, /Outra geração Graphify está em andamento/, 'PID de outro host não prova nada');
  } finally {
    project.cleanup();
  }
});

test('falha ao criar o diretório temporário não deixa a trava de build para trás', () => {
  const project = makeProjectFixture();
  try {
    const result = project.run(['build'], { TMPDIR: path.join(project.root, 'tmp-inexistente') });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mkdtemp/);
    assert.equal(fs.existsSync(project.lockPath), false);
  } finally {
    project.cleanup();
  }
});

test('saída cortada pelo leitor (| head) não derruba o CLI com EPIPE', async () => {
  const project = makeProjectFixture();
  try {
    // Como `head -1`: o leitor recebe a primeira linha (console.log) e fecha o pipe antes do
    // repasse da saída do graphify, feito com process.stdout.write — que propaga o EPIPE.
    const graphify = writeStub(path.join(project.root, 'bin', 'graphify-consulta'), 'sleep 1\necho "NODE a.ts [src=src/a.ts loc=L1]"');
    const child = spawn(process.execPath, [path.join(project.root, 'scripts', 'graphify.mjs'), 'query', 'a'], {
      cwd: project.root,
      env: { ...process.env, GRAPHIFY_BIN: graphify },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.once('data', () => child.stdout.destroy());
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const status = await new Promise((resolve) => child.on('close', resolve));
    assert.doesNotMatch(stderr, /EPIPE|Unhandled 'error' event/);
    assert.equal(status, 0);
  } finally {
    project.cleanup();
  }
});
