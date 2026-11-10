import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { normalizeVercelDeploymentUrl } from '../scripts/normalize-vercel-deployment-url.mjs';

test('adiciona https somente quando a CLI devolve hostname', () => {
  assert.equal(
    normalizeVercelDeploymentUrl('promo-brindes-v1-abc-juca1.vercel.app'),
    'https://promo-brindes-v1-abc-juca1.vercel.app',
  );
});

test('preserva URL https já completa sem duplicar o protocolo', () => {
  assert.equal(
    normalizeVercelDeploymentUrl('https://promo-brindes-v1-abc-juca1.vercel.app'),
    'https://promo-brindes-v1-abc-juca1.vercel.app',
  );
});

test('recusa protocolo, credencial, porta, caminho e domínio inesperados', () => {
  const insecureUrl = ['http', '://promo-brindes-v1-abc-juca1.vercel.app'].join('');
  for (const value of [
    insecureUrl,
    'https://usuario@promo-brindes-v1-abc-juca1.vercel.app',
    'https://promo-brindes-v1-abc-juca1.vercel.app:8443',
    'https://promo-brindes-v1-abc-juca1.vercel.app/rota',
    'https://promo-brindes-v1-abc-juca1.vercel.app?x=1',
    'https://vercel.app.evil.example',
    'https://vercel.app',
    '',
  ]) {
    assert.throws(() => normalizeVercelDeploymentUrl(value));
  }
});

test('CLI imprime exatamente uma origem normalizada', () => {
  const output = execFileSync(process.execPath, [
    'scripts/normalize-vercel-deployment-url.mjs',
    'https://promo-brindes-v1-abc-juca1.vercel.app',
  ], { encoding: 'utf8' });
  assert.equal(output, 'https://promo-brindes-v1-abc-juca1.vercel.app\n');
});

test('aceita somente rótulos DNS reais sob vercel.app', () => {
  for (const value of [
    '$(id).vercel.app',
    '`id`.vercel.app',
    '.vercel.app',
    'a..vercel.app',
    '-a.vercel.app',
    'a-.vercel.app',
    'a_b.vercel.app',
    `${'a'.repeat(64)}.vercel.app`,
    `${Array.from({ length: 5 }, () => 'a'.repeat(60)).join('.')}.vercel.app`,
    'promo-brindes-v1-abc-juca1.vercel.app.',
    'evilvercel.app',
  ]) {
    assert.throws(() => normalizeVercelDeploymentUrl(value), /fora do domínio ou formato permitido/, value);
  }
  for (const [value, expected] of [
    [' Promo-Brindes-V1-ABC-juca1.VERCEL.app\r\n', 'https://promo-brindes-v1-abc-juca1.vercel.app'],
    ['https://promo-brindes-v1-abc-juca1.vercel.app:443/', 'https://promo-brindes-v1-abc-juca1.vercel.app'],
    [`${'a'.repeat(63)}.vercel.app`, `https://${'a'.repeat(63)}.vercel.app`],
    ['a.b-1.vercel.app', 'https://a.b-1.vercel.app'],
  ]) {
    assert.equal(normalizeVercelDeploymentUrl(value), expected);
  }
});

test('CLI falha com exit 1, stdout vazio e mensagem sem stack trace', () => {
  for (const args of [[], [''], ['ftp://promo-brindes-v1-abc-juca1.vercel.app'], ['$(id).vercel.app']]) {
    const result = spawnSync(process.execPath, ['scripts/normalize-vercel-deployment-url.mjs', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^URL do deployment Vercel [^\n]+\n$/);
  }
});

test('CLI recusa argumento excedente em vez de ignorá-lo', () => {
  const result = spawnSync(process.execPath, [
    'scripts/normalize-vercel-deployment-url.mjs',
    'promo-brindes-v1-abc-juca1.vercel.app',
    'outro.vercel.app',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /exatamente um argumento/);
});

test('CLI responde quando o script é chamado por um caminho com symlink', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'promo-release-url-'));
  try {
    const linkedScripts = join(workspace, 'scripts');
    symlinkSync(resolve('scripts'), linkedScripts, 'dir');
    const linkedFile = join(workspace, 'normalize.mjs');
    symlinkSync(resolve('scripts/normalize-vercel-deployment-url.mjs'), linkedFile);
    for (const entry of [join(linkedScripts, 'normalize-vercel-deployment-url.mjs'), linkedFile]) {
      const result = spawnSync(process.execPath, [entry, 'promo-brindes-v1-abc-juca1.vercel.app'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, 'https://promo-brindes-v1-abc-juca1.vercel.app\n');
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test('importar o módulo não executa a CLI', () => {
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '-e',
    "await import('./scripts/normalize-vercel-deployment-url.mjs'); process.stdout.write('importado');",
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'importado');
});
