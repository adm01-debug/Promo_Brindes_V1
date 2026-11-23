import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  LIMITS,
  findPersuasionViolations,
  listInterfaceFiles,
  persuasionSummary,
} from '../scripts/validate-persuasion-limits.mjs';

const fixture = (name, body) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'persuasao-'));
  const file = path.join(dir, name);
  writeFileSync(file, body);
  return file;
};

test('os seis limites da etapa 009 estao declarados', () => {
  assert.deepEqual(
    LIMITS.map((limit) => limit.id),
    ['urgencia-ficticia', 'culpa-ao-recusar', 'elogio-automatico', 'prova-social-inventada', 'dado-presumido', 'consentimento-disfarcado'],
  );
  assert.match(persuasionSummary(), /prova social inventada/);
});

test('interface sem nenhum dos seis padroes passa limpa', () => {
  const file = fixture('limpa.tsx', 'export const A = () => <p>Sua proposta leva 2 dias úteis.</p>;\n');
  assert.deepEqual(findPersuasionViolations([file]), []);
});

for (const limit of [
  ['urgencia-ficticia', 'Restam últimas unidades!'],
  ['urgencia-ficticia', 'Só hoje: condição especial.'],
  ['culpa-ao-recusar', 'Você vai se arrepender de sair agora.'],
  ['elogio-automatico', 'Excelente escolha de brinde.'],
  ['prova-social-inventada', 'Mais de 800 empresas confiam na gente.'],
  ['prova-social-inventada', 'Nota 4.9 de 5 pelos clientes.'],
  ['dado-presumido', 'Sabemos que você sempre compra em dezembro.'],
  ['consentimento-disfarcado', 'Ao continuar você aceita receber nossas novidades.'],
  ['consentimento-disfarcado', '<input type="checkbox" defaultChecked />'],
]) {
  test(`reprova ${limit[0]}: ${limit[1]}`, () => {
    const file = fixture('suja.tsx', `export const A = () => <p>${limit[1]}</p>;\n`);
    const errors = findPersuasionViolations([file]);
    assert.equal(errors.length >= 1, true, 'deveria reprovar');
    assert.match(errors[0], new RegExp(limit[0].replace(/-/g, '[- ]')));
  });
}

for (const body of [
  '<input\n  type="checkbox"\n  defaultChecked\n/>',
  '<input\n  defaultChecked\n  type="checkbox"\n/>',
  "<input\n  id=\"aceite\"\n  type='checkbox'\n  checked={true}\n  defaultChecked={true}\n/>",
]) {
  test(`reprova consentimento disfarcado em checkbox multilinha: ${body.replace(/\s+/g, ' ')}`, () => {
    const file = fixture('multilinha.tsx', `export const A = () => (\n  <label>\n    ${body}\n  </label>\n);\n`);
    const errors = findPersuasionViolations([file]);
    assert.equal(errors.length >= 1, true, 'checkbox pre-marcada deveria reprovar');
    assert.match(errors[0], /consentimento disfarcado/);
  });
}

test('checkbox vazia em multilinha continua aprovada', () => {
  const file = fixture('vazia.tsx', 'export const A = () => (\n  <label>\n    <input\n      type="checkbox"\n      checked={aceite}\n      onChange={aoMudar}\n    />\n  </label>\n);\n');
  assert.deepEqual(findPersuasionViolations([file]), []);
});

for (const body of [
  '<input\n      type="checkbox"\n      defaultChecked={false}\n      onChange={aoMudar}\n    />',
  '<input type="checkbox" defaultChecked={false} onChange={aoMudar} />',
]) {
  test(`checkbox desmarcada por defaultChecked={false} continua aprovada: ${body.replace(/\s+/g, ' ')}`, () => {
    const file = fixture('desmarcada.tsx', `export const A = () => (\n  <label>\n    ${body}\n  </label>\n);\n`);
    assert.deepEqual(findPersuasionViolations([file]), []);
  });
}

test('exemplo comentado de defaultChecked nao e consentimento pre-marcado', () => {
  const file = fixture('comentado-default-checked.tsx',
    'export const A = () => (\n  <p>\n    {}\n    {/* <input type="checkbox" defaultChecked /> */}\n  </p>\n);\n');
  assert.deepEqual(findPersuasionViolations([file]), []);
});

test('defaultChecked sem valor explicito e flagrado pela arvore JSX', () => {
  const file = fixture('sem-valor.tsx', 'export const A = () => (\n  <label>\n    <input\n      type="checkbox"\n      defaultChecked\n    />\n  </label>\n);\n');
  const errors = findPersuasionViolations([file]);
  assert.equal(errors.length, 1, errors.join('; '));
  assert.match(errors[0], /:3 viola "consentimento disfarcado"/);
});

for (const claim of [
  '9 mil clientes atendidos',
  'mais de 1.000 empresas confiam',
  'nota 4,9 de 5 no atendimento',
  'nota 4.9 de 5 no atendimento',
]) {
  test(`reprova prova social escrita por extenso: ${claim}`, () => {
    const file = fixture('prova.tsx', `export const A = () => <p>${claim}</p>;\n`);
    const errors = findPersuasionViolations([file]);
    assert.equal(errors.length >= 1, true, 'numero de clientes/nota sem fonte deveria reprovar');
    assert.match(errors[0], /prova social inventada/);
  });
}

test('comentario que cita o padrao nao conta como promessa na tela', () => {
  const file = fixture('comentada.tsx', '// nunca escreva "últimas unidades" na interface\nexport const A = () => <p>Ok.</p>;\n');
  assert.deepEqual(findPersuasionViolations([file]), []);
});

test('arquivo de teste nao entra na varredura da interface', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'persuasao-src-'));
  mkdirSync(path.join(dir, 'components'));
  writeFileSync(path.join(dir, 'components', 'A.tsx'), 'export const A = 1;\n');
  writeFileSync(path.join(dir, 'components', 'A.test.tsx'), '// últimas unidades\n');
  const files = listInterfaceFiles(dir);
  assert.equal(files.length, 1);
  assert.match(files[0], /A\.tsx$/);
});

test('interface real do repositorio respeita os seis limites', () => {
  const files = listInterfaceFiles();
  assert.equal(files.length > 50, true, `varredura deveria cobrir a interface toda (${files.length})`);
  assert.deepEqual(findPersuasionViolations(files), []);
});