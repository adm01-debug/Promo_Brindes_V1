#!/usr/bin/env node
// Guarda das instruções para agentes: AGENTS.md (regras) + CLAUDE.md (só `@AGENTS.md`) +
// docs/agentes/*.md (referência) + os dois skills do repo.
// Verifica: seções obrigatórias do AGENTS.md; CLAUDE.md sendo exatamente o import; nenhuma
// referência órfã ou quebrada em docs/agentes/; skill do Claude e do Codex idênticos com `name`
// igual à pasta; e que o conjunto não encolheu (>30% no total, >50% em qualquer arquivo) contra
// uma base — AGENT_INSTRUCTIONS_BASE (no CI, `origin/main`) ou `HEAD` localmente.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AGENTS_FILE = 'AGENTS.md';
export const CLAUDE_FILE = 'CLAUDE.md';
export const DOCS_DIR = 'docs/agentes';
export const SKILL_NAME = 'promo-brindes-v1';
export const SKILL_FILES = [
  `.claude/skills/${SKILL_NAME}/SKILL.md`,
  `.agents/skills/${SKILL_NAME}/SKILL.md`,
];
export const REQUIRED_SECTIONS = [
  '## Postura',
  '## Bugs e funcionalidades',
  '## Comunicação',
  '## Fluxo Git',
  '## Banco',
  '## Serviços',
  '## Stack e comandos',
  '## Grafo de código',
];
export const SET_SHRINK_THRESHOLD = 0.3;
export const FILE_SHRINK_THRESHOLD = 0.5;

export function validateRequiredSections(content) {
  return REQUIRED_SECTIONS.filter((section) => !content.includes(section)).map(
    (section) => `${AGENTS_FILE}: seção obrigatória ausente: ${section}`,
  );
}

export function validateClaudeImport(content) {
  return content.trim() === `@${AGENTS_FILE}`
    ? []
    : [`${CLAUDE_FILE} precisa ser exatamente \`@${AGENTS_FILE}\` (recebido: ${JSON.stringify(content.trim().slice(0, 40))}).`];
}

// Toda referência docs/agentes/<arquivo>.md citada no AGENTS.md precisa existir, e todo arquivo da
// pasta precisa ser citado — referência órfã é instrução que ninguém lê.
export function validateDocReferences(agentsContent, docFileNames) {
  const cited = new Set(
    [...agentsContent.matchAll(/docs\/agentes\/([A-Za-z0-9._-]+\.md)/g)].map((match) => match[1]),
  );
  const present = new Set(docFileNames);
  const errors = [];
  for (const name of [...cited].sort()) {
    if (name.includes('<')) continue;
    if (!present.has(name)) errors.push(`${AGENTS_FILE} cita ${DOCS_DIR}/${name}, que não existe.`);
  }
  for (const name of [...present].sort()) {
    if (!cited.has(name)) errors.push(`${DOCS_DIR}/${name} não é citado pelo ${AGENTS_FILE} (referência órfã).`);
  }
  return errors;
}

export function validateSkillCopies(contents) {
  const errors = [];
  const [first, ...rest] = contents;
  if (first === undefined) return [`skill ${SKILL_NAME} não encontrado.`];
  for (const [index, content] of rest.entries()) {
    if (content !== first) errors.push(`${SKILL_FILES[index + 1]} difere de ${SKILL_FILES[0]}; os dois skills são cópias idênticas.`);
  }
  if (!new RegExp(`^---\\nname: ${SKILL_NAME}\\n`, 'm').test(first)) {
    errors.push(`${SKILL_FILES[0]}: frontmatter precisa começar com \`name: ${SKILL_NAME}\` (igual ao nome da pasta).`);
  }
  if (!/^description: .+/m.test(first)) {
    errors.push(`${SKILL_FILES[0]}: frontmatter precisa de \`description\` dizendo quando usar o skill.`);
  }
  return errors;
}

