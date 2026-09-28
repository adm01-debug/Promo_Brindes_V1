import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
  for (const value of [
    'http://promo-brindes-v1-abc-juca1.vercel.app',
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
