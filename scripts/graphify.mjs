#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  enrichTypeScriptReferences,
  normalizeGraphReport,
  splitGraphSourceFiles,
  stageCorpusFiles,
  validateSeparatedCorpora,
} from './graphify-quality.mjs';

export {
  enrichTypeScriptReferences,
  normalizeGraphReport,
  projectGapMetrics,
  splitGraphSourceFiles,
  stageCorpusFiles,
  validateSeparatedCorpora,
} from './graphify-quality.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = fs.realpathSync(path.resolve(SCRIPT_DIR, '..'));
const LOCK_PATH = path.join(PROJECT_ROOT, '.graphify-work', 'build.lock');
const COMMAND = process.argv[2] ?? 'help';
const COMMAND_ARGS = process.argv.slice(3);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql']);
export const GRAPH_FINGERPRINT_CONFIG_FILES = Object.freeze([
  '.graphify.project.json',
  '.graphifyignore',
  '.graphifyrc',
  'package.json',
  'package-lock.json',
]);
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
const SAFE_GRAPH_DIRECTORIES = new Set(['database']);
// Arquivos que .claude/hooks/session-start.sh mantém abertos dentro do diretório de saída
// enquanto o build roda. A promoção troca o diretório inteiro; sem carregá-los (mesmo inode)
// o log da sessão some e o flock do hook deixa de valer no meio do build.
const SESSION_SIDECAR_FILES = Object.freeze(['.session-start.log', '.session-start.lock']);
const DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const COMMAND_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
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

function compareText(left, right) {
  return left.localeCompare(right, 'en-US');
}

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
  for (const field of ['outputDirectory', 'workspaceDirectory']) {
    const segments = config[field].split(/[\\/]/).filter((segment) => segment && segment !== '.');
    if (path.isAbsolute(config[field]) || /^[A-Za-z]:/.test(config[field]) || segments.length === 0 || segments.includes('..')) {
      throw new Error(`Configuração Graphify inválida: ${field} deve ser um subdiretório relativo dentro da raiz do projeto.`);
    }
  }
  if (!Array.isArray(config.sourceRoots) || config.sourceRoots.length === 0) throw new Error('Configuração Graphify inválida: sourceRoots.');
  if (!Array.isArray(config.databaseSourceRoots) || config.databaseSourceRoots.length === 0) throw new Error('Configuração Graphify inválida: databaseSourceRoots.');
  if (!Number.isInteger(config.maxWorkers) || config.maxWorkers < 1 || config.maxWorkers > 8) throw new Error('Configuração Graphify inválida: maxWorkers deve estar entre 1 e 8.');
  return config;
}

function commandTimeoutMs() {
  const configured = Number(process.env.GRAPHIFY_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_COMMAND_TIMEOUT_MS;
}

function run(command, args, { cwd = PROJECT_ROOT, quiet = false } = {}) {
  const timeout = commandTimeoutMs();
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: COMMAND_MAX_BUFFER_BYTES,
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
  if (result.error?.code === 'ENOENT') {
    throw new Error(`CLI \`${command}\` não encontrado. Instale a versão fixada com \`python -m pip install -r requirements-graphify.txt\` ou aponte GRAPHIFY_BIN para o executável.`, { cause: result.error });
  }
  if (result.error?.code === 'ETIMEDOUT') {
    throw new Error(`${command} ${args[0] ?? ''} excedeu ${Math.round(timeout / 1000)}s e foi interrompido (ajuste com GRAPHIFY_TIMEOUT_MS).`, { cause: result.error });
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} falhou com ${result.signal ? `sinal ${result.signal}` : `código ${result.status ?? 'desconhecido'}`}.`);
  return result.stdout ?? '';
}

function graphifyCommand() {
  return (process.env.GRAPHIFY_BIN ?? '').trim() || 'graphify';
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

function ensureDatabaseGraphExists(config) {
  const graphPath = path.join(graphDirectory(config), 'database', 'graph.json');
  if (!fs.existsSync(graphPath)) throw new Error('Mapa de banco ausente. Execute `npm run graph:build` primeiro.');
  return graphPath;
}

function ensureWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) return;
  throw new Error(`Caminho fora da raiz recusado: ${candidate}`);
}

function listSourceFiles(root, roots) {
  const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'buffer' })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort(compareText);
  const allowedRoots = roots.map((entry) => entry.replace(/\\/g, '/').replace(/\/$/, ''));
  return tracked.filter((relative) => {
    const normalized = relative.replace(/\\/g, '/');
    const isAllowed = allowedRoots.some((allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`));
    if (!isAllowed || normalized.includes('/..') || normalized.startsWith('../')) return false;
    const absolute = path.resolve(root, normalized);
    ensureWithinRoot(root, absolute);
    // `git ls-files -c` ainda lista o arquivo rastreado que foi apagado do disco sem `git rm`.
    const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
    return Boolean(stat) && stat.isFile() && !stat.isSymbolicLink() && CODE_EXTENSIONS.has(path.extname(normalized).toLowerCase());
  });
}