export function validateShrink(current, base) {
  if (!base) return [];
  const errors = [];
  const ratio = current.total / base.total;
  if (ratio < 1 - SET_SHRINK_THRESHOLD) {
    errors.push(
      `o conjunto de instruções encolheu ${Math.round((1 - ratio) * 100)}% (atual: ${current.total} bytes, base: ${base.total} bytes). Possível apagamento por sessão paralela.`,
    );
  }
  for (const [file, baseBytes] of Object.entries(base.byFile)) {
    if (file === CLAUDE_FILE || baseBytes === 0) continue;
    const nowBytes = current.byFile[file];
    if (nowBytes === undefined) {
      errors.push(`${file} existia na base (${baseBytes} bytes) e sumiu.`);
      continue;
    }
    if (nowBytes < baseBytes * FILE_SHRINK_THRESHOLD) {
      errors.push(
        `${file} encolheu ${Math.round((1 - nowBytes / baseBytes) * 100)}% (atual: ${nowBytes} bytes, base: ${baseBytes} bytes); o limite por arquivo é ${Math.round(FILE_SHRINK_THRESHOLD * 100)}%.`,
      );
    }
  }
  return errors;
}

function docFileNamesOnDisk() {
  return existsSync(DOCS_DIR) ? readdirSync(DOCS_DIR).filter((name) => name.endsWith('.md')).sort() : [];
}

function currentSizes() {
  const byFile = {};
  for (const file of [AGENTS_FILE, CLAUDE_FILE, ...docFileNamesOnDisk().map((name) => `${DOCS_DIR}/${name}`)]) {
    if (existsSync(file)) byFile[file] = Buffer.byteLength(readFileSync(file));
  }
  return { byFile, total: Object.values(byFile).reduce((sum, bytes) => sum + bytes, 0) };
}

function baseSizes(ref) {
  const size = (file) => {
    try {
      return Number.parseInt(execFileSync('git', ['cat-file', '-s', `${ref}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(), 10);
    } catch {
      return undefined;
    }
  };
  let listed;
  try {
    listed = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', DOCS_DIR], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    listed = '';
  }
  const files = [AGENTS_FILE, CLAUDE_FILE, ...listed.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.md'))];
  const byFile = {};
  for (const file of files) {
    const bytes = size(file);
    if (bytes !== undefined) byFile[file] = bytes;
  }
  if (Object.keys(byFile).length === 0) return null;
  return { byFile, total: Object.values(byFile).reduce((sum, bytes) => sum + bytes, 0) };
}

function main() {
  const errors = [];
  if (!existsSync(AGENTS_FILE)) {
    console.error(`::error::${AGENTS_FILE} não encontrado. Outra sessão pode ter apagado o arquivo.`);
    process.exit(1);
  }
  const agents = readFileSync(AGENTS_FILE, 'utf8');
  errors.push(...validateRequiredSections(agents));
  errors.push(
    ...(existsSync(CLAUDE_FILE) ? validateClaudeImport(readFileSync(CLAUDE_FILE, 'utf8')) : [`${CLAUDE_FILE} não encontrado.`]),
  );
  errors.push(...validateDocReferences(agents, docFileNamesOnDisk()));
  const missingSkills = SKILL_FILES.filter((file) => !existsSync(file));
  if (missingSkills.length > 0) errors.push(...missingSkills.map((file) => `${file} não encontrado.`));
  else errors.push(...validateSkillCopies(SKILL_FILES.map((file) => readFileSync(file, 'utf8'))));
  const current = currentSizes();
  const ref = process.env.AGENT_INSTRUCTIONS_BASE || 'HEAD';
  errors.push(...validateShrink(current, baseSizes(ref)));

  if (errors.length > 0) {
    for (const error of errors) console.error(`::error::${error}`);
    process.exit(1);
  }
  console.log(
    `Instruções para agentes OK: ${REQUIRED_SECTIONS.length} seções, ${docFileNamesOnDisk().length} arquivos em ${DOCS_DIR}/, skills idênticos; conjunto com ${current.total} bytes (base ${ref}).`,
  );
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
