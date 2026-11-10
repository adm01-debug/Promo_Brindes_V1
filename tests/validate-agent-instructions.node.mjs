import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  AGENTS_FILE,
  CLAUDE_FILE,
  DOCS_DIR,
  REQUIRED_SECTIONS,
  SKILL_FILES,
  SKILL_NAME,
  validateClaudeImport,
  validateDocReferences,
  validateRequiredSections,
  validateShrink,
  validateSkillCopies,
} from '../scripts/validate-agent-instructions.mjs';

const agentsCompleto = REQUIRED_SECTIONS.join('\n\n');

test('aceita AGENTS.md com todas as seções obrigatórias', () => {
  assert.deepEqual(validateRequiredSections(agentsCompleto), []);
});

test('acusa seção obrigatória apagada por outra sessão', () => {
  const sem = agentsCompleto.replace('## Fluxo Git', '');
  const errors = validateRequiredSections(sem);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /## Fluxo Git/);
});

test(`${CLAUDE_FILE} precisa ser exatamente o import do ${AGENTS_FILE}`, () => {
  assert.deepEqual(validateClaudeImport('@AGENTS.md\n'), []);
  assert.match(validateClaudeImport('# regras duplicadas\n')[0], /exatamente/);
});

test('acusa referência quebrada e referência órfã em docs/agentes', () => {
  assert.deepEqual(validateDocReferences('ler `docs/agentes/banco.md`', ['banco.md']), []);
  assert.match(
    validateDocReferences('ler `docs/agentes/banco.md`', [])[0],
    /não existe/,
  );
  assert.match(
    validateDocReferences('nada aqui', ['vercel-deploy.md'])[0],
    /referência órfã/,
  );
});

test('ignora o placeholder docs/agentes/<tema>.md citado na introdução', () => {
  assert.deepEqual(validateDocReferences('detalhe em `docs/agentes/<tema>.md`', []), []);
});

const skill = `---\nname: ${SKILL_NAME}\ndescription: Convenções do repo. Use ao alterar código.\n---\n\n# corpo\n`;

test('exige skills idênticos com name igual à pasta e description presente', () => {
  assert.deepEqual(validateSkillCopies([skill, skill]), []);
  assert.match(validateSkillCopies([skill, `${skill}divergiu\n`])[0], /difere de/);
  assert.match(
    validateSkillCopies([skill.replace(`name: ${SKILL_NAME}`, 'name: outro-nome')])[0],
    /name: /,
  );
  assert.match(
    validateSkillCopies([skill.replace(/^description: .+$/m, 'summary: x')])[0],
    /description/,
  );
});

test('barra o conjunto de instruções encolhendo mais de 30%', () => {
  const base = { total: 1000, byFile: { 'AGENTS.md': 800, 'CLAUDE.md': 200 } };
  assert.deepEqual(validateShrink({ total: 1000, byFile: { 'AGENTS.md': 800, 'CLAUDE.md': 200 } }, base), []);
  const errors = validateShrink({ total: 600, byFile: { 'AGENTS.md': 400, 'CLAUDE.md': 200 } }, base);
  assert.match(errors[0], /encolheu 40%/);
});

test('barra um único arquivo esvaziado ou apagado, mesmo com o total dentro do limite', () => {
  const base = {
    total: 10000,
    byFile: { 'AGENTS.md': 8000, 'docs/agentes/banco.md': 2000 },
  };
  const esvaziado = validateShrink(
    { total: 8500, byFile: { 'AGENTS.md': 8000, 'docs/agentes/banco.md': 500 } },
    base,
  );
  assert.equal(esvaziado.length, 1);
  assert.match(esvaziado[0], /docs\/agentes\/banco\.md encolheu 75%/);
  const apagado = validateShrink({ total: 8000, byFile: { 'AGENTS.md': 8000 } }, base);
  assert.match(apagado[0], /sumiu/);
});

test('sem base (ref inexistente) a comparação de validateShrink em si é no-op — quem decide falhar é main()', () => {
  assert.deepEqual(validateShrink({ total: 1, byFile: { 'AGENTS.md': 1 } }, null), []);
});

test('ignora referência dentro de URL ou texto sem crase — exige `docs/agentes/x.md` literal', () => {
  const urlDeOutroRepo = 'Veja https://github.com/outraorg/outro/blob/main/docs/agentes/pago-mock.md.';
  assert.deepEqual(validateDocReferences(urlDeOutroRepo, []), []);
  const errosOrfaMascarada = validateDocReferences(urlDeOutroRepo, ['pago-mock.md']);
  assert.equal(errosOrfaMascarada.length, 1);
  assert.match(errosOrfaMascarada[0], /referência órfã/);
});

