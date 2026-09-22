#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = fs.realpathSync(path.resolve(SCRIPT_DIR, '..'));
const LOCK_PATH = path.join(PROJECT_ROOT, '.graphify-work', 'build.lock');
const COMMAND = process.argv[2] ?? 'help';
const COMMAND_ARGS = process.argv.slice(3);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql']);
const SAFE_GRAPH_FILES = new Set([
  'graph.json',
  'graph.html',
  'GRAPH_REPORT.md',
  'GRAPH_TREE.html',
  'BASE_HEAD_REPORT.md',
  'BENCHMARK.md',
  'manifest.json',
  '.graphify_analysis.json',
  'project-meta.json',
]);
const SENSITIVE_PATTERNS = [
  { name: 'Supabase personal access token', pattern: /sbp_[A-Za-z0-9_]{16,}/i },
  { name: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/i },
  { name: 'Vercel token', pattern: /vercel(?:_token)?_[A-Za-z0-9]{20,}/i },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Supabase service-role variable', pattern: /SUPABASE_(?:ACCESS_TOKEN|SERVICE_ROLE_KEY)\s*[=:]/i },
  { name: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'generic secret assignment', pattern: /(?:api[_-]?key|secret|password)\s*[=:]\s*["'][^"'\s]{12,}/i },
  { name: 'personal absolute path', pattern: /\/(?:home|Users)\/[A-Za-z0-9_.-]+\// },
];

export function assertSafeRoot(root = PROJECT_ROOT) {
  const realRoot = fs.realpathSync(root);
  const packagePath = path.join(realRoot, 'package.json');
  const configPath = path.join(realRoot, '.graphify.project.json');
  if (!fs.existsSync(packagePath) || !fs.existsSync(configPath)) {
    throw new Error('Raiz inválida: package.json e .graphify.project.json são obrigatórios.');
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (packageJson.name !== config.packageName || config.project !== 'Promo_Brindes_V1') {
    throw new Error('Recusado: Graphify só pode operar a raiz explícita Promo_Brindes_V1.');
  }
  return realRoot;
}

export function readProjectConfig(root = PROJECT_ROOT) {
  const config = JSON.parse(fs.readFileSync(path.join(root, '.graphify.project.json'), 'utf8'));
  const requiredStringFields = ['project', 'packageName', 'graphifyVersion', 'mode', 'outputDirectory', 'workspaceDirectory'];
  for (const field of requiredStringFields) {
    if (typeof config[field] !== 'string' || !config[field]) throw new Error(`Configuração Graphify inválida: ${field}.`);
  }
  if (config.mode !== 'code-only') throw new Error('Configuração Graphify inválida: somente mode=code-only é permitido na automação.');
  if (!Array.isArray(config.sourceRoots) || config.sourceRoots.length === 0) throw new Error('Configuração Graphify inválida: sourceRoots.');
  if (!Number.isInteger(config.maxWorkers) || config.maxWorkers < 1 || config.maxWorkers > 8) throw new Error('Configuração Graphify inválida: maxWorkers deve estar entre 1 e 8.');
  return config;
}

function run(command, args, { cwd = PROJECT_ROOT, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONHASHSEED: '0',
      GRAPHIFY_VIZ_NODE_LIMIT: String(readProjectConfig().visualizationNodeLimit),
    },
  });
  if (!quiet) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} falhou com código ${result.status ?? 'desconhecido'}.`);
  return result.stdout ?? '';
}

function graphifyCommand() {
  return process.env.GRAPHIFY_BIN || 'graphify';
}

function git(args) {
  return execFileSync('git', args, { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
}

function graphDirectory(config) {
  return path.join(PROJECT_ROOT, config.outputDirectory);
}

function ensureGraphExists(config) {
  const graphPath = path.join(graphDirectory(config), 'graph.json');
  if (!fs.existsSync(graphPath)) throw new Error('Grafo ausente. Execute `npm run graph:build` primeiro.');
  return graphPath;
}

function ensureWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) return;
  throw new Error(`Caminho fora da raiz recusado: ${candidate}`);
}

function listSourceFiles(root, config) {
  const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'buffer' })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort();
  const allowedRoots = config.sourceRoots.map((entry) => entry.replace(/\\/g, '/').replace(/\/$/, ''));
  return tracked.filter((relative) => {
    const normalized = relative.replace(/\\/g, '/');
    const isAllowed = allowedRoots.some((allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`));
    if (!isAllowed || normalized.includes('/..') || normalized.startsWith('../')) return false;
    const absolute = path.resolve(root, normalized);
    ensureWithinRoot(root, absolute);
    const stat = fs.lstatSync(absolute);
    return stat.isFile() && !stat.isSymbolicLink() && CODE_EXTENSIONS.has(path.extname(normalized).toLowerCase());
  });
}

