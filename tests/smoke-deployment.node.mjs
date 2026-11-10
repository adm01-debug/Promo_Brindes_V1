import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runSmoke } from '../scripts/smoke-deployment.mjs';

// Todo cenário roda contra um servidor HTTP local efêmero; nenhum teste toca
// um deployment real. As opções abaixo só encurtam as esperas entre tentativas.
const fast = { attempts: 3, timeoutMs: 5_000, retryDelayMs: 1 };
const impatient = { ...fast, timeoutMs: 400 };
const security = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'",
};
const shell = '<!doctype html><html><head><script type="module" src="/assets/index-0a1b2c3d.js"></script></head><body><div id="root"></div></body></html>';
const approved = (origin) => `Smoke aprovado em ${origin}: páginas HTML (CSP+X-Frame em todas as rotas), sitemap XML, Analytics 200, rota desconhecida 404, crons sem credencial 401.`;

const reply = (status, headers = security, body = '') => (request, response) => {
  response.writeHead(status, headers);
  response.end(body);
};

function healthyRoutes() {
  const page = reply(200, { ...security, 'content-type': 'text/html; charset=utf-8' }, shell);
  const cron = reply(401, { ...security, 'content-type': 'application/json' }, '{"error":"unauthorized"}');
  return {
    '/': page,
    '/catalogo': page,
    '/catalogos': page,
    '/datas-comemorativas': page,
    '/sitemap.xml': reply(200, { ...security, 'content-type': 'application/xml' }, '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>'),
    '/_vercel/insights/script.js': reply(200, { 'content-type': 'application/javascript; charset=utf-8' }, '/* analytics */'),
    '/api/retention': cron,
    '/api/notifications': cron,
  };
}

const notFound = reply(404, { ...security, 'content-type': 'text/html; charset=utf-8' }, shell);

