// @vitest-environment node

import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const verifier = resolve('scripts/verify-vercel-artifact.mjs');
const workspaces: string[] = [];
const shellPath = 'api/_lib/app-shell.generated.html';

function fixture(options: {
  includeFilesAsArray?: boolean;
  missingFunctionFromArtifact?: string;
  missingShellFrom?: string;
  mismatchedHtml?: boolean;
  noShellDeclaration?: boolean;
  shellBytes?: Uint8Array;
  staticBytes?: Uint8Array;
  symlinkedFunction?: string;
  functionsOverride?: unknown;
  rawFunctionConfig?: Record<string, string>;
  withoutFunctionsDir?: boolean;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'promo-vercel-artifact-'));
  workspaces.push(root);
  const pageFunctions = ['site-page', 'product-page', 'not-found'];
  const allFunctions = [...pageFunctions, 'briefing-assets', 'quote-requests'];

  mkdirSync(join(root, 'api', '_lib'), { recursive: true });
  mkdirSync(join(root, '.vercel', 'output', 'static'), { recursive: true });
  writeFileSync(join(root, 'api', '_lib', 'app-shell.generated.html'), options.shellBytes ?? '<main>shell</main>');
  writeFileSync(join(root, '.vercel', 'output', 'static', 'index.html'), options.staticBytes ?? (options.mismatchedHtml ? '<main>outro</main>' : '<main>shell</main>'));

  for (const name of options.withoutFunctionsDir ? [] : allFunctions) {
    if (options.missingFunctionFromArtifact === name || options.symlinkedFunction === name) continue;
    const functionDir = join(root, '.vercel', 'output', 'functions', 'api', `${name}.func`);
    mkdirSync(functionDir, { recursive: true });
    const mapsShell = pageFunctions.includes(name) && options.missingShellFrom !== name;
    writeFileSync(join(functionDir, '.vc-config.json'), options.rawFunctionConfig?.[name] ?? JSON.stringify({
      filePathMap: mapsShell ? { [shellPath]: shellPath } : {},
    }));
  }
  if (options.symlinkedFunction) {
    const functionsDir = join(root, '.vercel', 'output', 'functions', 'api');
    symlinkSync(join(functionsDir, 'site-page.func'), join(functionsDir, `${options.symlinkedFunction}.func`), 'dir');
  }

  const functions = Object.fromEntries(allFunctions.map((name) => [
    `api/${name}.ts`,
    pageFunctions.includes(name) && !options.noShellDeclaration
      ? { maxDuration: 15, includeFiles: options.includeFilesAsArray ? [shellPath] : shellPath }
      : { maxDuration: 15 },
  ]));
  writeFileSync(join(root, 'vercel.json'), JSON.stringify({ functions: options.functionsOverride ?? functions }));
  return root;
}

function verify(root: string) {
  return spawnSync(process.execPath, [verifier], { cwd: root, encoding: 'utf8' });
}

afterEach(() => {
  for (const workspace of workspaces.splice(0)) rmSync(workspace, { recursive: true, force: true });
});

describe('verificador do artefato Vercel', () => {
  it('exige o app shell somente das funções de página declaradas em vercel.json', () => {
    const result = verify(fixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('3 funções de página');
    expect(result.stdout).toContain('5 funções no total');
  });

  it('aceita includeFiles como lista sem perder o contrato do app shell', () => {
    const result = verify(fixture({ includeFilesAsArray: true }));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('3 funções de página');
  });

  it('falha quando uma função de página declarada não existe no artefato', () => {
    const result = verify(fixture({ missingFunctionFromArtifact: 'product-page' }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('função product-page, que exige o app shell, não foi encontrada');
  });

  it('falha quando uma função de página declarada não empacota o app shell', () => {
    const result = verify(fixture({ missingShellFrom: 'site-page' }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app shell não foi incluído no artefato da função site-page');
  });

  it('falha quando o shell serverless diverge do HTML estático', () => {
    const result = verify(fixture({ mismatchedHtml: true }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app shell das funções diverge do HTML publicado estaticamente');
  });

  it('falha fechado quando nenhuma função declara o app shell', () => {
    const result = verify(fixture({ noShellDeclaration: true }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Nenhuma função declarou ${shellPath}`);
  });

  it('compara o shell por bytes, sem igualar sequências UTF-8 inválidas distintas', () => {
    const result = verify(fixture({
      shellBytes: Uint8Array.from([0x3c, 0xff, 0x3e]),
      staticBytes: Uint8Array.from([0x3c, 0xfe, 0x3e]),
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app shell das funções diverge do HTML publicado estaticamente');
  });

  it('conta e valida função de página emitida pela Vercel como symlink', () => {
    const result = verify(fixture({ symlinkedFunction: 'product-page' }));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('3 funções de página: site-page, product-page, not-found');
    expect(result.stdout).toContain('5 funções no total');
  });

  it('aceita chave de função sem extensão em vez de procurar uma função de nome vazio', () => {
    const result = verify(fixture({
      functionsOverride: { 'api/site-page': { includeFiles: shellPath } },
    }));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1 funções de página: site-page.');
  });

  it('falha fechado e nomeia o padrão quando o shell é declarado por glob', () => {
    const result = verify(fixture({
      functionsOverride: { 'api/*.ts': { includeFiles: shellPath } },
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('pelo padrão "api/*.ts"');
  });

  it('falha fechado com configuração de função nula ou artefato sem diretório de funções', () => {
    const nullConfig = verify(fixture({ functionsOverride: { 'api/site-page.ts': null } }));
    expect(nullConfig.status).toBe(1);
    expect(nullConfig.stderr).toContain(`Nenhuma função declarou ${shellPath}`);

    const noFunctions = verify(fixture({ withoutFunctionsDir: true }));
    expect(noFunctions.status).toBe(1);
    expect(noFunctions.stderr).toContain('Diretório .vercel/output/functions/api/ ausente no artefato');
  });

  it('nomeia o arquivo quando o artefato está ausente ou tem JSON inválido', () => {
    const root = fixture();
    rmSync(join(root, '.vercel', 'output', 'static', 'index.html'));
    const missing = verify(root);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('Não foi possível ler .vercel/output/static/index.html (ENOENT)');
    expect(missing.stderr).toContain('vercel build --prod');

    const malformed = verify(fixture({ rawFunctionConfig: { 'not-found': '{' } }));
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toContain('.vercel/output/functions/api/not-found.func/.vc-config.json não é um JSON válido');

    const nullConfig = verify(fixture({ rawFunctionConfig: { 'site-page': 'null' } }));
    expect(nullConfig.status).toBe(1);
    expect(nullConfig.stderr).toContain('app shell não foi incluído no artefato da função site-page');
  });

  it('é idempotente e não altera o artefato verificado', () => {
    const root = fixture();
    const first = verify(root);
    const second = verify(root);

    expect(first.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);
  });
});