export function fingerprintEntries(entries, readFile) {
  const hash = crypto.createHash('sha256');
  for (const entry of [...entries].sort()) {
    hash.update(entry);
    hash.update('\0');
    hash.update(readFile(entry));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function sourceFingerprint(root, config) {
  const entries = listSourceFiles(root, config);
  const configFiles = ['.graphify.project.json', '.graphifyignore', '.graphifyrc'];
  return {
    files: entries,
    hash: fingerprintEntries([...entries, ...configFiles], (relative) => fs.readFileSync(path.join(root, relative))),
  };
}

export function validateGraph(graph, root = PROJECT_ROOT) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) throw new Error('graph.json inválido: nodes e links são obrigatórios.');
  if (graph.nodes.length === 0) throw new Error('graph.json inválido: grafo vazio não pode ser promovido.');
  const ids = new Set();
  for (const node of graph.nodes) {
    if (!node?.id || typeof node.id !== 'string') throw new Error('graph.json inválido: nó sem id.');
    if (ids.has(node.id)) throw new Error(`graph.json inválido: id duplicado ${node.id}.`);
    ids.add(node.id);
    if (node.source_file) {
      if (path.isAbsolute(node.source_file) || node.source_file.split(/[\\/]/).includes('..')) throw new Error(`graph.json inválido: source_file fora da raiz (${node.source_file}).`);
      ensureWithinRoot(root, path.resolve(root, node.source_file));
    }
  }
  let dangling = 0;
  let selfLoops = 0;
  for (const link of graph.links) {
    if (!ids.has(link?.source) || !ids.has(link?.target)) dangling += 1;
    if (link?.source === link?.target) selfLoops += 1;
  }
  if (dangling > 0) throw new Error(`graph.json inválido: ${dangling} relação(ões) apontam para nós ausentes.`);
  return { nodes: graph.nodes.length, links: graph.links.length, directed: Boolean(graph.directed), selfLoops };
}

function graphNodeIds(graph) {
  return new Set(graph.nodes.map((node) => node.id));
}

function graphEdges(graph) {
  return new Set(graph.links.map((link) => {
    const endpoints = graph.directed ? [link.source, link.target] : [link.source, link.target].sort();
    return endpoints.join('\u0000');
  }));
}

function graphSourceFiles(graph) {
  return new Set(graph.nodes.map((node) => node.source_file).filter((value) => typeof value === 'string' && value));
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

/**
 * Comparação determinística de dois mapas estruturais. O resultado mede a
 * mudança observada no grafo, não causalidade: grafos não direcionados não
 * podem provar quais consumidores serão afetados por uma alteração.
 */
export function compareGraphStructures(baseGraph, headGraph) {
  const base = validateGraph(baseGraph);
  const head = validateGraph(headGraph);
  const baseNodes = graphNodeIds(baseGraph);
  const headNodes = graphNodeIds(headGraph);
  const baseEdges = graphEdges(baseGraph);
  const headEdges = graphEdges(headGraph);
  const baseSources = graphSourceFiles(baseGraph);
  const headSources = graphSourceFiles(headGraph);
  return {
    base,
    head,
    addedNodes: difference(headNodes, baseNodes),
    removedNodes: difference(baseNodes, headNodes),
    addedEdges: difference(headEdges, baseEdges),
    removedEdges: difference(baseEdges, headEdges),
    addedSources: difference(headSources, baseSources),
    removedSources: difference(baseSources, headSources),
  };
}

function graphComparisonMarkdown(comparison, { basePath, headPath }) {
  const section = (title, values) => [
    `## ${title}`,
    '',
    values.length ? values.map((value) => `- \`${value}\``).join('\n') : '_Nenhuma alteração._',
    '',
  ].join('\n');
  return [
    '# Relatório Graphify — base vs. head',
    '',
    `- Base: \`${basePath}\``,
    `- Head: \`${headPath}\``,
    `- Nós: ${comparison.base.nodes} → ${comparison.head.nodes}`,
    `- Relações: ${comparison.base.links} → ${comparison.head.links}`,
    `- Direção: ${comparison.head.directed ? 'direcionado' : 'não direcionado'}`,
    '',
    '> Limite: em um grafo não direcionado, estas diferenças revelam mudança estrutural; não demonstram impacto causal reverso.',
    '',
    section(`Arquivos adicionados (${comparison.addedSources.length})`, comparison.addedSources),
    section(`Arquivos removidos (${comparison.removedSources.length})`, comparison.removedSources),
    section(`Nós adicionados (${comparison.addedNodes.length})`, comparison.addedNodes.slice(0, 100)),
    section(`Nós removidos (${comparison.removedNodes.length})`, comparison.removedNodes.slice(0, 100)),
    section(`Relações adicionadas (${comparison.addedEdges.length})`, comparison.addedEdges.slice(0, 100)),
    section(`Relações removidas (${comparison.removedEdges.length})`, comparison.removedEdges.slice(0, 100)),
  ].join('\n');
}

function readGraphFile(candidate, label) {
  if (!candidate) throw new Error(`Informe o arquivo ${label}.`);
  const absolute = path.resolve(PROJECT_ROOT, candidate);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`Arquivo ${label} inválido: ${candidate}`);
  return { path: absolute, graph: JSON.parse(fs.readFileSync(absolute, 'utf8')) };
}

