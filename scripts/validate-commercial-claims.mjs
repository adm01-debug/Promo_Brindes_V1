import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// PF-55: o site afirma coisas comerciais ("proposta real", "curadoria humana",
// "voce nao paga nada pelo site", "sem checkout"). Cada afirmacao precisa de dono e
// de uma prova no codigo — senao vira promessa sem lastro. Este guard le o inventario
// e confere que: (1) todos os campos obrigatorios existem, (2) a prova aponta para
// arquivo e linha reais, (3) o trecho citado aparece naquela linha, e (4) o texto
// afirmado aparece no arquivo onde o inventario diz que ele vive.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// CLAIMS_INVENTORY existe para os testes exercitarem o caminho de falha sem alterar o arquivo real.
export const INVENTORY_PATH =
  process.env.CLAIMS_INVENTORY ?? 'docs/inventario-afirmacoes/afirmacoes.json';

const REQUIRED = ['id', 'claim', 'where', 'owner', 'status', 'evidence', 'checkedAt'];
const STATUSES = ['confirmada', 'ajustar-texto', 'bloqueada'];

function readLines(relative) {
  const absolute = path.resolve(ROOT, relative);
  if (!existsSync(absolute)) return null;
  return readFileSync(absolute, 'utf8').split('\n');
}

/** Valida o inventário contra o código. Não toca no filesystem além de leitura. */
export function validateClaims(inventory, readFile = readLines) {
  const errors = [];
  const ids = new Set();
  if (!Array.isArray(inventory?.claims) || inventory.claims.length === 0) {
    return ['inventario sem afirmacoes'];
  }
  for (const claim of inventory.claims) {
    const label = claim?.id ?? '(sem id)';
    for (const field of REQUIRED) {
      // `where: []` e truthy: sem esta checagem uma afirmacao sem localizacao
      // passava como campo preenchido e nada era conferido contra o site.
      if (field === 'where') {
        if (!Array.isArray(claim?.where) || claim.where.length === 0) {
          errors.push(`${label} sem "${field}" (precisa de ao menos um arquivo:linha)`);
        }
        continue;
      }
      if (!claim?.[field]) errors.push(`${label} sem "${field}"`);
    }
    if (claim?.id) {
      if (ids.has(claim.id)) errors.push(`id duplicado: ${claim.id}`);
      ids.add(claim.id);
    }
    if (claim?.status && !STATUSES.includes(claim.status)) {
      errors.push(`${label} tem status invalido: ${claim.status}`);
    }
    if (claim?.checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(claim.checkedAt)) {
      errors.push(`${label} tem checkedAt fora de AAAA-MM-DD`);
    }
    for (const place of Array.isArray(claim?.where) ? claim.where : []) {
      const lines = readFile(place.file);
      if (!lines) {
        errors.push(`${label} aponta arquivo inexistente: ${place.file}`);
        continue;
      }
      if (!Number.isInteger(place.line) || place.line < 1 || place.line > lines.length) {
        errors.push(`${label} aponta linha fora do arquivo ${place.file}: ${place.line}`);
        continue;
      }
      if (!place.snippet) {
        errors.push(`${label} sem snippet para ${place.file}:${place.line}`);
        continue;
      }
      if (!lines[place.line - 1].includes(place.snippet)) {
        errors.push(`${label}: trecho nao encontrado em ${place.file}:${place.line} ("${place.snippet}")`);
      }
    }
    if (!claim?.evidence?.file) {
      errors.push(`${label} sem arquivo de prova`);
    } else {
      const lines = readFile(claim.evidence.file);
      if (!lines) errors.push(`${label} prova aponta arquivo inexistente: ${claim.evidence.file}`);
      else if (claim.evidence.pattern && !lines.some((line) => line.includes(claim.evidence.pattern))) {
        errors.push(`${label}: prova nao encontrada (${claim.evidence.pattern}) em ${claim.evidence.file}`);
      }
    }
  }
  return errors;
}

export function readInventoryFromDisk() {
  const absolute = path.resolve(ROOT, INVENTORY_PATH);
  if (!existsSync(absolute)) {
    throw new Error(`inventario de afirmacoes nao encontrado: ${INVENTORY_PATH}`);
  }
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function main() {
  const inventory = readInventoryFromDisk();
  const errors = validateClaims(inventory);
  if (errors.length > 0) {
    console.error('Inventario de afirmacoes comerciais reprovado:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const confirmadas = inventory.claims.filter((claim) => claim.status === 'confirmada').length;
  console.log(
    `Inventario de afirmacoes comerciais aprovado: ${inventory.claims.length} afirmacoes, ${confirmadas} confirmadas contra o codigo.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