export function fingerprintEntries(entries, readFile) {
  const hash = crypto.createHash('sha256');
  for (const entry of [...entries].sort(compareText)) {
    hash.update(entry);
    hash.update('\0');
    hash.update(readFile(entry));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function sourceFingerprint(root, config) {
  const configuredFiles = [...new Set([
    ...listSourceFiles(root, config.sourceRoots),
    ...listSourceFiles(root, config.databaseSourceRoots),
  ])].sort(compareText);
  const { main: mainFiles, database: databaseFiles } = splitGraphSourceFiles(configuredFiles);
  const entries = [...mainFiles, ...databaseFiles].sort(compareText);
  return {
    files: entries,
    mainFiles,
    databaseFiles,
    // The TypeScript compiler is part of the graph extractor. Hashing both
    // dependency manifests invalidates an artifact when its parser version or
    // resolved dependency tree changes even if application sources do not.
    hash: fingerprintEntries([...entries, ...GRAPH_FINGERPRINT_CONFIG_FILES], (relative) => {
      try {
        return fs.readFileSync(path.join(root, relative));
      } catch (error) {
        // Remover um arquivo de configuração opcional (.graphifyrc, .graphifyignore) muda a
        // impressão digital; não pode impedir o status nem a reconstrução.
        if (error?.code === 'ENOENT' && GRAPH_FINGERPRINT_CONFIG_FILES.includes(relative)) return '\u0000ausente';
        throw error;
      }
    }),
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
    const endpoints = graph.directed ? [link.source, link.target] : [link.source, link.target].sort(compareText);
    return endpoints.join('\u0000');
  }));
}

function graphSourceFiles(graph) {
  return new Set(graph.nodes.map((node) => node.source_file).filter((value) => typeof value === 'string' && value));
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort(compareText);
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
  // As chaves de relação usam NUL como separador interno; no Markdown ele vira um byte binário.
  const edgeLabel = (value) => value.split('\u0000').join(comparison.head.directed ? ' → ' : ' — ');
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
    section(`Relações adicionadas (${comparison.addedEdges.length})`, comparison.addedEdges.slice(0, 100).map(edgeLabel)),
    section(`Relações removidas (${comparison.removedEdges.length})`, comparison.removedEdges.slice(0, 100).map(edgeLabel)),
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
    const target = path.join(candidateDirectory, entry);
    if (SAFE_GRAPH_DIRECTORIES.has(entry) && fs.statSync(target).isDirectory()) {
      removeUnsafeCandidateArtifacts(target);
      continue;
    }
    if (!SAFE_GRAPH_FILES.has(entry)) fs.rmSync(target, { recursive: true, force: true });
  }
}

/**
 * Um build morto por sinal (timeout do hook de sessão, cancelamento do CI, Ctrl+C) não passa
 * pelo `finally` e deixa a trava para trás. Só é dado como morto o dono registrado neste mesmo
 * host cujo PID não existe mais; qualquer dúvida mantém a trava até o limite de idade.
 */
function lockOwnerIsGone() {
  try {
    const owner = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    if (owner?.host !== os.hostname() || !Number.isInteger(owner.pid) || owner.pid <= 0) return false;
    if (owner.pid === process.pid) return true;
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    return error?.code === 'ESRCH';
  }
}

