import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
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
  assert.match(payload.jti, /^[0-9a-f-]{36}$/i);
  assert.ok(payload.exp > payload.iat, 'expira no futuro');
  assert.equal(payload.exp - payload.iat, 30 * 24 * 60 * 60, 'validade padrão é curta e rotacionável');

  const expectedSignature = createHmac('sha256', fakeSecret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  assert.equal(parts[2], expectedSignature, 'assinatura HS256 confere ao recalcular com o mesmo segredo');
});

test('permite TTL explícito apenas dentro do teto operacional de 90 dias', () => {
  const fakeSecret = 'fixture-secret-nao-e-uma-credencial-real-so-para-este-teste';
  const output = execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: fakeSecret, SITE_SUPABASE_JWT_TTL_DAYS: '7' }, stdio: 'pipe' }).toString().trim();
  const payload = JSON.parse(base64urlDecode(output.split('.')[1]).toString('utf8'));
  assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
  assert.throws(() => execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: fakeSecret, SITE_SUPABASE_JWT_TTL_DAYS: '3650' }, stdio: 'pipe' }));
});

test('segredos diferentes produzem assinaturas diferentes para o mesmo payload (não é uma constante disfarçada)', () => {
  const outputA = execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-a' }, stdio: 'pipe' }).toString().trim();
  const outputB = execFileSync('node', [SCRIPT], { env: { ...process.env, SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-b' }, stdio: 'pipe' }).toString().trim();
  const [, , sigA] = outputA.split('.');
  const [, , sigB] = outputB.split('.');
  assert.notEqual(sigA, sigB);
});

function run(env = {}, args = []) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.SITE_SUPABASE_JWT_SECRET;
  delete cleanEnv.SITE_SUPABASE_JWT_TTL_DAYS;
  return spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...cleanEnv, ...env }, encoding: 'utf8' });
}

test('stdout contém somente o JWT; avisos e instruções vão para stderr e nunca repetem o segredo', () => {
  const fakeSecret = 'fixture-secret-nao-e-uma-credencial-real-so-para-este-teste';
  const result = run({ SITE_SUPABASE_JWT_SECRET: `  ${fakeSecret}\n` });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^[\w-]+\.[\w-]+\.[\w-]+\n$/);
  assert.match(result.stderr, /Token gerado para role=site_api, ref=xlzmclcjdncjfdrjxclt, TTL=30 dias, expira em \d{4}-\d{2}-\d{2}\./);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(fakeSecret));
  const [headerAndPayload, signature] = [result.stdout.trim().split('.').slice(0, 2).join('.'), result.stdout.trim().split('.')[2]];
  assert.equal(signature, createHmac('sha256', fakeSecret).update(headerAndPayload).digest('base64url'), 'espaços em volta do segredo são descartados antes de assinar');
});

test('segredo ausente, vazio ou só com espaços sai com código 1, sem token em stdout', () => {
  for (const env of [{}, { SITE_SUPABASE_JWT_SECRET: '' }, { SITE_SUPABASE_JWT_SECRET: ' \t\n' }]) {
    const result = run(env);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Defina SITE_SUPABASE_JWT_SECRET/);
  }
});

test('TTL fora do intervalo ou não inteiro sai com código 1; limites 1 e 90 são aceitos', () => {
  const secret = { SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-ttl' };
  for (const ttl of ['0', '-1', '91', '1.5', 'abc', '7 dias', 'Infinity', 'NaN']) {
    const result = run({ ...secret, SITE_SUPABASE_JWT_TTL_DAYS: ttl });
    assert.equal(result.status, 1, `TTL=${ttl}`);
    assert.equal(result.stdout, '', `TTL=${ttl}`);
    assert.match(result.stderr, /SITE_SUPABASE_JWT_TTL_DAYS deve ser um inteiro entre 1 e 90/);
  }
  for (const [ttl, days] of [['1', 1], ['90', 90], [' 7 ', 7], ['', 30]]) {
    const result = run({ ...secret, SITE_SUPABASE_JWT_TTL_DAYS: ttl });
    assert.equal(result.status, 0, `TTL=${JSON.stringify(ttl)}: ${result.stderr}`);
    const payload = JSON.parse(base64urlDecode(result.stdout.trim().split('.')[1]).toString('utf8'));
    assert.equal(payload.exp - payload.iat, days * 24 * 60 * 60);
    assert.ok(Math.abs(payload.iat - Date.now() / 1000) < 60, 'iat é o instante da geração');
  }
});

test('recusa chave de API colada no lugar do Legacy JWT Secret, sem ecoar o valor', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  for (const wrong of [`${header}.${payload}.assinatura-fixture`, 'sb_secret_fixture-nao-e-credencial', 'sb_publishable_fixture']) {
    const result = run({ SITE_SUPABASE_JWT_SECRET: wrong });
    assert.equal(result.status, 1, wrong);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /parece uma chave de API/);
    assert.doesNotMatch(result.stderr, /fixture/);
  }
});

test('--help mostra o uso sem exigir segredo; argumento desconhecido é erro e não gera token', () => {
  for (const flag of ['--help', '-h']) {
    const help = run({}, [flag]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /^Uso: SITE_SUPABASE_JWT_SECRET=/);
    assert.equal(help.stderr, '');
  }
  const unknown = run({ SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-args' }, ['7']);
  assert.equal(unknown.status, 1);
  assert.equal(unknown.stdout, '');
  assert.match(unknown.stderr, /^Argumento não reconhecido: 7\n/);
});

test('cada execução gera um jti novo', () => {
  const jti = () => JSON.parse(base64urlDecode(run({ SITE_SUPABASE_JWT_SECRET: 'segredo-fixture-jti' }).stdout.trim().split('.')[1]).toString('utf8')).jti;
  assert.notEqual(jti(), jti());
});
