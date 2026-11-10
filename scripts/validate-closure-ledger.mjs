import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = path.join(root, 'docs', 'MATRIZ_FECHAMENTO_PLANOS_20260912.csv');
const states = new Set(['I', 'P', 'N', 'E', 'A']);

export function parseCsv(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (char === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('Ledger CSV inválido: aspas não fechadas.');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift();
  if (!headers) throw new Error('Ledger CSV vazio.');
  if (new Set(headers).size !== headers.length) throw new Error('Ledger CSV inválido: cabeçalhos duplicados.');
  return rows.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`Ledger CSV inválido: quantidade de colunas divergente no registro ${index + 2} (esperado ${headers.length}, recebido ${values.length}).`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function runGit(rootDirectory, args) {
  // GIT_DIR/GIT_WORK_TREE herdados (hook, `git rebase --exec`) desviariam a consulta do
  // repositório em rootDirectory.
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  try {
    return execFileSync('git', args, { cwd: rootDirectory, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Ledger não verificável: git não encontrado no PATH; o validador confere cada fonte no commit auditado.', { cause: error });
    }
    return null;
  }
}

function describeUnavailableCommit(rootDirectory, commit, id, unavailableCommits) {
  const type = runGit(rootDirectory, ['cat-file', '-t', commit]);
  if (type !== null) return `Ledger inválido: commit auditado ${commit} de ${id} é um objeto ${type}, não um commit.`;
  const shallow = runGit(rootDirectory, ['rev-parse', '--is-shallow-repository']);
  if (shallow === null) {
    return `Ledger não verificável: ${rootDirectory} não é um repositório git; o validador confere cada fonte no commit auditado.`;
  }
  if (shallow === 'true') {
    return `Ledger não verificável: a estrutura das referências está válida, mas ${unavailableCommits} commit(s) auditado(s) não estão neste clone raso (primeiro: ${commit}, de ${id}). O problema é do checkout, não do ledger: rode \`git fetch --unshallow origin\` (no CI, actions/checkout com fetch-depth: 0) e repita.`;
  }
  return `Ledger inválido: commit auditado ${commit} de ${id} não existe neste repositório (use um SHA alcançável a partir da main).`;
}

export function validateLedger(rows, rootDirectory = root) {
  if (rows.length !== 230) throw new Error(`Ledger inválido: esperado 230 referências, recebido ${rows.length}.`);
  const expectedIds = new Set(Object.entries({ UX: 100, LK: 50, GR: 50, AC: 30 }).flatMap(([prefix, count]) =>
    Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`)));
  const ids = new Set();
  const canonicalRoot = fs.realpathSync(rootDirectory);
  const commitSources = new Map();
  const firstIdByCommit = new Map();
  for (const row of rows) {
  if (!/^(UX|LK|GR|AC)\d+$/.test(row.id || '')) throw new Error(`Ledger inválido: id ${row.id || '(vazio)'}.`);
  if (ids.has(row.id)) throw new Error(`Ledger inválido: id duplicado ${row.id}.`);
  if (!expectedIds.has(row.id)) throw new Error(`Ledger inválido: id fora dos planos ${row.id}.`);
  ids.add(row.id);
  if (!states.has(row.estado_revisado)) throw new Error(`Ledger inválido: estado ${row.estado_revisado || '(vazio)'} em ${row.id}.`);
  if (!row.fontes?.trim() || !row.conclusao_e_aceite_restante?.trim() || !row.metodo?.trim()) {
    throw new Error(`Ledger inválido: evidência incompleta em ${row.id}.`);
  }
  if (!/^[0-9a-f]{40}$/.test(row.commit_auditado || '')) throw new Error(`Ledger inválido: commit auditado ausente ou inválido em ${row.id}.`);
  if (!firstIdByCommit.has(row.commit_auditado)) firstIdByCommit.set(row.commit_auditado, row.id);
  for (const source of row.fontes.split(';').map((entry) => entry.trim())) {
    const resolved = path.resolve(canonicalRoot, source);
    if (!source || !resolved.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`Ledger inválido: fonte fora do projeto em ${row.id}.`);
    if (!fs.existsSync(resolved)) throw new Error(`Ledger inválido: fonte ausente ${source} em ${row.id}.`);
    if (!fs.realpathSync(resolved).startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`Ledger inválido: fonte aponta para fora do projeto em ${row.id}.`);
    const commitSource = `${row.commit_auditado}:${source}`;
    if (!commitSources.has(commitSource)) commitSources.set(commitSource, { source, id: row.id });
  }
  }
  // A conferência histórica vem depois da estrutural: num clone raso os erros reais do
  // ledger aparecem primeiro, e a ausência do commit no checkout não é atribuída ao ledger.
  const unavailable = [...firstIdByCommit].filter(([commit]) => runGit(canonicalRoot, ['cat-file', '-e', `${commit}^{commit}`]) === null);
  if (unavailable.length > 0) {
    const [commit, id] = unavailable[0];
    throw new Error(describeUnavailableCommit(canonicalRoot, commit, id, unavailable.length));
  }
  for (const [commitSource, { source, id }] of commitSources) {
    if (runGit(canonicalRoot, ['cat-file', '-e', commitSource]) === null) {
      throw new Error(`Ledger inválido: fonte ${source} não existe no commit auditado de ${id}.`);
    }
  }
  return { references: rows.length, uniqueIds: ids.size };
}

function isMainModule() {
  // realpath: por um caminho com symlink, argv[1] difere de import.meta.url e o
  // validador sairia com código 0 sem validar nada.
  try {
    return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    const result = validateLedger(parseCsv(fs.readFileSync(ledgerPath, 'utf8')));
    console.log(`Ledger válido: ${result.references} referências, IDs completos, fontes existentes e commits registrados. Isso não certifica aceite funcional ou operacional.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