function argumentValue(name) {
  const index = COMMAND_ARGS.indexOf(name);
  if (index < 0 || !COMMAND_ARGS[index + 1] || COMMAND_ARGS[index + 1].startsWith('--')) return '';
  return COMMAND_ARGS[index + 1];
}

function compare() {
  const base = readGraphFile(argumentValue('--base'), '--base');
  const head = readGraphFile(argumentValue('--head'), '--head');
  const outputArgument = argumentValue('--output') || 'graphify-out/BASE_HEAD_REPORT.md';
  const output = path.resolve(PROJECT_ROOT, outputArgument);
  ensureWithinRoot(PROJECT_ROOT, output);
  const comparison = compareGraphStructures(base.graph, head.graph);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, graphComparisonMarkdown(comparison, {
    basePath: path.relative(PROJECT_ROOT, base.path) || path.basename(base.path),
    headPath: path.relative(PROJECT_ROOT, head.path) || path.basename(head.path),
  }));
  console.log(`Graphify: comparação criada em ${path.relative(PROJECT_ROOT, output)} — ${comparison.addedNodes.length} nó(s) e ${comparison.addedEdges.length} relação(ões) adicionados.`);
}

export function findSensitiveArtifacts(directory) {
  const findings = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      if (!entry.isFile()) continue;
      const text = fs.readFileSync(fullPath, 'utf8');
      for (const matcher of SENSITIVE_PATTERNS) {
        if (matcher.pattern.test(text)) findings.push({ file: path.relative(directory, fullPath), kind: matcher.name });
      }
    }
  };
  visit(directory);
  return findings;
}

function removeUnsafeCandidateArtifacts(candidateDirectory) {
  for (const entry of fs.readdirSync(candidateDirectory)) {
    if (!SAFE_GRAPH_FILES.has(entry)) fs.rmSync(path.join(candidateDirectory, entry), { recursive: true, force: true });
  }
}

function acquireLock(config) {
  const workDirectory = path.join(PROJECT_ROOT, config.workspaceDirectory);
  fs.mkdirSync(workDirectory, { recursive: true });
  try {
    const fd = fs.openSync(LOCK_PATH, 'wx');
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    fs.closeSync(fd);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const ageMs = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
    if (ageMs > 30 * 60 * 1000) {
      fs.rmSync(LOCK_PATH, { force: true });
      return acquireLock(config);
    }
    throw new Error('Outra geração Graphify está em andamento. Aguarde-a terminar; nenhum artefato foi alterado.', { cause: error });
  }
  return workDirectory;
}

function releaseLock() {
  fs.rmSync(LOCK_PATH, { force: true });
}

function writeProjectMeta(candidateDirectory, config, health, fingerprint) {
  const metadata = {
    schemaVersion: 1,
    project: config.project,
    generatedAt: new Date().toISOString(),
    commit: git(['rev-parse', 'HEAD']),
    graphifyVersion: run(graphifyCommand(), ['--version'], { quiet: true }).trim(),
    mode: config.mode,
    sourceFingerprint: fingerprint.hash,
    sourceFileCount: fingerprint.files.length,
    graph: health,
    safety: {
      usesNetwork: false,
      usesAiProvider: false,
      connectsToSupabase: false,
      containsAbsoluteProjectPath: false,
    },
    limitations: config.limitations,
  };
  fs.writeFileSync(path.join(candidateDirectory, 'project-meta.json'), `${JSON.stringify(metadata, null, 2)}\n`);
}

