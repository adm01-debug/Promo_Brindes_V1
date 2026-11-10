#!/usr/bin/env node
// Guarda das instruções para agentes: AGENTS.md (regras) + CLAUDE.md (só `@AGENTS.md`) +
// docs/agentes/*.md (referência) + os dois skills do repo.
// Verifica: seções obrigatórias do AGENTS.md; CLAUDE.md sendo exatamente o import; nenhuma
// referência órfã ou quebrada em docs/agentes/; skill do Claude e do Codex idênticos com `name`
// igual à pasta; e que o conjunto não encolheu (>30% no total, >50% em qualquer arquivo) contra
// uma base — AGENT_INSTRUCTIONS_BASE (no CI, `origin/main`) ou `HEAD` localmente.
import { readFileSync, readdirSync, existsSync, realpathSync, statSync } from 'node:fs';
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

// A seção só conta como título de verdade: no início da linha e sem continuar em outra palavra.
// `includes` aceitava a seção rebaixada (`### Postura`) ou apenas citada no meio de uma frase.
function sectionHeading(section) {
  return new RegExp(`^${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'mu');
}

export function validateRequiredSections(content) {
  return REQUIRED_SECTIONS.filter((section) => !sectionHeading(section).test(content)).map(
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
// Exige crases ao redor (todas as citações reais no AGENTS.md são `docs/agentes/x.md`): sem isso,
// uma URL para outro repo (.../blob/main/docs/agentes/x.md) ou um exemplo dentro de bloco de código
// casava como citação real, mascarando órfãs de verdade (falso negativo).
export function validateDocReferences(agentsContent, docFileNames) {
  const cited = new Set(
    [...agentsContent.matchAll(/`docs\/agentes\/([A-Za-z0-9._/-]+\.md)`/g)].map((match) => match[1]),
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
  // Ancorado no início do arquivo: com a flag `m` um bloco `---\nname:` no corpo do skill
  // satisfazia a regra mesmo com o frontmatter real trazendo outro nome.
  if (!new RegExp(`^\\uFEFF?---\\r?\\nname: ${SKILL_NAME}\\r?\\n`).test(first)) {
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

// Recursivo como o `git ls-tree -r` da base: listar só o primeiro nível fazia um arquivo em
// subpasta passar sem citação no PR que o criava e acusar "sumiu" em todas as execuções seguintes.
function docFileNamesOnDisk(directory = DOCS_DIR, prefix = '') {
  if (!existsSync(directory)) return [];
  const names = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) names.push(...docFileNamesOnDisk(full, `${prefix}${entry.name}/`));
    else if (entry.name.endsWith('.md') && statSync(full, { throwIfNoEntry: false })?.isFile()) names.push(`${prefix}${entry.name}`);
  }
  return names.sort();
}

function currentSizes() {
  const byFile = {};
  for (const file of [AGENTS_FILE, CLAUDE_FILE, ...docFileNamesOnDisk().map((name) => `${DOCS_DIR}/${name}`), ...SKILL_FILES]) {
    if (existsSync(file)) byFile[file] = Buffer.byteLength(readFileSync(file));
  }
  return { byFile, total: Object.values(byFile).reduce((sum, bytes) => sum + bytes, 0) };
}

function baseSizes(ref) {
  // `ref` vira argumento isolado do `ls-tree` abaixo: um valor começando com "-" seria lido como
  // flag do git, não como ref. Não é injeção de shell (execFileSync não usa shell), mas é entrada
  // inesperada que merece falhar alto em vez de se comportar de um jeito não previsto.
  if (ref.startsWith('-')) {
    throw new Error(`ref inválida ("${ref}"): não pode começar com "-".`);
  }
  const size = (file) => {
    try {
      return Number.parseInt(execFileSync('git', ['cat-file', '-s', `${ref}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(), 10);
    } catch {
      return undefined;
    }
  };
  let listed;
  try {
    // `-z`: sem ele o git devolve nomes não ASCII entre aspas e escapados, que não terminam em `.md`.
    listed = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', ref, '--', DOCS_DIR], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    listed = '';
  }
  const files = [AGENTS_FILE, CLAUDE_FILE, ...listed.split('\0').filter((line) => line.endsWith('.md')), ...SKILL_FILES];
  const byFile = {};
  for (const file of files) {
    const bytes = size(file);
    if (bytes !== undefined) byFile[file] = bytes;
  }
  if (Object.keys(byFile).length === 0) return null;
  return { byFile, total: Object.values(byFile).reduce((sum, bytes) => sum + bytes, 0) };
}

function main() {
  if (process.argv.slice(2).some((argument) => argument === '--help' || argument === '-h')) {
    console.log('Uso: node scripts/validate-agent-instructions.mjs  (rode na raiz do repositório; sem argumentos)');
    console.log('  AGENT_INSTRUCTIONS_BASE=<ref>        base da comparação de tamanho (padrão: HEAD; no CI, a ref de main).');
    console.log('  AGENT_INSTRUCTIONS_ALLOW_NO_BASE=1   aceita rodar sem base resolvida; as demais checagens continuam valendo.');
    console.log('Sai com 0 quando tudo confere e com 1 em qualquer divergência (linhas ::error:: no stderr).');
    return;
  }
  const errors = [];
  if (!existsSync(AGENTS_FILE)) {
    console.error(`::error::${AGENTS_FILE} não encontrado em ${process.cwd()}. Rode na raiz do repositório; se já está nela, outra sessão pode ter apagado o arquivo.`);
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
  let base;
  let refRecusada = false;
  try {
    base = baseSizes(ref);
  } catch (error) {
    errors.push(error.message);
    base = undefined;
    refRecusada = true;
  }
  // Base que não resolve (ref inexistente, fora de repo git, git ausente do PATH) pulava a
  // comparação de tamanho e imprimia "OK" com exit 0 — um apagamento de docs/agentes/ passava
  // inteiro. Falha de propósito; AGENT_INSTRUCTIONS_ALLOW_NO_BASE=1 é a saída explícita para quem
  // precisar mesmo assim rodar sem base — e, mesmo nesse caso, qualquer erro já acumulado acima
  // (seção ausente, skill divergente) continua bloqueando, não é mascarado.
  let semComparacaoDeTamanho = false;
  if (base) {
    errors.push(...validateShrink(current, base));
  } else if (refRecusada) {
    // O erro da ref inválida já foi registrado; "não resolveu" por cima sugeriria o escape errado.
  } else if (process.env.AGENT_INSTRUCTIONS_ALLOW_NO_BASE === '1') {
    semComparacaoDeTamanho = true;
  } else {
    errors.push(
      `Base "${ref}" não resolveu (ref inexistente, fora de repo git ou git ausente). A comparação de tamanho não rodou, então um apagamento passaria: recusando até que AGENT_INSTRUCTIONS_ALLOW_NO_BASE=1 seja passado explicitamente.`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`::error::${error}`);
    process.exit(1);
  }
  console.log(
    `Instruções para agentes OK: ${REQUIRED_SECTIONS.length} seções, ${docFileNamesOnDisk().length} arquivos em ${DOCS_DIR}/, skills idênticos; conjunto com ${current.total} bytes${semComparacaoDeTamanho ? ' (comparação de tamanho pulada: AGENT_INSTRUCTIONS_ALLOW_NO_BASE=1)' : ` (base ${ref})`}.`,
  );
}

// Caminhos reais: chamado por um caminho com symlink, o texto de argv[1] difere do módulo
// carregado e o guard sairia com código 0 sem validar nada.
function isMainModule() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) main();
