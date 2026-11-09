import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  AGENTS_FILE,
  CLAUDE_FILE,
  REQUIRED_SECTIONS,
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