function promoteCandidate(candidateDirectory, config) {
  const outputDirectory = graphDirectory(config);
  const backupDirectory = `${outputDirectory}.previous`;
  fs.rmSync(backupDirectory, { recursive: true, force: true });
  const hadPrevious = fs.existsSync(outputDirectory);
  try {
    if (hadPrevious) fs.renameSync(outputDirectory, backupDirectory);
    fs.renameSync(candidateDirectory, outputDirectory);
    if (hadPrevious) fs.rmSync(backupDirectory, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(outputDirectory) && fs.existsSync(backupDirectory)) fs.renameSync(backupDirectory, outputDirectory);
    throw error;
  }
}

function build() {
  const root = assertSafeRoot();
  const config = readProjectConfig(root);
  const workDirectory = acquireLock(config);
  const candidateRoot = fs.mkdtempSync(path.join(workDirectory, 'candidate-'));
  const candidateDirectory = path.join(candidateRoot, config.outputDirectory);
  try {
    console.log('Graphify: extração estrutural local (sem IA, rede ou Supabase).');
    run(graphifyCommand(), ['extract', '.', '--code-only', '--out', candidateRoot, '--max-workers', String(config.maxWorkers)]);
    run(graphifyCommand(), ['cluster-only', candidateRoot, '--no-label']);
    run(graphifyCommand(), ['tree', '--graph', path.join(candidateDirectory, 'graph.json'), '--output', path.join(candidateDirectory, 'GRAPH_TREE.html'), '--root', '.', '--label', 'Promo Brindes V1']);
    removeUnsafeCandidateArtifacts(candidateDirectory);
    const graph = JSON.parse(fs.readFileSync(path.join(candidateDirectory, 'graph.json'), 'utf8'));
    const health = validateGraph(graph, root);
    const fingerprint = sourceFingerprint(root, config);
    writeProjectMeta(candidateDirectory, config, health, fingerprint);
    const sensitive = findSensitiveArtifacts(candidateDirectory);
    if (sensitive.length > 0) throw new Error(`Promoção bloqueada: conteúdo sensível ou caminho pessoal detectado em ${sensitive.map((item) => `${item.file} (${item.kind})`).join(', ')}.`);
    promoteCandidate(candidateDirectory, config);
    console.log(`Grafo promovido: ${health.nodes} nós, ${health.links} relações${health.directed ? ', direcionado.' : ', não direcionado (impacto = vizinhança, não causalidade).'} `);
    console.log(`Abra ${path.join(config.outputDirectory, 'graph.html')} ou ${path.join(config.outputDirectory, 'GRAPH_TREE.html')} localmente.`);
  } finally {
    fs.rmSync(candidateRoot, { recursive: true, force: true });
    releaseLock();
  }
}

function status({ strict = false } = {}) {
  const root = assertSafeRoot();
  const config = readProjectConfig(root);
  const outputDirectory = graphDirectory(config);
  const metaPath = path.join(outputDirectory, 'project-meta.json');
  if (!fs.existsSync(metaPath) || !fs.existsSync(path.join(outputDirectory, 'graph.json'))) {
    console.log('Graphify: AUSENTE — execute `npm run graph:build`.');
    if (strict) process.exitCode = 1;
    return;
  }
  let metadata;
  let health;
  try {
    metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    health = validateGraph(JSON.parse(fs.readFileSync(path.join(outputDirectory, 'graph.json'), 'utf8')), root);
  } catch (error) {
    console.log(`Graphify: INVÁLIDO — ${error.message}`);
    if (strict) process.exitCode = 1;
    return;
  }
  const fingerprint = sourceFingerprint(root, config);
  const version = run(graphifyCommand(), ['--version'], { quiet: true }).trim();
  const reasons = [];
  if (metadata.sourceFingerprint !== fingerprint.hash) reasons.push('arquivos de engenharia ou configuração mudaram');
  if (metadata.graphifyVersion !== version) reasons.push('versão do Graphify mudou');
  if (metadata.mode !== config.mode) reasons.push('modo configurado mudou');
  if (metadata.project !== config.project) reasons.push('projeto não confere');
  if (reasons.length) {
    console.log(`Graphify: DEFASADO — ${reasons.join('; ')}.`);
    console.log(`Última geração: ${metadata.generatedAt} no commit ${metadata.commit}.`);
    if (strict) process.exitCode = 1;
    return;
  }
  console.log(`Graphify: ATUAL — ${health.nodes} nós, ${health.links} relações; commit de origem ${metadata.commit}.`);
  if (!health.directed) console.log('Limite conhecido: o grafo é não direcionado; use impacto como vizinhança técnica, não como prova de causalidade.');
}

