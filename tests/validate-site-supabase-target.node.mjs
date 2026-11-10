import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// db:site:guard é a última barreira antes de `supabase db push`: tem de falhar fechado.
// O script lê o vínculo relativo à própria localização, então cada caso roda uma cópia
// dele numa árvore temporária com o mesmo layout — o vínculo real do repositório não é tocado.

const SCRIPT = fileURLToPath(new URL('../scripts/validate-site-supabase-target.mjs', import.meta.url));
const SITE = 'xlzmclcjdncjfdrjxclt';
const CANONICAL = 'doufsxqlfjyuvxuezpln';
const BLOCKED = new RegExp(`^BLOQUEADO: migrations do site só podem ser aplicadas no projeto isolado ${SITE}\\.\\n`);

function guard(t, projectRef, { env = {}, cwd, asDirectory = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site guard é-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'validate-site-supabase-target.mjs'));
  if (projectRef !== null) {
    const temp = path.join(root, 'site-supabase', 'supabase', '.temp');
    fs.mkdirSync(temp, { recursive: true });
    if (asDirectory) fs.mkdirSync(path.join(temp, 'project-ref'));
    else fs.writeFileSync(path.join(temp, 'project-ref'), projectRef);
  }
  const cleanEnv = { ...process.env };
  delete cleanEnv.SUPABASE_PROJECT_ID;
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-site-supabase-target.mjs')], {
    cwd: cwd ?? root,
    env: { ...cleanEnv, ...env },
    encoding: 'utf8',
  });
}

function assertBlocked(result, detail) {
  assert.equal(result.status, 1, `deveria bloquear: ${result.stdout}`);
  assert.equal(result.stdout, '', 'nada em stdout quando bloqueia');
  assert.match(result.stderr, BLOCKED);
  if (detail) assert.match(result.stderr, detail);
}

test('aprova somente o projeto isolado do site, com código 0 e o ref em stdout', (t) => {
  for (const content of [SITE, `${SITE}\n`, `${SITE}\r\n`, `  ${SITE}  \n`]) {
    const result = guard(t, content);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `Destino isolado validado: ${SITE}\n`);
    assert.equal(result.stderr, '');
  }
});

test('independe do diretório de onde é chamado', (t) => {
  assert.equal(guard(t, SITE, { cwd: os.tmpdir() }).status, 0);
  assertBlocked(guard(t, CANONICAL, { cwd: os.tmpdir() }));
});

test('bloqueia o catálogo canônico e diz como refazer o vínculo', (t) => {
  assertBlocked(guard(t, `${CANONICAL}\n`), new RegExp(`catálogo canônico ${CANONICAL} \\(somente leitura.*link --project-ref ${SITE}`));
});

test('bloqueia qualquer conteúdo que não seja exatamente o ref do site', (t) => {
  for (const content of [
    '',
    '\n',
    'abcdefghijklmnopqrst',
    SITE.toUpperCase(),
    SITE.slice(0, 19),
    `${SITE}x`,
    `${SITE}\n${CANONICAL}\n`,
    `${CANONICAL}\n${SITE}\n`,
    `${SITE} ${CANONICAL}`,
    `"${SITE}"`,
    `{"ref":"${SITE}"}`,
    `https://${SITE}.supabase.co`,
    `${SITE}\u0000`,
    'x'.repeat(1_000_000),
  ]) {
    assertBlocked(guard(t, content));
  }
});

test('não ecoa conteúdo fora do formato de project ref (pode ser segredo colado no lugar errado)', (t) => {
  const result = guard(t, 'sb_secret_fixture-nao-e-credencial-real');
  assertBlocked(result, /não tem o formato de um project ref/);
  assert.doesNotMatch(result.stderr, /sb_secret_fixture/);
});

test('vínculo ausente ou ilegível falha fechado com código 1', (t) => {
  const missing = guard(t, null);
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /ainda não foi vinculado.*docs\/SITE_SUPABASE_SETUP\.md/);
  assertBlocked(guard(t, '', { asDirectory: true }), /Não foi possível ler o vínculo .*\(EISDIR\)/);
});

test('bloqueia SUPABASE_PROJECT_ID apontando para outro projeto: no CLI ela vence o arquivo de vínculo', (t) => {
  assertBlocked(
    guard(t, SITE, { env: { SUPABASE_PROJECT_ID: CANONICAL } }),
    new RegExp(`SUPABASE_PROJECT_ID aponta para o catálogo canônico ${CANONICAL}.*unset SUPABASE_PROJECT_ID`),
  );
  assertBlocked(guard(t, SITE, { env: { SUPABASE_PROJECT_ID: 'abcdefghijklmnopqrst' } }), /outro projeto \(abcdefghijklmnopqrst\)/);
  assertBlocked(guard(t, SITE, { env: { SUPABASE_PROJECT_ID: ` ${SITE}` } }), /não tem o formato de um project ref/);
  const leaked = guard(t, SITE, { env: { SUPABASE_PROJECT_ID: 'sbp_fixture-nao-e-credencial-real' } });
  assertBlocked(leaked);
  assert.doesNotMatch(leaked.stderr, /sbp_fixture/);
});

test('SUPABASE_PROJECT_ID vazia ou igual ao projeto do site não bloqueia; não substitui vínculo errado', (t) => {
  assert.equal(guard(t, SITE, { env: { SUPABASE_PROJECT_ID: '' } }).status, 0);
  assert.equal(guard(t, SITE, { env: { SUPABASE_PROJECT_ID: SITE } }).status, 0);
  assertBlocked(guard(t, CANONICAL, { env: { SUPABASE_PROJECT_ID: SITE } }));
  assert.equal(guard(t, null, { env: { SUPABASE_PROJECT_ID: SITE } }).status, 1);
});
