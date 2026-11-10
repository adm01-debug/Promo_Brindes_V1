import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('scripts/check-performance-budget.mjs');
const workspaces = [];

// O script localiza dist/ a partir do próprio caminho; cada cenário roda uma
// cópia dele dentro de um workspace temporário com um dist/ sintético.
const compressible = (kib) => Buffer.alloc(Math.round(kib * 1024), 'a');
function incompressible(kib) {
  const size = Math.round(kib * 1024);
  const blocks = [];
  for (let index = 0; index * 32 < size; index += 1) blocks.push(createHash('sha256').update(String(index)).digest());
  return Buffer.concat(blocks).subarray(0, size);
}

const entryOnly = (file, extra = {}) => ({ 'index.html': { file: `assets/${file}`, isEntry: true, ...extra } });

function check({ files, manifest, prefix = 'promo-budget-', setup } = {}) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  workspaces.push(root);
  mkdirSync(join(root, 'scripts'));
  copyFileSync(script, join(root, 'scripts', 'check-performance-budget.mjs'));
  if (files) {
    mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
    for (const [name, contents] of Object.entries(files)) writeFileSync(join(root, 'dist', 'assets', name), contents);
  }
  if (manifest !== undefined) {
    mkdirSync(join(root, 'dist', '.vite'), { recursive: true });
    writeFileSync(join(root, 'dist', '.vite', 'manifest.json'), typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  }
  setup?.(root);
  // cwd fora do workspace: o script não pode depender do diretório corrente.
  return spawnSync(process.execPath, [join(root, 'scripts', 'check-performance-budget.mjs')], { cwd: tmpdir(), encoding: 'utf8' });
}

function assertRejected(result, pattern) {
  assert.equal(result.status, 1, result.stdout);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, pattern);
  assert.equal(result.stderr.trimEnd().split('\n').length, 1, result.stderr);
}

const healthy = () => ({
  files: {
    'index-0a1b2c3d.js': compressible(10),
    'vendor-4e5f6a7b.js': compressible(5),
    'Page-8c9d0e1f.js': compressible(3),
    'index-2a3b4c5d.css': compressible(2),
  },
  manifest: {
    'index.html': { file: 'assets/index-0a1b2c3d.js', isEntry: true, imports: ['_vendor-4e5f6a7b.js'], dynamicImports: ['src/Page.tsx'], css: ['assets/index-2a3b4c5d.css'] },
    '_vendor-4e5f6a7b.js': { file: 'assets/vendor-4e5f6a7b.js' },
    'src/Page.tsx': { file: 'assets/Page-8c9d0e1f.js', isDynamicEntry: true, imports: ['_vendor-4e5f6a7b.js', 'index.html'] },
  },
});

test.after(() => {
  for (const workspace of workspaces.splice(0)) rmSync(workspace, { recursive: true, force: true });
});

test('aprova um dist coerente e imprime o resumo em uma linha de stdout', () => {
  const result = check(healthy());
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(
    result.stdout,
    /^Orçamento de assets aprovado: CSS 2\.0 KiB \/ \d+\.\d KiB Brotli; JS 18\.0 KiB \/ \d+\.\d KiB Brotli; entrada 10\.0 KiB \/ \d+\.\d KiB Brotli; inicial \d+\.\d KiB Brotli; maior chunk assíncrono \d+\.\d KiB Brotli\.\n$/,
  );
});

test('é determinístico e funciona em caminho com espaço e acento', () => {
  const first = check({ ...healthy(), prefix: 'promo budget ção-' });
  const second = check(healthy());
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.stdout, first.stdout);
});

test('mede a entrada declarada no manifest mesmo quando ela não se chama index-*', () => {
  const result = check({ files: { 'main-0a1b2c3d.js': compressible(320) }, manifest: entryOnly('main-0a1b2c3d.js') });
  assertRejected(result, /^Bundle de entrada: 320\.0 KiB excede o limite de 300 KiB\.\n$/);
});

test('não confunde um chunk lazy chamado index-* com a entrada', () => {
  const result = check({
    files: { 'index-aaaa1111.js': compressible(1), 'index-bbbb2222.js': compressible(320) },
    manifest: {
      'index.html': { file: 'assets/index-bbbb2222.js', isEntry: true, dynamicImports: ['node_modules/pkg/index.js'] },
      'node_modules/pkg/index.js': { file: 'assets/index-aaaa1111.js', isDynamicEntry: true },
    },
  });
  assertRejected(result, /^Bundle de entrada: 320\.0 KiB excede o limite de 300 KiB\.\n$/);
});

