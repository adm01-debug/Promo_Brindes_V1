#!/usr/bin/env node
// Trabalho de agente estacionado fora de `refs/heads` e `refs/pull` não aparece
// em nenhuma PR e não é revisado por ninguém. Foi assim que a correção de
// repetição de 401 na sonda do contrato ficou quatro dias só em
// `refs/autosave/claude/fix-contract-401-retry-261114-1605` — ver
// docs/AUDITORIA_REFS_AUTOSAVE_20261118.md.
//
// Esta guarda compara cada ref desses namespaces com a `main` e aponta todo
// blob cujo conteúdo não existe em nenhum ponto do histórico dela. Blobs já
// triados ficam na linha de base; só o que aparece depois reprova, para que a
// guarda sinalize trabalho novo em vez de repetir um veredito antigo.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_PATH = path.join(ROOT, 'scripts', 'orphan-refs-baseline.json');
export const WATCHED_NAMESPACES = Object.freeze(['refs/autosave']);

function git(args, { cwd = ROOT } = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function readBaseline(file = BASELINE_PATH) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || !Array.isArray(parsed.triaged)) throw new Error('linha de base sem a lista `triaged`');
    return new Set(parsed.triaged.map((entry) => entry.blob));
  } catch (error) {
    if (error?.code === 'ENOENT') return new Set();
    throw new Error(`Linha de base inválida em ${file}.`, { cause: error });
  }
}

// `git rev-list --objects` imprime "<sha> [caminho]": sem caminho é commit, com
// caminho é árvore ou blob. Comparar pelo sha basta — um blob só colide com blob.
export function objectsOf(revision) {
  const out = new Set();
  for (const line of git(['rev-list', '--objects', revision]).split('\n')) {
    const sha = line.slice(0, 40);
    if (sha.length === 40) out.add(sha);
  }
  return out;
}

export function blobsOfRef(ref) {
  const entries = [];
  for (const line of git(['ls-tree', '-r', ref]).split('\n')) {
    if (!line) continue;
    const [meta, file] = line.split('\t');
    const [, type, sha] = meta.split(/\s+/);
    if (type === 'blob') entries.push({ blob: sha, path: file });
  }
  return entries;
}

export function findOrphans(refs, mainObjects, baseline, readBlobs = blobsOfRef) {
  const orphans = [];
  for (const ref of refs) {
    for (const entry of readBlobs(ref)) {
      if (mainObjects.has(entry.blob) || baseline.has(entry.blob)) continue;
      orphans.push({ ref, ...entry });
    }
  }
  return orphans;
}

function watchedRefs() {
  const refs = [];
  for (const namespace of WATCHED_NAMESPACES) {
    const local = namespace.replace(/^refs\//, '');
    git(['fetch', '--quiet', 'origin', `+${namespace}/*:refs/remotes/${local}/*`]);
    const listed = git(['for-each-ref', '--format=%(refname:short)', `refs/remotes/${local}`]).trim();
    if (listed) refs.push(...listed.split('\n'));
  }
  return refs;
}

function main() {
  const baseline = readBaseline();
  const refs = watchedRefs();
  if (!refs.length) {
    console.log(`Refs órfãos: nenhum ref em ${WATCHED_NAMESPACES.join(', ')}.`);
    return;
  }
  const orphans = findOrphans(refs, objectsOf('origin/main'), baseline);
  if (!orphans.length) {
    console.log(`Refs órfãos: ${refs.length} refs conferidos, nenhum conteúdo fora da main além do já triado.`);
    return;
  }
  console.error(`Refs órfãos: ${orphans.length} arquivo(s) com conteúdo que não existe na main.`);
  console.error('Trate cada um antes de seguir: ou o trabalho entra por PR, ou entra na linha de base com o motivo.');
  for (const { ref, path: file, blob } of orphans) console.error(`  ${ref}  ${file}  (${blob.slice(0, 9)})`);
  console.error(`Linha de base: ${path.relative(ROOT, BASELINE_PATH)}`);
  process.exitCode = 1;
}

// `process.argv[1]` nem sempre é um arquivo (`node -` lê da entrada padrão), e
// aí o realpath lança — importar este módulo não pode quebrar por isso.
function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) main();