const SCRIPT = fileURLToPath(new URL('../scripts/validate-agent-instructions.mjs', import.meta.url));

test('main(): base que não resolve falha de propósito (fail-closed), não passa OK em silêncio', () => {
  assert.throws(() =>
    execFileSync('node', [SCRIPT], {
      env: { ...process.env, AGENT_INSTRUCTIONS_BASE: 'refs/heads/essa-ref-nao-existe-para-o-teste' },
      stdio: 'pipe',
    }),
  );
});

test('main(): AGENT_INSTRUCTIONS_ALLOW_NO_BASE=1 permite rodar sem base, mas não mascara seção obrigatória ausente', () => {
  const output = execFileSync('node', [SCRIPT], {
    env: {
      ...process.env,
      AGENT_INSTRUCTIONS_BASE: 'refs/heads/essa-ref-nao-existe-para-o-teste',
      AGENT_INSTRUCTIONS_ALLOW_NO_BASE: '1',
    },
    stdio: 'pipe',
  }).toString();
  assert.match(output, /comparação de tamanho pulada/);
});

test('main(): ref começando com "-" é rejeitada antes de chegar ao git', () => {
  let stderr = '';
  try {
    execFileSync('node', [SCRIPT], { env: { ...process.env, AGENT_INSTRUCTIONS_BASE: '--upload-pack=evil' }, stdio: 'pipe' });
    assert.fail('deveria ter lançado');
  } catch (error) {
    stderr = error.stderr.toString();
  }
  assert.match(stderr, /não pode começar com "-"/);
});

test('seção rebaixada, citada no meio da linha ou com outro título não conta como seção obrigatória', () => {
  assert.match(validateRequiredSections(agentsCompleto.replace('## Postura', '### Postura'))[0], /## Postura/);
  assert.match(validateRequiredSections(agentsCompleto.replace('## Banco', 'A seção "## Banco" foi removida.'))[0], /## Banco/);
  assert.match(validateRequiredSections(agentsCompleto.replace('## Banco', '## Bancos de dados'))[0], /## Banco/);
});

test('títulos reais com complemento e arquivo em CRLF continuam aceitos', () => {
  const comComplemento = agentsCompleto
    .replace('## Fluxo Git', '## Fluxo Git — detalhe em `docs/agentes/github-ci.md`')
    .replace('## Grafo de código', '## Grafo de código (graphify)')
    .replace('## Banco', '## Banco — ler antes de SQL');
  assert.deepEqual(validateRequiredSections(comComplemento), []);
  assert.deepEqual(validateRequiredSections(comComplemento.replace(/\n/g, '\r\n')), []);
});

test('referência a arquivo em subpasta de docs/agentes é citável e cobrada como as demais', () => {
  assert.deepEqual(validateDocReferences('ler `docs/agentes/banco/rls.md`', ['banco/rls.md']), []);
  assert.match(validateDocReferences('nada aqui', ['banco/rls.md'])[0], /docs\/agentes\/banco\/rls\.md não é citado/);
  assert.match(validateDocReferences('ler `docs/agentes/banco/rls.md`', [])[0], /não existe/);
});

test('frontmatter do skill é o do início do arquivo: bloco `name:` no corpo não vale; CRLF vale', () => {
  const nomeSoNoCorpo = `---\nname: outro-nome\ndescription: x\n---\n\nexemplo:\n---\nname: ${SKILL_NAME}\n---\n`;
  assert.match(validateSkillCopies([nomeSoNoCorpo])[0], /frontmatter precisa começar com/);
  assert.deepEqual(validateSkillCopies([skill.replace(/\n/g, '\r\n')]), []);
});

function git(cwd, ...args) {
  const env = { ...process.env };
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[name];
  return execFileSync('git', ['-c', 'user.email=teste@example.invalid', '-c', 'user.name=teste', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Repositório git descartável com um conjunto de instruções válido e já commitado. */
function makeInstructionsRepo() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-instructions-')));
  const root = path.join(base, 'repo');
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  const corpo = 'Regra que o agente precisa ler antes de agir.\n'.repeat(40);
  write(AGENTS_FILE, `${REQUIRED_SECTIONS.map((section) => `${section}\n\n${corpo}`).join('\n')}\nLer \`${DOCS_DIR}/banco.md\` e \`${DOCS_DIR}/vercel-deploy.md\`.\n`);
  write(CLAUDE_FILE, `@${AGENTS_FILE}\n`);
  write(`${DOCS_DIR}/banco.md`, `# Banco\n\n${corpo}`);
  write(`${DOCS_DIR}/vercel-deploy.md`, `# Vercel\n\n${corpo}`);
  for (const file of SKILL_FILES) write(file, `${skill}${corpo}`);
  git(root, 'init', '-q', '-b', 'main', '.');
  const commit = (message) => {
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', message);
  };
  commit('base');
  return {
    base,
    root,
    write,
    commit,
    run(env = {}, { script = SCRIPT, cwd = root, args = [] } = {}) {
      const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env, AGENT_INSTRUCTIONS_BASE: '', AGENT_INSTRUCTIONS_ALLOW_NO_BASE: '', ...env } });
      return { status: result.status, stdout: result.stdout, stderr: result.stderr };
    },
    cleanup: () => fs.rmSync(base, { recursive: true, force: true }),
  };
}

test('main(): conjunto íntegro passa com base HEAD e stdout de uma linha', () => {
  const repo = makeInstructionsRepo();
  try {
    const result = repo.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Instruções para agentes OK: 8 seções, 2 arquivos em docs\/agentes\/, skills idênticos; conjunto com \d+ bytes \(base HEAD\)\.\n$/);
    assert.equal(result.stderr, '');
  } finally {
    repo.cleanup();
  }
});

test('main(): chamado por caminho com symlink ainda valida (não sai com 0 em silêncio)', () => {
  const repo = makeInstructionsRepo();
  try {
    const link = path.join(repo.base, 'link-do-checkout');
    fs.symlinkSync(fileURLToPath(new URL('..', import.meta.url)), link, 'dir');
    const result = repo.run({ AGENT_INSTRUCTIONS_BASE: 'refs/heads/nao-existe' }, { script: path.join(link, 'scripts', 'validate-agent-instructions.mjs') });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /não resolveu/);
  } finally {
    repo.cleanup();
  }
});

