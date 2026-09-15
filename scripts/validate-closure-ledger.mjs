import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = path.join(root, 'docs', 'MATRIZ_FECHAMENTO_PLANOS_20260912.csv');
const states = new Set(['I', 'P', 'N', 'E', 'A']);

function parseCsv(text) {
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
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

const rows = parseCsv(fs.readFileSync(ledgerPath, 'utf8'));
if (rows.length !== 230) throw new Error(`Ledger inválido: esperado 230 referências, recebido ${rows.length}.`);
const ids = new Set();
for (const row of rows) {
  if (!/^(UX|LK|GR|AC)\d+$/.test(row.id || '')) throw new Error(`Ledger inválido: id ${row.id || '(vazio)'}.`);
  if (ids.has(row.id)) throw new Error(`Ledger inválido: id duplicado ${row.id}.`);
  ids.add(row.id);
  if (!states.has(row.estado_revisado)) throw new Error(`Ledger inválido: estado ${row.estado_revisado || '(vazio)'} em ${row.id}.`);
  if (!row.fontes?.trim() || !row.conclusao_e_aceite_restante?.trim() || !row.metodo?.trim()) {
    throw new Error(`Ledger inválido: evidência incompleta em ${row.id}.`);
  }
}
console.log(`Ledger de fechamento válido: ${rows.length} referências, ${ids.size} IDs únicos.`);
