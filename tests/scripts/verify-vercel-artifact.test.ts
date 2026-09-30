// @vitest-environment node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const verifier = resolve('scripts/verify-vercel-artifact.mjs');
const workspaces: string[] = [];
const shellPath = 'api/_lib/app-shell.generated.html';

function fixture(options: { missingShellFrom?: string; mismatchedHtml?: boolean; noShellDeclaration?: boolean } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'promo-vercel-artifact-'));
  workspaces.push(root);
  const pageFunctions = ['site-page', 'product-page', 'not-found'];
  const allFunctions = [...pageFunctions, 'briefing-assets', 'quote-requests'];

  mkdirSync(join(root, 'api', '_lib'), { recursive: true });
  mkdirSync(join(root, '.vercel', 'output', 'static'), { recursive: true });
  writeFileSync(join(root, 'api', '_lib', 'app-shell.generated.html'), '<main>shell</main>');
  writeFileSync(join(root, '.vercel', 'output', 'static', 'index.html'), options.mismatchedHtml ? '<main>outro</main>' : '<main>shell</main>');

  for (const name of allFunctions) {
    const functionDir = join(root, '.vercel', 'output', 'functions', 'api', `${name}.func`);
    mkdirSync(functionDir, { recursive: true });
    const mapsShell = pageFunctions.includes(name) && options.missingShellFrom !== name;
    writeFileSync(join(functionDir, '.vc-config.json'), JSON.stringify({
      filePathMap: mapsShell ? { [shellPath]: shellPath } : {},
    }));
  }

  const functions = Object.fromEntries(allFunctions.map((name) => [
    `api/${name}.ts`,
    pageFunctions.includes(name) && !options.noShellDeclaration
      ? { maxDuration: 15, includeFiles: shellPath }
      : { maxDuration: 15 },
  ]));
  writeFileSync(join(root, 'vercel.json'), JSON.stringify({ functions }));
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
});
