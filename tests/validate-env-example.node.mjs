import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { extractEnvNames, findUndocumentedEnvVars } from '../scripts/validate-env-example.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  const saida = execFileSync('node', [path.join(ROOT, 'scripts', 'validate-env-example.mjs')], { encoding: 'utf8' });
  assert.match(saida, /cita todas as variáveis/);
});

test('CLI: código 1 e nome da variável no stderr quando falta uma', () => {
  assert.throws(() => execFileSync('node', ['-e', `
    import('${path.join(ROOT, 'scripts', 'validate-env-example.mjs').replace(/\\/g, '/')}').then(async (m) => {
      const faltando = m.findUndocumentedEnvVars('/api', '/env', (p) => (p === '/env' ? '' : 'process.env.FALTA_ESSA;'), () => ['/api/a.ts']);
      if (faltando.length !== 1 || faltando[0] !== 'FALTA_ESSA') throw new Error('esperava FALTA_ESSA');
      process.exit(3);
    });
  `], { encoding: 'utf8' }), (erro) => erro.status === 3);
});
