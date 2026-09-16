import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'generate-site-api-jwt.mjs');

function base64urlDecode(segment) {
  const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

test('falha com mensagem clara quando SITE_SUPABASE_JWT_SECRET não está definido', () => {
  assert.throws(() => execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: '' }, stdio: 'pipe' }));
});

test('gera um JWT HS256 válido com role:site_api, verificável com o mesmo segredo (nunca um segredo real: fixture de teste)', () => {
  const fakeSecret = 'fixture-secret-nao-e-uma-credencial-real-so-para-este-teste';
  const output = execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: fakeSecret }, stdio: 'pipe' }).toString().trim();

  const parts = output.split('.');
  assert.equal(parts.length, 3, 'JWT tem header.payload.signature');

  const header = JSON.parse(base64urlDecode(parts[0]).toString('utf8'));
  assert.deepEqual(header, { alg: 'HS256', typ: 'JWT' });

  const payload = JSON.parse(base64urlDecode(parts[1]).toString('utf8'));
  assert.equal(payload.role, 'site_api');
  assert.equal(payload.ref, 'xlzmclcjdncjfdrjxclt');
  assert.equal(payload.iss, 'supabase');
  assert.ok(payload.exp > payload.iat, 'expira no futuro');
  assert.ok(payload.exp - payload.iat > 365 * 24 * 60 * 60, 'validade de vários anos (chave de serviço de longa duração, como as legadas)');

  const expectedSignature = createHmac('sha256', fakeSecret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  assert.equal(parts[2], expectedSignature, 'assinatura HS256 confere ao recalcular com o mesmo segredo');
});

test('segredos diferentes produzem assinaturas diferentes para o mesmo payload (não é uma constante disfarçada)', () => {
  const outputA = execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-a' }, stdio: 'pipe' }).toString().trim();
  const outputB = execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-b' }, stdio: 'pipe' }).toString().trim();
  const [, , sigA] = outputA.split('.');
  const [, , sigB] = outputB.split('.');
  assert.notEqual(sigA, sigB);
});
