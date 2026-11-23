import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { validateClaims } from '../scripts/validate-commercial-claims.mjs';

const FILES = {
  'src/a.tsx': ['linha um', 'Receba uma proposta real', 'outra linha'],
  'src/b.tsx': ['export const x = 1;'],
};

const read = (file) => (file in FILES ? FILES[file] : null);

const base = () => ({
  claims: [
    {
      id: 'AC-01',
      claim: 'Receba uma proposta real',
      where: [{ file: 'src/a.tsx', line: 2, snippet: 'proposta real' }],
      owner: 'negocio',
      status: 'confirmada',
      evidence: { file: 'src/b.tsx', pattern: 'export const x' },
      checkedAt: '2026-11-22',
    },
  ],
});

test('inventario valido passa sem erros', () => {
  assert.deepEqual(validateClaims(base(), read), []);
});

test('inventario sem afirmacoes reprova', () => {
  assert.deepEqual(validateClaims({ claims: [] }, read), ['inventario sem afirmacoes']);
  assert.deepEqual(validateClaims({}, read), ['inventario sem afirmacoes']);
});

test('afirmacao sem localizacao reprova', () => {
  const inventory = base();
  inventory.claims[0].where = [];
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((e) => /sem "where"/.test(e)), errors.join('; '));
});

test('campo obrigatorio ausente reprova', () => {
  const inventory = base();
  delete inventory.claims[0].owner;
  const errors = validateClaims(inventory, read);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /AC-01 sem "owner"/);
});

test('id duplicado reprova', () => {
  const inventory = base();
  inventory.claims.push({ ...inventory.claims[0] });
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('id duplicado: AC-01')));
});

test('status fora da lista reprova', () => {
  const inventory = base();
  inventory.claims[0].status = 'talvez';
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('status invalido: talvez')));
});

test('data fora de AAAA-MM-DD reprova', () => {
  const inventory = base();
  inventory.claims[0].checkedAt = '22/11/2026';
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('checkedAt fora de AAAA-MM-DD')));
});

test('arquivo inexistente no where reprova', () => {
  const inventory = base();
  inventory.claims[0].where[0].file = 'src/nao-existe.tsx';
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('arquivo inexistente: src/nao-existe.tsx')));
});

test('linha fora do arquivo reprova', () => {
  const inventory = base();
  inventory.claims[0].where[0].line = 99;
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('linha fora do arquivo')));
});

test('snippet que nao esta naquela linha reprova (afirmacao mudou de lugar)', () => {
  const inventory = base();
  inventory.claims[0].where[0].snippet = 'texto que saiu do site';
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('trecho nao encontrado')));
});

test('where sem snippet reprova', () => {
  const inventory = base();
  delete inventory.claims[0].where[0].snippet;
  const errors = validateClaims(inventory, read);
  assert.ok(errors.some((error) => error.includes('sem snippet')));
});

test('prova ausente ou inexistente reprova', () => {
  const semArquivo = base();
  delete semArquivo.claims[0].evidence.file;
  assert.ok(validateClaims(semArquivo, read).some((error) => error.includes('sem arquivo de prova')));

  const arquivoErrado = base();
  arquivoErrado.claims[0].evidence.file = 'src/nao-existe.ts';
  assert.ok(validateClaims(arquivoErrado, read).some((error) => error.includes('prova aponta arquivo inexistente')));

  const padraoErrado = base();
  padraoErrado.claims[0].evidence.pattern = 'export const y';
  assert.ok(validateClaims(padraoErrado, read).some((error) => error.includes('prova nao encontrada')));
});

test('evidence sem pattern aceita (prova e a existencia do arquivo)', () => {
  const inventory = base();
  delete inventory.claims[0].evidence.pattern;
  assert.deepEqual(validateClaims(inventory, read), []);
});

test('afirmacao de ausencia passa quando o provedor nao existe no codigo', () => {
  const inventory = base();
  inventory.claims[0].evidence = {
    absenceOf: { roots: ['src'], pattern: 'stripe|pagarme|payment_intent' },
  };
  const files = ['src/a.tsx', 'src/b.tsx'];
  assert.deepEqual(validateClaims(inventory, read, () => files), []);
});

test('afirmacao de ausencia reprova quando aparece provedor de pagamento', () => {
  const inventory = base();
  inventory.claims[0].evidence = {
    absenceOf: { roots: ['src'], pattern: 'stripe|pagarme|payment_intent' },
  };
  const comStripe = { ...FILES, 'src/pagamento.tsx': ['const key = "pk_live_stripe";'] };
  const comStripeRead = (file) => (file in comStripe ? comStripe[file] : null);
  const errors = validateClaims(inventory, comStripeRead, () => ['src/pagamento.tsx']);
  assert.ok(errors.some((error) => /prova de ausencia quebrada/.test(error)), errors.join('; '));
  assert.ok(errors.some((error) => error.includes('src/pagamento.tsx:1')), errors.join('; '));
});

test('afirmacao de ausencia sem roots ou com pattern invalido reprova', () => {
  const semRoots = base();
  semRoots.claims[0].evidence = { absenceOf: { roots: [], pattern: 'stripe' } };
  assert.ok(validateClaims(semRoots, read, () => []).some((error) => /absenceOf sem roots/.test(error)));

  const patternRuim = base();
  patternRuim.claims[0].evidence = { absenceOf: { roots: ['src'], pattern: '(stripe' } };
  assert.ok(validateClaims(patternRuim, read, () => []).some((error) => /pattern invalido/.test(error)));
});

test('CLI reprova quando o inventario do repositorio quebra', () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, ['scripts/validate-commercial-claims.mjs'], {
        cwd: new URL('..', import.meta.url).pathname,
        env: { ...process.env, CLAIMS_INVENTORY: 'docs/inventario-afirmacoes/nao-existe.json' },
        stdio: 'pipe',
      }),
    /Command failed/,
  );
});

test('inventario real do repositorio esta integro', async () => {
  const { readInventoryFromDisk } = await import('../scripts/validate-commercial-claims.mjs');
  const inventory = readInventoryFromDisk();
  assert.deepEqual(validateClaims(inventory), []);
  assert.ok(inventory.claims.length >= 8, 'inventario deveria cobrir as afirmacoes principais');
});