async function deployment(overrides = {}) {
  // Map em vez de objeto: o caminho vem do request e não pode escolher propriedade.
  const routes = new Map(Object.entries({ ...healthyRoutes(), ...overrides }));
  const counts = new Map();
  const server = http.createServer((request, response) => {
    const path = request.url.split('?')[0];
    const count = (counts.get(path) ?? 0) + 1;
    counts.set(path, count);
    // A chave usada na consulta vem da lista de rotas do próprio teste, nunca do request.
    const known = [...routes.keys()].find((key) => key === path);
    const handler = known === undefined ? notFound : routes.get(known);
    handler(request, response, count);
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    get hits() { return Object.fromEntries(counts); },
    async close() {
      server.closeAllConnections();
      await new Promise((resolveClose) => server.close(resolveClose));
    },
  };
}

async function smoke(overrides, options = fast) {
  const target = await deployment(overrides);
  const logs = [];
  try {
    const result = await runSmoke(target.origin, { ...options, log: (message) => logs.push(message) });
    return { ok: true, result, logs, hits: target.hits, origin: target.origin };
  } catch (error) {
    return { ok: false, message: error.message, logs, hits: target.hits, origin: target.origin };
  } finally {
    await target.close();
  }
}

function cli(env, args = [], entry = 'scripts/smoke-deployment.mjs') {
  return new Promise((resolveRun, rejectRun) => {
    // spawn assíncrono: spawnSync travaria o servidor local deste mesmo processo.
    const child = spawn(process.execPath, [entry, ...args], { env: { PATH: process.env.PATH, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

test('aprova um deployment saudável consultando cada rota uma única vez', async () => {
  const outcome = await smoke();
  assert.equal(outcome.ok, true, outcome.message);
  assert.equal(outcome.result, approved(outcome.origin));
  assert.deepEqual(outcome.logs, []);
  assert.deepEqual(outcome.hits, {
    '/': 1,
    '/catalogo': 1,
    '/catalogos': 1,
    '/datas-comemorativas': 1,
    '/sitemap.xml': 1,
    '/rota-inexistente-smoke-20260923': 1,
    '/_vercel/insights/script.js': 1,
    '/api/retention': 1,
    '/api/notifications': 1,
  });
});

test('reprova status inesperado sem repetir a rota', async () => {
  for (const [overrides, expected, path] of [
    [{ '/': reply(404) }, '/: esperado 200, recebido 404', '/'],
    [{ '/catalogo': reply(401) }, '/catalogo: esperado 200, recebido 401', '/catalogo'],
    [{ '/catalogos': reply(429) }, '/catalogos: esperado 200, recebido 429', '/catalogos'],
    [{ '/sitemap.xml': reply(404) }, '/sitemap.xml: esperado 200, recebido 404', '/sitemap.xml'],
    [{ '/rota-inexistente-smoke-20260923': reply(200, security, shell) }, 'rota inexistente: esperado 404, recebido 200', '/rota-inexistente-smoke-20260923'],
    [{ '/_vercel/insights/script.js': reply(404) }, 'Web Analytics: esperado 200, recebido 404', '/_vercel/insights/script.js'],
    [{ '/api/retention': reply(200) }, '/api/retention: chamada sem segredo deveria retornar 401, recebeu 200', '/api/retention'],
    [{ '/api/notifications': reply(403) }, '/api/notifications: chamada sem segredo deveria retornar 401, recebeu 403', '/api/notifications'],
  ]) {
    const outcome = await smoke(overrides);
    assert.equal(outcome.ok, false, expected);
    assert.equal(outcome.message, expected);
    assert.equal(outcome.hits[path], 1);
  }
});

test('reprova header de segurança ausente ou divergente em qualquer rota HTML', async () => {
  const without = (name) => Object.fromEntries(Object.entries(security).filter(([key]) => key !== name));
  for (const [overrides, expected] of [
    [{ '/': reply(200, without('x-content-type-options'), shell) }, '/: header nosniff ausente'],
    [{ '/catalogo': reply(200, { ...security, 'x-frame-options': 'SAMEORIGIN' }, shell) }, '/catalogo: X-Frame-Options divergente'],
    [{ '/catalogos': reply(200, without('x-frame-options'), shell) }, '/catalogos: X-Frame-Options divergente'],
    [{ '/datas-comemorativas': reply(200, without('content-security-policy'), shell) }, '/datas-comemorativas: CSP ausente ou divergente'],
    [{ '/': reply(200, { ...security, 'content-security-policy': 'default-src *' }, shell) }, '/: CSP ausente ou divergente'],
    [
      { '/': reply(200, { ...without('content-security-policy'), 'content-security-policy-report-only': "default-src 'self'" }, shell) },
      '/: CSP ausente ou divergente',
    ],
    [{ '/sitemap.xml': reply(200, {}, '<?xml version="1.0"?><urlset></urlset>') }, '/sitemap.xml: header nosniff ausente'],
  ]) {
    const outcome = await smoke(overrides);
    assert.equal(outcome.ok, false, expected);
    assert.equal(outcome.message, expected);
  }
});

test('reprova corpo errado no sitemap e content-type errado no Analytics', async () => {
  for (const [overrides, expected] of [
    [{ '/sitemap.xml': reply(200, security, shell) }, '/sitemap.xml: não inicia com declaração XML'],
    [{ '/sitemap.xml': reply(200, security, '') }, '/sitemap.xml: não inicia com declaração XML'],
    [{ '/sitemap.xml': reply(200, security, '<?xml version="1.0"?><sitemapindex></sitemapindex>') }, '/sitemap.xml: elemento <urlset> ausente'],
    [{ '/_vercel/insights/script.js': reply(200, { 'content-type': 'text/html' }, shell) }, 'Web Analytics: script JavaScript ausente'],
    [{ '/_vercel/insights/script.js': reply(200, {}, '1') }, 'Web Analytics: script JavaScript ausente'],
  ]) {
    const outcome = await smoke(overrides);
    assert.equal(outcome.ok, false, expected);
    assert.equal(outcome.message, expected);
  }
});

test('repete 5xx e aprova quando o deployment se recupera', async () => {
  const flaky = (request, response, hit) => (hit < 3 ? reply(503)(request, response) : healthyRoutes()['/'](request, response));
  const outcome = await smoke({ '/': flaky });
  assert.equal(outcome.ok, true, outcome.message);
  assert.equal(outcome.hits['/'], 3);
  assert.deepEqual(outcome.logs, ['/: HTTP 503 — tentativa 1/3, repetindo.', '/: HTTP 503 — tentativa 2/3, repetindo.']);
});

test('5xx persistente reprova com caminho, status e número de tentativas', async () => {
  for (const [path, label] of [['/', '/'], ['/sitemap.xml', '/sitemap.xml'], ['/api/notifications', '/api/notifications']]) {
    const outcome = await smoke({ [path]: reply(500) });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.message, `${label}: HTTP 500 (após 3 tentativas)`);
    assert.equal(outcome.hits[path], 3);
  }
});

test('rota que nunca responde reprova por timeout com o caminho na mensagem', async () => {
  const outcome = await smoke({ '/catalogo': () => {} }, impatient);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, '/catalogo: sem resposta completa em 400 ms (após 3 tentativas)');
  assert.equal(outcome.hits['/catalogo'], 3);
});

test('corpo do sitemap que trava é repetido e reprova com o caminho na mensagem', async () => {
  const stalled = (request, response) => {
    response.writeHead(200, security);
    response.write('<?xml version="1.0"?>');
  };
  const outcome = await smoke({ '/sitemap.xml': stalled }, impatient);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, '/sitemap.xml: sem resposta completa em 400 ms (após 3 tentativas)');
  assert.equal(outcome.hits['/sitemap.xml'], 3);

  const recovers = (request, response, hit) => (hit === 1 ? stalled(request, response) : healthyRoutes()['/sitemap.xml'](request, response));
  const recovered = await smoke({ '/sitemap.xml': recovers }, { ...fast, timeoutMs: 1_000 });
  assert.equal(recovered.ok, true, recovered.message);
  assert.equal(recovered.hits['/sitemap.xml'], 2);
  assert.deepEqual(recovered.logs, ['/sitemap.xml: sem resposta completa em 1000 ms — tentativa 1/3, repetindo.']);
});

test('conexão derrubada e porta fechada reprovam com o caminho e a causa de rede', async () => {
  const dropped = await smoke({ '/': (request) => request.socket.destroy() });
  assert.equal(dropped.ok, false);
  assert.match(dropped.message, /^\/: .+ \(após 3 tentativas\)$/);
  assert.equal(dropped.hits['/'], 3);

  const closed = await deployment();
  await closed.close();
  await assert.rejects(runSmoke(closed.origin, fast), /^Error: \/: fetch failed.* \(após 3 tentativas\)$/);
});

test('segue redirecionamento e registra aviso quando outra origem responde', async () => {
  const sameOrigin = await smoke({ '/catalogos': reply(308, { location: '/catalogo' }) });
  assert.equal(sameOrigin.ok, true, sameOrigin.message);
  assert.deepEqual(sameOrigin.logs, []);

  const other = await deployment();
  try {
    const crossOrigin = await smoke({ '/catalogo': reply(302, { location: `${other.origin}/catalogo` }) });
    assert.equal(crossOrigin.ok, true, crossOrigin.message);
    assert.deepEqual(crossOrigin.logs, [`Aviso: /catalogo foi respondido por ${other.origin} após redirecionamento.`]);
  } finally {
    await other.close();
  }

  const loop = await smoke({ '/': reply(302, { location: '/' }) });
  assert.equal(loop.ok, false);
  assert.match(loop.message, /^\/: fetch failed.* \(após 3 tentativas\)$/);
});

test('corpo HTML interminável não segura o veredito', async () => {
  const endless = (request, response) => {
    response.writeHead(200, { ...security, 'content-type': 'text/html' });
    const timer = setInterval(() => response.write('x'.repeat(1024)), 5);
    response.on('close', () => clearInterval(timer));
  };
  const started = Date.now();
  const outcome = await smoke({ '/': endless, '/catalogo': endless }, { ...fast, timeoutMs: 5_000 });
  assert.equal(outcome.ok, true, outcome.message);
  assert.ok(Date.now() - started < 4_000, 'o smoke esperou o corpo que não precisava ler');
});

test('recusa base ausente, malformada ou com esquema sem rede antes de qualquer requisição', async () => {
  for (const value of [undefined, null, '', '   ', 42]) {
    await assert.rejects(runSmoke(value, fast), /^Error: SMOKE_BASE_URL ausente\.$/);
  }
  await assert.rejects(runSmoke('promo-brindes-v1.vercel.app', fast), /^Error: SMOKE_BASE_URL inválida: informe a URL completa/);
  for (const value of ['file:///etc/passwd', 'ftp://promo-brindes-v1.vercel.app', 'javascript:alert(1)']) {
    await assert.rejects(runSmoke(value, fast), /^Error: SMOKE_BASE_URL deve usar https/);
  }
});

test('usa somente a origem da base, ignorando espaços, caminho, query e credenciais', async () => {
  const target = await deployment();
  try {
    const decorated = `  ${target.origin.replace('http://', 'http://usuario:senha@')}/preview/x?y=1#z\n`;
    assert.equal(await runSmoke(decorated, fast), approved(target.origin));
    assert.equal(target.hits['/preview/x'], undefined);
  } finally {
    await target.close();
  }
});

test('CLI imprime só a linha de aprovação em stdout e sai com 0', async () => {
  const target = await deployment();
  try {
    const result = await cli({ SMOKE_BASE_URL: target.origin });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${approved(target.origin)}\n`);
    assert.equal(result.stderr, '');
  } finally {
    await target.close();
  }
});

test('CLI reprova com exit 1, stdout vazio e uma linha sem stack trace', async () => {
  const target = await deployment({ '/': reply(404) });
  try {
    const result = await cli({ SMOKE_BASE_URL: target.origin });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Smoke reprovado: /: esperado 200, recebido 404\n');
  } finally {
    await target.close();
  }

  for (const [env, expected] of [
    [{}, 'Smoke reprovado: SMOKE_BASE_URL ausente.\n'],
    [{ SMOKE_BASE_URL: '  ' }, 'Smoke reprovado: SMOKE_BASE_URL ausente.\n'],
    [{ SMOKE_BASE_URL: 'promo-brindes-v1.vercel.app' }, 'Smoke reprovado: SMOKE_BASE_URL inválida: informe a URL completa do deployment, começando por https://.\n'],
  ]) {
    const result = await cli(env);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, expected);
  }
});

test('CLI responde a --help sem rede e recusa argumento desconhecido', async () => {
  for (const flag of ['--help', '-h']) {
    const help = await cli({}, [flag]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /^Uso: SMOKE_BASE_URL=/);
    assert.equal(help.stderr, '');
  }

  const target = await deployment();
  try {
    const unknown = await cli({ SMOKE_BASE_URL: target.origin }, ['https://outro.vercel.app']);
    assert.equal(unknown.status, 1);
    assert.equal(unknown.stdout, '');
    assert.match(unknown.stderr, /^Argumento não reconhecido: https:\/\/outro\.vercel\.app\nUso: /);
    assert.deepEqual(target.hits, {});
  } finally {
    await target.close();
  }
});

test('CLI roda quando o script é chamado por symlink', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'promo-smoke-'));
  const target = await deployment();
  try {
    const linked = join(workspace, 'smoke.mjs');
    symlinkSync(resolve('scripts/smoke-deployment.mjs'), linked);
    const result = await cli({ SMOKE_BASE_URL: target.origin }, [], linked);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${approved(target.origin)}\n`);
  } finally {
    await target.close();
    rmSync(workspace, { recursive: true, force: true });
  }
});