export function normalizeQuery(raw) {
  const text = raw.trim();
  if (!text) throw new Error('Informe uma pergunta para o grafo.');
  if (text.length > 500) throw new Error('Pergunta recusada: máximo de 500 caracteres.');
  const aliases = {
    orçamento: 'quote request',
    orcamento: 'quote request',
    carrinho: 'quote cart',
    catálogo: 'catalog',
    catalogo: 'catalog',
    cliente: 'customer',
    login: 'auth customer',
    busca: 'search',
    filtros: 'filters catalog',
    'e-mail': 'email notification',
    whatsapp: 'whatsapp notification',
    confirma: 'deliver quote confirmations',
    seleção: 'shared selection',
    selecao: 'shared selection',
    valida: 'normalizeLeadPayload contracts',
    retém: 'retention site_retention',
    retem: 'retention site_retention',
    'dados antigos': 'retention site_retention',
  };
  const expanded = Object.entries(aliases)
    .filter(([term]) => text.toLocaleLowerCase('pt-BR').includes(term))
    .map(([, value]) => value);
  return expanded.length ? `${text} ${expanded.join(' ')}` : text;
}

function readBenchmarkCases() {
  const benchmarkPath = path.join(PROJECT_ROOT, 'docs', 'graphify-benchmark.json');
  const data = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.cases) || data.cases.length !== 10) {
    throw new Error('Benchmark Graphify inválido: são exigidos exatamente 10 cenários versionados.');
  }
  return data.cases.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.question !== 'string'
      || typeof entry.source !== 'string' || typeof entry.directSearch !== 'string'
      || !entry.question.trim() || (!entry.source.startsWith('src/') && !entry.source.startsWith('api/') && !entry.source.startsWith('scripts/') && !entry.source.startsWith('site-supabase/'))) {
      throw new Error(`Benchmark Graphify inválido no cenário ${index + 1}.`);
    }
    return entry;
  });
}

/** Avalia recuperação estrutural e a busca direta equivalente sem falsear causalidade. */
export function evaluateGraphBenchmark(cases, runQuery, readSource) {
  return cases.map((entry) => {
    const graphOutput = runQuery(normalizeQuery(entry.question));
    const graphFound = graphOutput.includes(`[src=${entry.source}`);
    const sourceText = readSource(entry.source);
    const directFound = sourceText.includes(entry.directSearch);
    return { id: entry.id, source: entry.source, graphFound, directFound };
  });
}

function benchmark() {
  const config = readProjectConfig();
  const graphPath = ensureGraphExists(config);
  const cases = readBenchmarkCases();
  const results = evaluateGraphBenchmark(
    cases,
    (question) => run(graphifyCommand(), ['query', question, '--budget', String(config.queryTokenBudget), '--graph', graphPath], { quiet: true }),
    (source) => fs.readFileSync(path.join(PROJECT_ROOT, source), 'utf8'),
  );
  const failed = results.filter((result) => !result.graphFound || !result.directFound);
  const output = path.join(graphDirectory(config), 'BENCHMARK.md');
  const lines = [
    '# Benchmark estrutural Graphify',
    '',
    '> Este benchmark mede se dez perguntas representativas recuperam o arquivo de implementação esperado e se a busca direta encontra o mesmo ponto. Não mede entendimento humano nem prova causalidade.',
    '',
    '| Cenário | Grafo | Busca direta | Fonte esperada |',
    '| --- | --- | --- | --- |',
    ...results.map((result) => `| ${result.id} | ${result.graphFound ? 'ok' : 'falhou'} | ${result.directFound ? 'ok' : 'falhou'} | \`${result.source}\` |`),
    '',
    `Resultado: ${results.length - failed.length}/${results.length} cenários recuperados nos dois métodos.`,
  ];
  fs.writeFileSync(output, `${lines.join('\n')}\n`);
  if (failed.length) throw new Error(`Benchmark Graphify falhou: ${failed.map((result) => result.id).join(', ')}.`);
  console.log(`Graphify: benchmark estrutural aprovado (${results.length}/${results.length}); relatório em ${path.relative(PROJECT_ROOT, output)}.`);
}

