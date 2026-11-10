import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('scripts/stage-app-shell.mjs');
const generated = 'app-shell.generated.html';
const validShell = '<!doctype html><html lang="pt-BR"><head><script type="module" crossorigin src="/assets/index-0a1b2c3d.js"></script></head><body><div id="root"></div></body></html>';
const workspaces = [];

function workspace({ html = validShell, withApi = true, prefix = 'promo-app-shell-' } = {}) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  workspaces.push(root);
  if (html !== null) {
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist', 'index.html'), html);
  }
  if (withApi) mkdirSync(join(root, 'api', '_lib'), { recursive: true });
  return root;
}

const stage = (root) => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
const staged = (root) => readFileSync(join(root, 'api', '_lib', generated));

function assertRejected(result, pattern) {
  assert.equal(result.status, 1, result.stdout);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, pattern);
  assert.equal(result.stderr.trimEnd().split('\n').length, 1, result.stderr);
}

test.after(() => {
  for (const root of workspaces.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('copia o HTML do build byte a byte e não deixa arquivo temporário', () => {
  const html = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(validShell.replaceAll('><', '>\r\n<')), Buffer.from([0xff, 0xfe])]);
  const root = workspace({ html, prefix: 'promo app shell ção-' });

  const first = stage(root);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout, 'App shell gerado e preparado para as funções serverless.\n');
  assert.equal(first.stderr, '');
  assert.ok(staged(root).equals(html));

  const second = stage(root);
  assert.equal(second.status, 0, second.stderr);
  assert.ok(staged(root).equals(html));
  assert.deepEqual(readdirSync(join(root, 'api', '_lib')), [generated]);
});

test('aceita as variações de marcação que a função serverless aceita', () => {
  for (const html of [
    "<div id='root'></div><script type=\"module\" src='/assets/a.js'></script>",
    '<DIV ID="root" class="app"></DIV><SCRIPT SRC="/assets/a.js"></SCRIPT>',
    '<div\n  id="root"></div><script defer crossorigin src="/assets/a.js"></script>',
  ]) {
    assert.equal(stage(workspace({ html })).status, 0, html);
  }
});

test('reprova build sem root ou sem script de /assets e não grava o destino', () => {
  for (const html of [
    '',
    '<script type="module" src="/assets/a.js"></script>',
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
    '<div id="root"></div><script type="module" src="./assets/a.js"></script>',
    '<div id="root"></div><link rel="modulepreload" href="/assets/a.js">',
    '<div class="app" id="app"></div><script type="module" src="/assets/a.js"></script>',
  ]) {
    const root = workspace({ html });
    assertRejected(stage(root), /^O build não gerou um app shell válido para as funções serverless\.\n$/);
    assert.equal(existsSync(join(root, 'api', '_lib', generated)), false, html);
  }
});

test('reprova página de proteção da Vercel, que a função recusaria com 503', () => {
  for (const marker of ['<title>Log in to Vercel</title>', '<h1>Protected Deployment</h1>', '<p>log in to vercel</p>']) {
    const root = workspace({ html: `${marker}${validShell}` });
    assertRejected(stage(root), /^O build não gerou um app shell válido para as funções serverless\.\n$/);
    assert.equal(existsSync(join(root, 'api', '_lib', generated)), false, marker);
  }
});

test('valida com as mesmas expressões de isValidAppShell em api/_lib/publicProductPage.ts', () => {
  const runtime = readFileSync(resolve('api/_lib/publicProductPage.ts'), 'utf8');
  const body = runtime.match(/function isValidAppShell\([^)]*\)[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  const expressions = body.match(/\/(?:\\.|[^/\n\\])+\/[a-z]*/g) ?? [];
  assert.equal(expressions.length, 3, 'isValidAppShell mudou de forma: revise scripts/stage-app-shell.mjs e este teste.');
  const source = readFileSync(script, 'utf8');
  for (const expression of expressions) {
    assert.ok(source.includes(expression), `scripts/stage-app-shell.mjs não aplica ${expression}`);
  }
});

test('shell inválido não substitui um shell já preparado', () => {
  const root = workspace({ html: '<div id="root"></div>' });
  writeFileSync(join(root, 'api', '_lib', generated), validShell);
  assertRejected(stage(root), /app shell válido/);
  assert.equal(staged(root).toString(), validShell);
  assert.deepEqual(readdirSync(join(root, 'api', '_lib')), [generated]);
});

test('erros de leitura e gravação nomeiam o arquivo e o código do sistema', () => {
  assertRejected(stage(workspace({ html: null })), /^Não foi possível ler dist\/index\.html \(ENOENT\): rode `vite build`/);

  const directoryAsSource = workspace({ html: null });
  mkdirSync(join(directoryAsSource, 'dist', 'index.html'), { recursive: true });
  assertRejected(stage(directoryAsSource), /^Não foi possível ler dist\/index\.html \(EISDIR\)/);

  assertRejected(stage(workspace({ withApi: false })), /^Não foi possível gravar api\/_lib\/app-shell\.generated\.html \(ENOENT\)/);

  const directoryAsDestination = workspace();
  mkdirSync(join(directoryAsDestination, 'api', '_lib', generated));
  assertRejected(stage(directoryAsDestination), /^Não foi possível gravar api\/_lib\/app-shell\.generated\.html \(/);
  assert.deepEqual(readdirSync(join(directoryAsDestination, 'api', '_lib')), [generated]);
});

test('destino que é symlink é substituído, sem escrever no alvo do link', () => {
  const root = workspace();
  const outside = join(root, 'fora.txt');
  writeFileSync(outside, 'intocado');
  symlinkSync(outside, join(root, 'api', '_lib', generated));

  assert.equal(stage(root).status, 0);
  assert.equal(readFileSync(outside, 'utf8'), 'intocado');
  assert.equal(staged(root).toString(), validShell);
});

test('execuções concorrentes terminam com um shell íntegro', async () => {
  const html = `${validShell}<!--${'x'.repeat(2 * 1024 * 1024)}-->`;
  const root = workspace({ html });
  const codes = await Promise.all(Array.from({ length: 8 }, () => new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [script], { cwd: root, stdio: 'ignore' });
    child.on('error', rejectRun);
    child.on('close', resolveRun);
  })));

  assert.deepEqual(codes, Array(8).fill(0));
  assert.equal(staged(root).toString(), html);
  assert.deepEqual(readdirSync(join(root, 'api', '_lib')), [generated]);
});
