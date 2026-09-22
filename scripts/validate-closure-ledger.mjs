import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = path.join(root, 'docs', 'MATRIZ_FECHAMENTO_PLANOS_20260912.csv');
const states = new Set(['I', 'P', 'N', 'E', 'A']);

export function parseCsv(text) {
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
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  if (!headers) throw new Error('Ledger CSV vazio.');
  if (new Set(headers).size !== headers.length) throw new Error('Ledger CSV inválido: cabeçalhos duplicados.');
  return rows.map((values) => {
    if (values.length !== headers.length) throw new Error('Ledger CSV inválido: quantidade de colunas divergente.');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export function validateLedger(rows, rootDirectory = root) {
  if (rows.length !== 230) throw new Error(`Ledger inválido: esperado 230 referências, recebido ${rows.length}.`);
  const expectedIds = new Set(Object.entries({ UX: 100, LK: 50, GR: 50, AC: 30 }).flatMap(([prefix, count]) =>
    Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`)));
  const ids = new Set();
  const canonicalRoot = fs.realpathSync(rootDirectory);
  const verifiedCommitSources = new Set();
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
  for (const source of row.fontes.split(';').map((entry) => entry.trim())) {
    const resolved = path.resolve(canonicalRoot, source);
    if (!source || !resolved.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`Ledger inválido: fonte fora do projeto em ${row.id}.`);
    if (!fs.existsSync(resolved)) throw new Error(`Ledger inválido: fonte ausente ${source} em ${row.id}.`);
    if (!fs.realpathSync(resolved).startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`Ledger inválido: fonte aponta para fora do projeto em ${row.id}.`);
    const commitSource = `${row.commit_auditado}:${source}`;
    if (!verifiedCommitSources.has(commitSource)) {
      try {
        execFileSync('git', ['cat-file', '-e', commitSource], { cwd: canonicalRoot, stdio: 'ignore' });
      } catch {
        throw new Error(`Ledger inválido: fonte ${source} não existe no commit auditado de ${row.id}.`);
      }
      verifiedCommitSources.add(commitSource);
    }
  }
  }
  return { references: rows.length, uniqueIds: ids.size };
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const result = validateLedger(parseCsv(fs.readFileSync(ledgerPath, 'utf8')));
  console.log(`Ledger válido: ${result.references} referências, IDs completos, fontes existentes e commits registrados. Isso não certifica aceite funcional ou operacional.`);
}