test('falha fechado quando o manifest aponta chunk que não foi medido', () => {
  assertRejected(
    check({ files: {}, manifest: entryOnly('index-0a1b2c3d.js') }),
    /^Chunk "index\.html" do manifest \(assets\/index-0a1b2c3d\.js\) não existe em dist\/assets/,
  );
  assertRejected(
    check({
      files: { 'index-0a1b2c3d.js': compressible(1) },
      manifest: { ...entryOnly('index-0a1b2c3d.js', { imports: ['_vendor.js'] }), '_vendor.js': { file: 'assets/vendor-sumiu.js' } },
    }),
    /^Chunk "_vendor\.js" do manifest \(assets\/vendor-sumiu\.js\) não existe em dist\/assets/,
  );
  assertRejected(
    check({ files: { 'index-0a1b2c3d.js': compressible(1) }, manifest: entryOnly('index-0a1b2c3d.js', { imports: ['_fantasma.js'] }) }),
    /^Chunk "_fantasma\.js" do manifest \(sem arquivo\) não existe em dist\/assets/,
  );
});

test('cada teto reprova com exit 1 e nomeia a métrica estourada', () => {
  const entry = { 'index-0a1b2c3d.js': compressible(1) };
  const manifest = entryOnly('index-0a1b2c3d.js');
  for (const [scenario, pattern] of [
    [{ files: { ...entry, 'a.css': compressible(181) }, manifest }, /^CSS total: 181\.0 KiB excede o limite de 180 KiB\.\n$/],
    [{ files: { ...entry, 'a.js': compressible(500), 'b.js': compressible(451) }, manifest }, /^JavaScript total: 952\.0 KiB excede o limite de 950 KiB\.\n$/],
    [{ files: { 'index-0a1b2c3d.js': compressible(301) }, manifest }, /^Bundle de entrada: 301\.0 KiB excede o limite de 300 KiB\.\n$/],
    [{ files: { ...entry, 'a.css': incompressible(33) }, manifest }, /^CSS total \(Brotli\): 33\.0 KiB excede o limite de 32 KiB\.\n$/],
    [
      { files: { ...entry, ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`lazy-${index}.js`, incompressible(49)])) }, manifest },
      /^JavaScript total \(Brotli\): 294\.\d KiB excede o limite de 267 KiB\.\n$/,
    ],
    [{ files: { 'index-0a1b2c3d.js': incompressible(91) }, manifest }, /^Bundle de entrada \(Brotli\): 91\.0 KiB excede o limite de 90 KiB\.\n$/],
    [
      {
        files: { 'index-0a1b2c3d.js': incompressible(80), 'v1.js': incompressible(40), 'v2.js': incompressible(40) },
        manifest: {
          ...entryOnly('index-0a1b2c3d.js', { imports: ['a', 'b'] }),
          a: { file: 'assets/v1.js' },
          b: { file: 'assets/v2.js', imports: ['a', 'index.html'] },
        },
      },
      /^JavaScript inicial \(Brotli\): 160\.0 KiB excede o limite de 150 KiB\.\n$/,
    ],
    [
      {
        files: { ...entry, 'lazy.js': incompressible(51) },
        manifest: { ...entryOnly('index-0a1b2c3d.js', { dynamicImports: ['l'] }), l: { file: 'assets/lazy.js', isDynamicEntry: true } },
      },
      /^Maior chunk JavaScript assíncrono \(Brotli\): 51\.0 KiB excede o limite de 50 KiB\.\n$/,
    ],
  ]) {
    assertRejected(check(scenario), pattern);
  }
});

test('valor exatamente no teto é aprovado', () => {
  const result = check({ files: { 'index-0a1b2c3d.js': compressible(300) }, manifest: entryOnly('index-0a1b2c3d.js') });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /entrada 300\.0 KiB/);
});

test('dist ou manifest ausente, inválido ou sem entrada gera erro acionável', () => {
  const files = { 'index-0a1b2c3d.js': compressible(1) };
  assertRejected(check(), /^dist\/assets não existe: rode `npm run build`/);
  assertRejected(check({ files }), /^dist\/\.vite\/manifest\.json não existe: rode `npm run build`/);
  assertRejected(check({ files, manifest: '{' }), /^dist\/\.vite\/manifest\.json não é um JSON válido: /);
  assertRejected(check({ files, manifest: 'null' }), /^dist\/\.vite\/manifest\.json não tem o formato de manifest do Vite\.\n$/);
  assertRejected(check({ files, manifest: '[]' }), /^dist\/\.vite\/manifest\.json não tem o formato de manifest do Vite\.\n$/);
  assertRejected(check({ files, manifest: { 'src/x.ts': { file: 'assets/index-0a1b2c3d.js' } } }), /^Manifest do Vite sem entrada principal\.\n$/);
  assertRejected(check({ files, manifest: { quebrado: null } }), /^Manifest do Vite sem entrada principal\.\n$/);
});

test('ignora subdiretórios e mede arquivos cujo nome tem % ou #', () => {
  const result = check({
    files: { 'index-0a1b2c3d.js': compressible(1), 'chunk%41-#1.js': compressible(4), 'index.js.map': incompressible(400) },
    manifest: entryOnly('index-0a1b2c3d.js'),
    setup: (root) => mkdirSync(join(root, 'dist', 'assets', 'fonts')),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /JS 5\.0 KiB /);
});