test('main(): arquivo em subpasta de docs/agentes citado passa; sem citação é órfão, nunca "sumiu"', () => {
  const repo = makeInstructionsRepo();
  try {
    repo.write(`${DOCS_DIR}/banco/rls.md`, '# RLS\n\nDetalhe.\n');
    const orfao = repo.run();
    assert.equal(orfao.status, 1, 'subpasta sem citação precisa falhar já no PR que a cria');
    assert.match(orfao.stderr, /docs\/agentes\/banco\/rls\.md não é citado/);
    fs.appendFileSync(path.join(repo.root, AGENTS_FILE), `Ler \`${DOCS_DIR}/banco/rls.md\`.\n`);
    repo.commit('subpasta citada');
    const citado = repo.run();
    assert.equal(citado.status, 0, citado.stderr);
    assert.doesNotMatch(citado.stderr, /sumiu/);
    assert.match(citado.stdout, /3 arquivos em docs\/agentes\//);
    fs.rmSync(path.join(repo.root, DOCS_DIR, 'banco'), { recursive: true });
    assert.match(repo.run().stderr, /docs\/agentes\/banco\/rls\.md existia na base \(\d+ bytes\) e sumiu/);
  } finally {
    repo.cleanup();
  }
});

test('main(): diretório com nome terminado em .md dentro de docs/agentes não derruba o guard', () => {
  const repo = makeInstructionsRepo();
  try {
    fs.mkdirSync(path.join(repo.root, DOCS_DIR, 'rascunhos.md'));
    const result = repo.run();
    assert.equal(result.status, 0, result.stderr);
  } finally {
    repo.cleanup();
  }
});

test('main(): os dois skills esvaziados de forma idêntica são barrados pelo limite por arquivo', () => {
  const repo = makeInstructionsRepo();
  try {
    for (const file of SKILL_FILES) repo.write(file, skill);
    const result = repo.run();
    assert.equal(result.status, 1);
    for (const file of SKILL_FILES) assert.match(result.stderr, new RegExp(`${file.replaceAll('.', '\\.')} encolheu \\d+%`));
  } finally {
    repo.cleanup();
  }
});

test('main(): doc com nome não ASCII que existia na base e foi apagado é acusado', () => {
  const repo = makeInstructionsRepo();
  try {
    repo.write(`${DOCS_DIR}/domínio.md`, '# Regras de domínio\n');
    repo.commit('doc com acento');
    fs.rmSync(path.join(repo.root, DOCS_DIR, 'domínio.md'));
    const result = repo.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs\/agentes\/domínio\.md existia na base \(\d+ bytes\) e sumiu/);
  } finally {
    repo.cleanup();
  }
});

