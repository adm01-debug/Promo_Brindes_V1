import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = join(process.cwd(), 'dist', 'index.html');
const destination = join(process.cwd(), 'api', '_lib', 'app-shell.generated.html');

try {
  let shell;
  try {
    shell = readFileSync(source);
  } catch (error) {
    throw new Error(`Não foi possível ler dist/index.html (${error.code ?? error.message}): rode \`vite build\` na raiz do repositório antes deste script.`, { cause: error });
  }
  const html = shell.toString('utf8');

  // Mesmas três condições de isValidAppShell (api/_lib/publicProductPage.ts):
  // o que a função recusaria em produção com 503 tem de reprovar o build.
  if (!/<div\s+id=["']root["'][^>]*>/i.test(html)
    || !/<script\b[^>]*\bsrc=["']\/assets\//i.test(html)
    || /Protected Deployment|Log in to Vercel/i.test(html)) {
    throw new Error('O build não gerou um app shell válido para as funções serverless.');
  }

  // Grava os mesmos bytes validados e troca por rename: quem lê o destino
  // durante o build nunca encontra um shell pela metade.
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, shell);
    renameSync(temporary, destination);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw new Error(`Não foi possível gravar api/_lib/app-shell.generated.html (${error.code ?? error.message}): execute na raiz do repositório, onde api/_lib existe.`, { cause: error });
  }
  console.log('App shell gerado e preparado para as funções serverless.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
