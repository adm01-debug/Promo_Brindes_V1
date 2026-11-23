import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// PF-55: o site afirma coisas comerciais ("proposta real", "curadoria humana",
// "voce nao paga nada pelo site", "sem checkout"). Cada afirmacao precisa de dono e
// de uma prova no codigo — senao vira promessa sem lastro. Este guard le o inventario
// e confere que: (1) todos os campos obrigatorios existem, (2) a prova aponta para
// arquivo e linha reais, (3) o trecho citado aparece naquela linha, (4) o texto
// afirmado aparece no arquivo onde o inventario diz que ele vive e (5) afirmacao de
// ausencia ("nao ha pagamento") e provada varrendo o codigo, nao citando um slogan.
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

const ABSENCE_SKIP = /(node_modules|dist|build|coverage|\.git)[\\/]/;
const ABSENCE_FILE = /\.(tsx?|jsx?|mjs|cjs)$/;

/** Arquivos de codigo sob as raizes informadas, em caminho relativo a raiz do repo. */
export function listCodeFiles(roots, root = ROOT) {
  const found = [];
  for (const relative of roots) {
    const absolute = path.resolve(root, relative);
    if (!existsSync(absolute)) continue;
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (ABSENCE_SKIP.test(child)) continue;
        if (entry.isDirectory()) walk(child);
        else if (ABSENCE_FILE.test(entry.name)) found.push(path.relative(root, child).split(path.sep).join('/'));
      }
    };
    walk(absolute);
  }
  return found.sort();
}

/** Valida o inventário contra o código. Não toca no filesystem além de leitura. */
export function validateClaims(inventory, readFile = readLines, listFiles = listCodeFiles) {
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
    const evidence = claim?.evidence;
    if (evidence?.absenceOf) {
      // Afirmacao de ausencia: cita-la de novo nao prova nada. O que prova e nao existir
      // provedor de pagamento no codigo. Se alguem adicionar Stripe, o guard reprova.
      const roots = evidence.absenceOf.roots;
      const pattern = evidence.absenceOf.pattern;
      if (!Array.isArray(roots) || roots.length === 0) {
        errors.push(`${label}: absenceOf sem roots`);
      } else if (typeof pattern !== 'string' || pattern.length === 0) {
        errors.push(`${label}: absenceOf sem pattern`);
      } else {
        let regex;
        try {
          regex = new RegExp(pattern, 'i');
        } catch {
          errors.push(`${label}: absenceOf com pattern invalido (${pattern})`);
        }
        if (regex) {
          const hits = [];
          for (const file of listFiles(roots)) {
            const lines = readFile(file) ?? [];
            lines.forEach((line, index) => {
              if (regex.test(line)) hits.push(`${file}:${index + 1}`);
            });
          }
          if (hits.length > 0) {
            errors.push(
              `${label}: prova de ausencia quebrada — ${pattern} apareceu em ${hits.slice(0, 3).join(', ')}`,
            );
          }
        }
      }
    } else if (!evidence?.file) {
      errors.push(`${label} sem arquivo de prova`);
    } else {
      const lines = readFile(evidence.file);
      if (!lines) errors.push(`${label} prova aponta arquivo inexistente: ${evidence.file}`);
      else if (evidence.pattern && !lines.some((line) => line.includes(evidence.pattern))) {
        errors.push(`${label}: prova nao encontrada (${evidence.pattern}) em ${evidence.file}`);
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
  const porAusencia = inventory.claims.filter((claim) => claim.evidence?.absenceOf).length;
  console.log(
    `Inventario de afirmacoes comerciais aprovado: ${inventory.claims.length} afirmacoes, ${confirmadas} confirmadas contra o codigo (${porAusencia} provadas por ausencia de código).`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