test('main(): clone raso com a base buscada em FETCH_HEAD compara contra main de verdade', () => {
  const repo = makeInstructionsRepo();
  try {
    const remote = path.join(repo.base, 'remoto.git');
    git(repo.base, 'clone', '-q', '--bare', repo.root, remote);
    git(repo.root, 'checkout', '-q', '-b', 'pr');
    repo.write(`${DOCS_DIR}/banco.md`, '');
    repo.commit('esvazia banco.md');
    git(repo.root, 'push', '-q', remote, 'pr');
    const ci = path.join(repo.base, 'ci');
    git(repo.base, 'clone', '-q', '--depth=1', '--branch', 'pr', `file://${remote}`, ci);
    assert.equal(git(ci, 'rev-list', '--count', 'HEAD').trim(), '1', 'checkout do CI é raso');

    // Sem base explícita o CI compara o commit do PR com ele mesmo e nada é detectado.
    assert.equal(repo.run({}, { cwd: ci }).status, 0);
    const semFetch = repo.run({ AGENT_INSTRUCTIONS_BASE: 'FETCH_HEAD' }, { cwd: ci });
    assert.equal(semFetch.status, 1);
    assert.match(semFetch.stderr, /Base "FETCH_HEAD" não resolveu/);

    git(ci, 'fetch', '-q', '--no-tags', '--depth=1', 'origin', 'main');
    const comBase = repo.run({ AGENT_INSTRUCTIONS_BASE: 'FETCH_HEAD' }, { cwd: ci });
    assert.equal(comBase.status, 1);
    assert.match(comBase.stderr, /docs\/agentes\/banco\.md encolheu 100%/);

    const integro = path.join(repo.base, 'ci-main');
    git(repo.base, 'clone', '-q', '--depth=1', '--branch', 'main', `file://${remote}`, integro);
    git(integro, 'fetch', '-q', '--no-tags', '--depth=1', 'origin', 'main');
    const ok = repo.run({ AGENT_INSTRUCTIONS_BASE: 'FETCH_HEAD' }, { cwd: integro });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /\(base FETCH_HEAD\)/);
  } finally {
    repo.cleanup();
  }
});

test('main(): ref recusada gera um único erro, sem sugerir o escape de "não resolveu"', () => {
  const repo = makeInstructionsRepo();
  try {
    const result = repo.run({ AGENT_INSTRUCTIONS_BASE: '--upload-pack=evil', AGENT_INSTRUCTIONS_ALLOW_NO_BASE: '1' });
    assert.equal(result.status, 1, 'o escape não libera ref inválida');
    assert.equal(result.stderr, '::error::ref inválida ("--upload-pack=evil"): não pode começar com "-".\n');
  } finally {
    repo.cleanup();
  }
});

test('main(): fora da raiz do repositório o erro diz onde procurou e o que fazer', () => {
  const repo = makeInstructionsRepo();
  try {
    const result = repo.run({}, { cwd: repo.base });
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`AGENTS\\.md não encontrado em ${repo.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\. Rode na raiz do repositório`));
  } finally {
    repo.cleanup();
  }
});

test('main(): fora de um repositório git falha fechado e o escape continua explícito', () => {
  const repo = makeInstructionsRepo();
  try {
    fs.rmSync(path.join(repo.root, '.git'), { recursive: true });
    const env = { GIT_CEILING_DIRECTORIES: repo.base };
    assert.equal(repo.run(env).status, 1);
    const liberado = repo.run({ ...env, AGENT_INSTRUCTIONS_ALLOW_NO_BASE: '1' });
    assert.equal(liberado.status, 0, liberado.stderr);
    assert.match(liberado.stdout, /comparação de tamanho pulada/);
    assert.equal(repo.run({ ...env, AGENT_INSTRUCTIONS_ALLOW_NO_BASE: 'true' }).status, 1, 'só o valor exato 1 libera');
  } finally {
    repo.cleanup();
  }
});

test('main(): --help descreve as variáveis de ambiente e sai com 0', () => {
  const repo = makeInstructionsRepo();
  try {
    const result = repo.run({}, { args: ['--help'] });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /AGENT_INSTRUCTIONS_BASE=<ref>/);
    assert.match(result.stdout, /AGENT_INSTRUCTIONS_ALLOW_NO_BASE=1/);
  } finally {
    repo.cleanup();
  }
});