function acquireLock(config) {
  const workDirectory = path.join(PROJECT_ROOT, config.workspaceDirectory);
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.mkdirSync(workDirectory, { recursive: true });
  try {
    const fd = fs.openSync(LOCK_PATH, 'wx');
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, host: os.hostname(), createdAt: new Date().toISOString() }));
    fs.closeSync(fd);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const lockStat = fs.statSync(LOCK_PATH, { throwIfNoEntry: false });
    if (!lockStat || Date.now() - lockStat.mtimeMs > 30 * 60 * 1000 || lockOwnerIsGone()) {
      fs.rmSync(LOCK_PATH, { force: true });
      return acquireLock(config);
    }
    throw new Error(`Outra geração Graphify está em andamento. Aguarde-a terminar; nenhum artefato foi alterado. Se nenhum processo estiver gerando, remova ${path.relative(PROJECT_ROOT, LOCK_PATH)}.`, { cause: error });
  }
  return workDirectory;
}

function releaseLock() {
  fs.rmSync(LOCK_PATH, { force: true });
}

function writeProjectMeta(candidateDirectory, config, health, fingerprint, { databaseHealth, typeReferences, reportMetrics }) {
  const metadata = {
    schemaVersion: 1,
    project: config.project,
    generatedAt: new Date().toISOString(),
    commit: git(['rev-parse', 'HEAD']),
    graphifyVersion: run(graphifyCommand(), ['--version'], { quiet: true }).trim(),
    mode: config.mode,
    sourceFingerprint: fingerprint.hash,
    sourceFileCount: fingerprint.files.length,
    mainSourceFileCount: fingerprint.mainFiles.length,
    databaseSourceFileCount: fingerprint.databaseFiles.length,
    graph: health,
    databaseGraph: databaseHealth,
    enrichment: {
      typeReferences,
    },
    reportMetrics,
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

export function promoteCandidate(candidateDirectory, outputDirectory) {
  const outputParent = path.dirname(outputDirectory);
  const backupDirectory = `${outputDirectory}.previous`;
  // The extracted corpus deliberately lives under the operating-system temp
  // directory so repository ignore rules cannot prune it. Copy the validated
  // result back beside the final destination before the atomic rename; a
  // direct rename from TMPDIR can fail with EXDEV on bind mounts/CI runners.
  const stagingRoot = fs.mkdtempSync(path.join(outputParent, '.graphify-promote-'));
  const stagedDirectory = path.join(stagingRoot, path.basename(outputDirectory));
  fs.rmSync(backupDirectory, { recursive: true, force: true });
  const hadPrevious = fs.existsSync(outputDirectory);
  try {
    fs.cpSync(candidateDirectory, stagedDirectory, { recursive: true, errorOnExist: true, force: false });
    if (hadPrevious) fs.renameSync(outputDirectory, backupDirectory);
    fs.renameSync(stagedDirectory, outputDirectory);
    if (hadPrevious) {
      for (const name of SESSION_SIDECAR_FILES) {
        try {
          if (!fs.existsSync(path.join(outputDirectory, name))) fs.renameSync(path.join(backupDirectory, name), path.join(outputDirectory, name));
        } catch {
          // Sidecar ausente ou ilegível nunca invalida um grafo já promovido.
        }
      }
      fs.rmSync(backupDirectory, { recursive: true, force: true });
    }
  } catch (error) {
    if (!fs.existsSync(outputDirectory) && fs.existsSync(backupDirectory)) fs.renameSync(backupDirectory, outputDirectory);
    throw error;
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function build() {
  const root = assertSafeRoot();
  const config = readProjectConfig(root);
  acquireLock(config);
  let candidateRoot = '';
  try {
    // O corpus temporário fica fora da árvore do repositório para que regras de
    // ignore do próprio projeto não possam ocultar os arquivos explicitamente
    // selecionados pelo wrapper.
    candidateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-brindes-graphify-'));
    console.log('Graphify: extração estrutural local (sem IA, rede ou Supabase).');
    const fingerprint = sourceFingerprint(root, config);
    const separated = splitGraphSourceFiles([...fingerprint.mainFiles, ...fingerprint.databaseFiles]);
    if (!separated.main.length || !separated.database.length) throw new Error('Corpus Graphify inválido: mapas principal e de banco exigem arquivos.');

    const mainCorpus = path.join(candidateRoot, 'corpus-main');
    const databaseCorpus = path.join(candidateRoot, 'corpus-database');
    stageCorpusFiles(root, mainCorpus, separated.main);
    stageCorpusFiles(root, databaseCorpus, separated.database);

    const mainOutput = path.join(candidateRoot, 'main-output');
    const databaseOutput = path.join(candidateRoot, 'database-output');
    run(graphifyCommand(), ['extract', mainCorpus, '--code-only', '--out', mainOutput, '--max-workers', String(config.maxWorkers)]);
    const candidateDirectory = path.join(mainOutput, config.outputDirectory);
    const typeReferences = enrichTypeScriptReferences(
      path.join(candidateDirectory, 'graph.json'),
      mainCorpus,
      separated.main,
    );
    run(graphifyCommand(), ['cluster-only', mainOutput, '--no-label']);
    const reportMetrics = normalizeGraphReport(
      path.join(candidateDirectory, 'GRAPH_REPORT.md'),
      path.join(candidateDirectory, 'graph.json'),
      { title: 'Promo Brindes V1 — aplicação', updateCommand: 'npm run graph:update' },
    );
    run(graphifyCommand(), ['tree', '--graph', path.join(candidateDirectory, 'graph.json'), '--output', path.join(candidateDirectory, 'GRAPH_TREE.html'), '--root', '.', '--label', 'Promo Brindes V1']);

    run(graphifyCommand(), ['extract', databaseCorpus, '--code-only', '--out', databaseOutput, '--max-workers', String(config.maxWorkers)]);
    const generatedDatabaseDirectory = path.join(databaseOutput, config.outputDirectory);
    run(graphifyCommand(), ['cluster-only', databaseOutput, '--no-label']);
    normalizeGraphReport(
      path.join(generatedDatabaseDirectory, 'GRAPH_REPORT.md'),
      path.join(generatedDatabaseDirectory, 'graph.json'),
      { title: 'Promo Brindes V1 — migrations e pgTAP', updateCommand: 'npm run graph:update' },
    );
    run(graphifyCommand(), ['tree', '--graph', path.join(generatedDatabaseDirectory, 'graph.json'), '--output', path.join(generatedDatabaseDirectory, 'GRAPH_TREE.html'), '--root', '.', '--label', 'Promo Brindes V1 — banco']);

    removeUnsafeCandidateArtifacts(generatedDatabaseDirectory);
    const databaseDirectory = path.join(candidateDirectory, 'database');
    fs.renameSync(generatedDatabaseDirectory, databaseDirectory);
    removeUnsafeCandidateArtifacts(candidateDirectory);
    const graph = JSON.parse(fs.readFileSync(path.join(candidateDirectory, 'graph.json'), 'utf8'));
    const databaseGraph = JSON.parse(fs.readFileSync(path.join(databaseDirectory, 'graph.json'), 'utf8'));
    const health = validateGraph(graph, root);
    const databaseHealth = validateGraph(databaseGraph, root);
    validateSeparatedCorpora(graph, databaseGraph);
    writeProjectMeta(candidateDirectory, config, health, fingerprint, {
      databaseHealth,
      typeReferences,
      reportMetrics,
    });
    const sensitive = findSensitiveArtifacts(candidateDirectory);
    if (sensitive.length > 0) throw new Error(`Promoção bloqueada: conteúdo sensível ou caminho pessoal detectado em ${sensitive.map((item) => `${item.file} (${item.kind})`).join(', ')}.`);
    promoteCandidate(candidateDirectory, graphDirectory(config));
    console.log(`Grafo principal promovido: ${health.nodes} nós, ${health.links} relações; ${typeReferences.typeReferenceEdgesAdded} referências TypeScript.`);
    console.log(`Grafo de banco promovido: ${databaseHealth.nodes} nós, ${databaseHealth.links} relações.`);
    console.log(`Abra ${path.join(config.outputDirectory, 'graph.html')} ou ${path.join(config.outputDirectory, 'GRAPH_TREE.html')} localmente.`);
  } finally {
    if (candidateRoot) fs.rmSync(candidateRoot, { recursive: true, force: true });
    releaseLock();
  }
}

function status({ strict = false } = {}) {
  const root = assertSafeRoot();
  const config = readProjectConfig(root);
  const outputDirectory = graphDirectory(config);
  const metaPath = path.join(outputDirectory, 'project-meta.json');
  if (!fs.existsSync(metaPath) || !fs.existsSync(path.join(outputDirectory, 'graph.json')) || !fs.existsSync(path.join(outputDirectory, 'database', 'graph.json'))) {
    console.log('Graphify: AUSENTE — execute `npm run graph:build`.');
    if (strict) process.exitCode = 1;
    return;
  }
  let metadata;
  let health;
  try {
    metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    health = validateGraph(JSON.parse(fs.readFileSync(path.join(outputDirectory, 'graph.json'), 'utf8')), root);
    const databaseHealth = validateGraph(JSON.parse(fs.readFileSync(path.join(outputDirectory, 'database', 'graph.json'), 'utf8')), root);
    if (metadata.databaseGraph?.nodes !== databaseHealth.nodes || metadata.databaseGraph?.links !== databaseHealth.links) {
      throw new Error('metadados do mapa de banco não conferem');
    }
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
  console.log(`Banco separado: ${metadata.databaseGraph.nodes} nós, ${metadata.databaseGraph.links} relações; TypeScript: ${metadata.enrichment?.typeReferences?.typeReferenceEdgesAdded ?? 0} referências.`);
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
    'sessão': 'auth signOut CustomerAuthContext',
    sessao: 'auth signOut CustomerAuthContext',
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
    // GR40-10 (benchmark) pergunta sobre o próprio Graphify: "mapa técnico" é termo genérico
    // demais e, com mais arquivos em scripts/ (contexto para agentes, 2026-11), perde a
    // scripts/graphify.mjs na truncagem do orçamento padrão de consulta. Mesmo padrão de
    // desambiguação das demais entradas — não é bump no orçamento global.
    'mapa técnico': 'graphify.mjs build benchmark',
    'mapa tecnico': 'graphify.mjs build benchmark',
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

function query({ database = false } = {}) {
  const config = readProjectConfig();
  const graphPath = database ? ensureDatabaseGraphExists(config) : ensureGraphExists(config);
  const question = normalizeQuery(COMMAND_ARGS.join(' '));
  console.log(`${database ? 'Consulta de banco' : 'Consulta'} expandida: ${question}`);
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

function inspectGraph(mode, { database = false } = {}) {
  const config = readProjectConfig();
  const graph = JSON.parse(fs.readFileSync(database ? ensureDatabaseGraphExists(config) : ensureGraphExists(config), 'utf8'));
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

function tree({ database = false } = {}) {
  const config = readProjectConfig();
  const graphPath = database ? ensureDatabaseGraphExists(config) : ensureGraphExists(config);
  const output = database ? path.join(graphDirectory(config), 'database', 'GRAPH_TREE.html') : path.join(graphDirectory(config), 'GRAPH_TREE.html');
  run(graphifyCommand(), ['tree', '--graph', graphPath, '--output', output, '--root', '.', '--label', database ? 'Promo Brindes V1 — banco' : 'Promo Brindes V1']);
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
  console.log('Uso: node scripts/graphify.mjs <doctor|build|update|status|check|query|path|explain|impact|tree|db-query|db-path|db-explain|db-tree|benchmark|compare> [texto]');
  console.log('  path|db-path "<origem>" "<destino>" · explain|db-explain|impact "<nó>" · query|db-query "<pergunta>"');
  console.log('  compare --base <base.json> --head <head.json> [--output graphify-out/<relatório>.md]');
  console.log('Pelo npm: npm run graph:<comando> -- <argumentos> (db-query vira graph:db:query).');
  console.log('check sai com código 1 quando o grafo está ausente, inválido ou defasado; qualquer falha sai com 1.');
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
    case 'db-query': return query({ database: true });
    case 'db-path': return inspectGraph('path', { database: true });
    case 'db-explain': return inspectGraph('explain', { database: true });
    case 'db-tree': return tree({ database: true });
    case 'benchmark': return benchmark();
    case 'compare': return compare();
    case 'help':
    case '--help':
    case '-h': return help();
    default: throw new Error(`Comando Graphify desconhecido: ${COMMAND}.`);
  }
}

function isMainModule() {
  // Comparar caminhos reais: chamado por um caminho com symlink, o texto de argv[1] difere do
  // módulo carregado e o wrapper sairia com código 0 sem executar nada.
  try {
    return fs.realpathSync(process.argv[1] ?? '') === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  // `npm run graph:query -- "..." | head` fecha o pipe antes do fim da saída.
  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', (error) => {
      if (error?.code !== 'EPIPE') throw error;
    });
  }
  try {
    main();
  } catch (error) {
    console.error(`Graphify: FALHOU — ${error.message}`);
    process.exitCode = 1;
  }
}