function query() {
  const config = readProjectConfig();
  const graphPath = ensureGraphExists(config);
  const question = normalizeQuery(COMMAND_ARGS.join(' '));
  console.log(`Consulta expandida: ${question}`);
  run(graphifyCommand(), ['query', question, '--budget', String(config.queryTokenBudget), '--graph', graphPath]);
}

function impact() {
  const config = readProjectConfig();
  const graphPath = ensureGraphExists(config);
  const subject = COMMAND_ARGS.join(' ').trim();
  if (!subject || subject.length > 300) throw new Error('Informe um símbolo ou arquivo com até 300 caracteres.');
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const health = validateGraph(graph);
  if (health.directed) {
    run(graphifyCommand(), ['affected', subject, '--depth', '2', '--graph', graphPath]);
    return;
  }
  console.log('AVISO: a versão fixada gera grafo não direcionado. A saída abaixo é vizinhança técnica e não prova de impacto reverso causal.');
  const normalized = subject.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
  const matches = graph.nodes.filter((node) => {
    const label = String(node.label ?? '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
    const id = String(node.id ?? '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
    return label === normalized || id === normalized;
  });
  if (matches.length === 0) throw new Error(`Nenhum nó corresponde a "${subject}". Use \`npm run graph:query -- "${subject}"\` para localizar o símbolo.`);
  const seeds = matches.filter((node) => node._callable || node._callable_class);
  const selected = (seeds.length ? seeds : matches).slice(0, 5);
  const adjacency = new Map(graph.nodes.map((node) => [node.id, new Set()]));
  for (const link of graph.links) {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
  }
  const distances = new Map(selected.map((node) => [node.id, 0]));
  const queue = selected.map((node) => node.id);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const distance = distances.get(current);
    if (distance >= 2) continue;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distance + 1);
        queue.push(neighbor);
      }
    }
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  console.log(`Semente(s): ${selected.map((node) => node.label).join(', ')}.`);
  for (const distance of [1, 2]) {
    const related = [...distances.entries()]
      .filter(([, value]) => value === distance)
      .map(([id]) => byId.get(id))
      .filter(Boolean)
      .slice(0, 25);
    console.log(`\n${distance === 1 ? 'Direto' : 'Transitivo (até 2 saltos)'}: ${related.length}${related.length === 25 ? '+' : ''} nó(s).`);
    for (const node of related) console.log(`- ${node.label} — ${node.source_file ?? 'origem desconhecida'}${node.source_location ? ` ${node.source_location}` : ''}`);
  }
}

export function resolveGraphNode(graph, subject) {
  const query = String(subject || '').trim().toLocaleLowerCase('pt-BR');
  if (!query || query.length > 500) throw new Error('Informe o ID ou nome exato de um nó.');
  const exactId = graph.nodes.find((node) => String(node.id).toLocaleLowerCase('pt-BR') === query);
  if (exactId) return exactId;
  const matches = graph.nodes.filter((node) => String(node.label || '').toLocaleLowerCase('pt-BR') === query);
  if (!matches.length) throw new Error(`Nó não encontrado: ${subject}. Consulte graph:query.`);
  if (matches.length > 1) throw new Error(`Nome ambíguo: ${subject}. Use um ID: ${matches.map((node) => node.id).join(', ')}`);
  return matches[0];
}

export function shortestGraphPath(graph, from, to) {
  validateGraph(graph);
  const source = resolveGraphNode(graph, from);
  const target = resolveGraphNode(graph, to);
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.links) {
    adjacency.get(edge.source).push(edge.target);
    if (!graph.directed) adjacency.get(edge.target).push(edge.source);
  }
  const previous = new Map([[source.id, null]]);
  const queue = [source.id];
  for (let index = 0; index < queue.length && !previous.has(target.id); index += 1) {
    for (const neighbor of adjacency.get(queue[index])) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, queue[index]);
      queue.push(neighbor);
    }
  }
  if (!previous.has(target.id)) return [];
  const ids = [];
  for (let id = target.id; id !== null; id = previous.get(id)) ids.push(id);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return ids.reverse().map((id) => byId.get(id));
}

