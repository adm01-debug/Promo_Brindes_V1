import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Etapa 29 do plano de correções: toda comparação de segredo em api/ usa
// crypto.timingSafeEqual (direto ou via um dos quatro helpers já estabelecidos:
// matchesSecret, matchesCronSecret, timingSafeStringEqual, safeCompare — confirmado por
// auditoria de código em 16/09/2026, nenhuma comparação de segredo usava === antes
// deste teste existir). Este teste é o guard contra regressão: uma rota nova que
// comparar um segredo com === em vez de usar um desses helpers falha aqui, não em
// produção sob um timing attack.

const API_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'api');
const KNOWN_SAFE_HELPERS = ['matchesSecret', 'matchesCronSecret', 'timingSafeStringEqual', 'safeCompare'];
// Padrão de nomes de variável que indicam "isto é um segredo" — não é uma lista de env
// vars (evita depender de manter as duas listas sincronizadas).
const SECRET_NAME_PATTERN = /\b(secret|token|apikey|api_key)\b/i;

function listApiFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listApiFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function findUnsafeComparisons(source) {
  const violations = [];
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    // Ignora linhas que já usam um dos helpers seguros, ou que são a própria definição
    // deles (contêm "timingSafeEqual" diretamente).
    if (KNOWN_SAFE_HELPERS.some((helper) => line.includes(helper))) return;
    if (line.includes('timingSafeEqual')) return;
    // Procura === ou !== entre algo que pareça um segredo e outra coisa.
    const comparisonMatch = /(===|!==)/.exec(line);
    if (!comparisonMatch) return;
    if (!SECRET_NAME_PATTERN.test(line)) return;
    // Falsos positivos conhecidos e aceitos: comparações de FORMATO/PRESENÇA, não de
    // valor secreto contra valor recebido (ex.: checar se um campo se chama "token").
    if (/typeof|\.length|=== 'string'|=== 'object'|=== undefined|=== null/.test(line)) return;
    violations.push(`${index + 1}: ${line.trim()}`);
  });
  return violations;
}

test('nenhuma comparação de segredo em api/ usa === fora dos helpers timing-safe estabelecidos', () => {
  const files = listApiFiles(API_DIR);
  assert.ok(files.length > 10, 'sanity check: encontrou os arquivos de api/');

  const allViolations = files.flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return findUnsafeComparisons(source).map((violation) => `${path.relative(API_DIR, file)}:${violation}`);
  });

  assert.deepEqual(allViolations, [], `Comparação de segredo potencialmente insegura (usar timingSafeEqual):\n${allViolations.join('\n')}`);
});

test('a heurística do teste acima realmente detecta uma comparação insegura (não é sempre-verde)', () => {
  const violations = findUnsafeComparisons("if (token === expectedSecret) { return true; }\n");
  assert.equal(violations.length, 1);
});
