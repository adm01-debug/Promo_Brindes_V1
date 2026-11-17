import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { extractEnvNames, findUndocumentedEnvVars } from '../scripts/validate-env-example.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'validate-env-example.mjs');

// Mesmo formato do fixture de validate-error-catalog.node.mjs: copia o script
// para uma raiz temporaria com arvore falsa e executa a CLI de verdade, em vez
// de chamar a funcao exportada e fingir que isso cobre o encerramento.
function cliFixture(t, { apiSource, envExample }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env example é-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'api', '_lib'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'validate-env-example.mjs'));
  if (apiSource !== null) fs.writeFileSync(path.join(root, 'api', '_lib', 'fake.ts'), apiSource);
  if (envExample !== null) fs.writeFileSync(path.join(root, '.env.example'), envExample);
  const script = path.join(root, 'scripts', 'validate-env-example.mjs');
  const link = path.join(root, 'atalho.mjs');
  fs.symlinkSync(script, link);
  return { run: (scriptPath = script, cwd = os.tmpdir()) => spawnSync(process.execPath, [scriptPath], { cwd, encoding: 'utf8' }), link };
}

function leitor(arquivos) {
  return (caminho) => {
    const conteudo = arquivos[caminho];
    if (conteudo === undefined) throw new Error(`arquivo inesperado: ${caminho}`);
    return conteudo;
  };
}

test('extrai só nomes em maiúsculas de process.env', () => {
  const nomes = extractEnvNames("process.env.RESEND_API_KEY; process.env.vite_x; process.env.A1_B2;");
  assert.deepEqual([...nomes].sort(), ['A1_B2', 'RESEND_API_KEY']);
});

test('acusa variável lida por api/ e ausente do exemplo', () => {
  const faltando = findUndocumentedEnvVars(
    '/api',
    '/.env.example',
    leitor({ '/.env.example': 'RESEND_API_KEY=x\n', '/api/x.ts': 'process.env.RESEND_API_KEY; process.env.SEGREDO_NOVO;' }),
    () => ['/api/x.ts'],
  );
  assert.deepEqual(faltando, ['SEGREDO_NOVO']);
});

test('variável citada apenas em comentário conta como documentada', () => {
  const faltando = findUndocumentedEnvVars(
    '/api',
    '/.env.example',
    leitor({ '/.env.example': '# Preview: configure SITE_PREVIEW_SUPABASE_PROJECT_REF na branch.\n', '/api/x.ts': 'process.env.SITE_PREVIEW_SUPABASE_PROJECT_REF;' }),
    () => ['/api/x.ts'],
  );
  assert.deepEqual(faltando, []);
});

test('prefixo igual não cobre nome mais longo', () => {
  const faltando = findUndocumentedEnvVars(
    '/api',
    '/.env.example',
    leitor({ '/.env.example': 'CATALOG_SUPABASE_PUBLISHABLE_KEY=\n', '/api/x.ts': 'process.env.CATALOG_SUPABASE_PUBLISHABLE_KEY_V2;' }),
    () => ['/api/x.ts'],
  );
  assert.deepEqual(faltando, ['CATALOG_SUPABASE_PUBLISHABLE_KEY_V2']);
});

test('prefixo à esquerda não cobre a variável de backend', () => {
  // VITE_SITE_SUPABASE_URL é a chave do navegador; SITE_SUPABASE_URL é a
  // credencial de backend lida em api/_lib/siteDatabase.ts. Documentar uma não
  // documenta a outra.
  const faltando = findUndocumentedEnvVars(
    '/api',
    '/.env.example',
    leitor({ '/.env.example': 'VITE_SITE_SUPABASE_URL=https://x.supabase.co\n', '/api/x.ts': 'process.env.SITE_SUPABASE_URL;' }),
    () => ['/api/x.ts'],
  );
  assert.deepEqual(faltando, ['SITE_SUPABASE_URL']);
});

test('variáveis da plataforma e de teste não exigem entrada no exemplo', () => {
  const faltando = findUndocumentedEnvVars(
    '/api',
    '/.env.example',
    leitor({ '/.env.example': '', '/api/x.ts': 'process.env.VERCEL_ENV; process.env.VERCEL_URL; process.env.NODE_ENV; process.env.CI; process.env.SITE_TEST_APP_SHELL;' }),
    () => ['/api/x.ts'],
  );
  assert.deepEqual(faltando, []);
});

test('pasta sem .ts falha em vez de aprovar silenciosamente', () => {
  assert.throws(
    () => findUndocumentedEnvVars('/api', '/.env.example', leitor({ '/.env.example': '' }), () => []),
    /Nenhum arquivo \.ts encontrado/,
  );
});

test('CLI: código 0 no repositório atual', () => {
  const atual = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(atual.status, 0, atual.stderr);
  assert.match(atual.stdout, /cita todas as variáveis/);
});

test('CLI: código 0 e stdout quando está documentada; código 1 e nome em stderr quando falta', (t) => {
  const apiSource = 'const k = process.env.SEGREDO_NOVO;\n';
  const documented = cliFixture(t, { apiSource, envExample: 'SEGREDO_NOVO=\n' }).run();
  assert.equal(documented.status, 0, documented.stderr);
  assert.match(documented.stdout, /^\.env\.example cita todas as variáveis de ambiente lidas por api\//);
  assert.equal(documented.stderr, '');

  const missing = cliFixture(t, { apiSource, envExample: 'OUTRA_COISA=\n' });
  for (const scriptPath of [undefined, missing.link]) {
    const result = missing.run(scriptPath);
    assert.equal(result.status, 1, `symlink=${scriptPath === missing.link}: ${result.stdout}`);
    assert.match(result.stderr, /Variáveis lidas por api\/ e ausentes de \.env\.example:[^\n]*\n {2}- SEGREDO_NOVO\n/);
    assert.equal(result.stdout, '');
  }
});

test('CLI: exemplo ausente ou api sem .ts saem com código 1 e mensagem de uma linha', (t) => {
  const semExemplo = cliFixture(t, { apiSource: 'process.env.X_Y;\n', envExample: null }).run();
  assert.equal(semExemplo.status, 1);
  assert.match(semExemplo.stderr, /^\.env\.example não verificado: ENOENT[^\n]*\.env\.example[^\n]*\n$/);
  const semApi = cliFixture(t, { apiSource: null, envExample: '' }).run();
  assert.equal(semApi.status, 1);
  assert.match(semApi.stderr, /^\.env\.example não verificado: Nenhum arquivo \.ts encontrado[^\n]*\n$/);
});