export function explainGraphNode(graph, subject) {
  validateGraph(graph);
  const node = resolveGraphNode(graph, subject);
  const byId = new Map(graph.nodes.map((entry) => [entry.id, entry]));
  return {
    node,
    connections: graph.links.filter((edge) => edge.source === node.id || edge.target === node.id).map((edge) => ({
      node: byId.get(edge.source === node.id ? edge.target : edge.source),
      relation: edge.relation || 'relação não classificada',
      confidence: edge.confidence || 'confiança não informada',
      direction: !graph.directed ? 'vizinhança' : edge.source === node.id ? 'saída' : 'entrada',
    })),
  };
}

function inspectGraph(mode) {
  const config = readProjectConfig();
  const graph = JSON.parse(fs.readFileSync(ensureGraphExists(config), 'utf8'));
  const location = (node) => `${node.label || node.id} — ${node.source_file || 'origem não informada'} ${node.source_location || ''}`.trim();
  console.log('Mapa estrutural: relações não comprovam comportamento, causalidade ou publicação.');
  if (mode === 'path') {
    if (COMMAND_ARGS.length !== 2) throw new Error('Use graph:path -- "origem" "destino".');
    const nodes = shortestGraphPath(graph, ...COMMAND_ARGS);
    if (!nodes.length) { console.log('Não há caminho entre os nós no grafo atual.'); return; }
    console.log(`${nodes.length - 1} salto(s):`);
    nodes.forEach((node) => console.log(location(node)));
    return;
  }
  const result = explainGraphNode(graph, COMMAND_ARGS.join(' '));
  console.log(location(result.node));
  result.connections.slice(0, 40).forEach((connection) => console.log(`- ${connection.direction}: ${connection.relation} [${connection.confidence}] — ${location(connection.node)}`));
  if (result.connections.length > 40) console.log(`${result.connections.length - 40} conexões omitidas; consulte graph.json para a lista completa.`);
}

function tree() {
  const config = readProjectConfig();
  const graphPath = ensureGraphExists(config);
  run(graphifyCommand(), ['tree', '--graph', graphPath, '--output', path.join(graphDirectory(config), 'GRAPH_TREE.html'), '--root', '.', '--label', 'Promo Brindes V1']);
}

function doctor() {
  const root = assertSafeRoot();
  const config = readProjectConfig(root);
  const version = run(graphifyCommand(), ['--version'], { quiet: true }).trim();
  if (version !== `graphify ${config.graphifyVersion}`) throw new Error(`Versão incompatível: esperado graphify ${config.graphifyVersion}, recebido ${version}.`);
  const pythonSidecar = path.join(graphDirectory(config), '.graphify_python');
  const hookStatus = run(graphifyCommand(), ['hook', 'status'], { quiet: true }).trim().replace(/\n/g, '; ');
  console.log(`Graphify: ${version}`);
  console.log(`Raiz validada: ${path.basename(root)}.`);
  console.log(`Automação: ${config.mode}; IA=${config.automation.usesAiProvider}; rede=${config.automation.usesNetwork}; Supabase=${config.automation.connectsToSupabase}.`);
  console.log(fs.existsSync(pythonSidecar) ? 'Interpretador histórico encontrado (não é requisito do wrapper).' : 'Nenhum interpretador histórico encontrado; o CLI atual será usado.');
  console.log(`Hooks nativos: ${hookStatus}.`);
}

function help() {
  console.log('Uso: node scripts/graphify.mjs <doctor|build|update|status|check|query|path|explain|impact|tree|benchmark|compare> [texto]');
  console.log('A automação é code-only, local e não acessa Supabase.');
}

function main() {
  switch (COMMAND) {
    case 'doctor': return doctor();
    case 'build': return build();
    case 'update': return build();
    case 'status': return status();
    case 'check': return status({ strict: true });
    case 'query': return query();
    case 'path': return inspectGraph('path');
    case 'explain': return inspectGraph('explain');
    case 'impact': return impact();
    case 'tree': return tree();
    case 'benchmark': return benchmark();
    case 'compare': return compare();
    case 'help': return help();
    default: throw new Error(`Comando Graphify desconhecido: ${COMMAND}.`);
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`Graphify: FALHOU — ${error.message}`);
    process.exitCode = 1;
  }
}
