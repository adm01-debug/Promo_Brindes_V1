import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompress } from 'node:zlib';
import { promisify } from 'node:util';

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const manifestUrl = new URL('../dist/.vite/manifest.json', import.meta.url);
const rawBytes = (kilobytes) => kilobytes * 1024;
// Dois artefatos distintos passam por este script e por isso cada um tem o seu
// teto, em vez de compartilharem um numero:
//   - build de PRODUCAO (o que o visitante baixa hoje, com os tres recursos
//     persistentes desligados), medido dentro de `npm run check`;
//   - build de PIOR CASO (os tres recursos ligados), reconstruido de proposito
//     pelo passo "Record the performance budget evidence" de quality.yml.
// As flags custam +1,2 KiB Brotli, medido nos dois sentidos em 17/11/2026 no
// mesmo SHA: 265,7 KiB desligadas contra 266,9 KiB ligadas. Enquanto os dois
// compartilhavam o teto de 267 KiB, a medicao de producao ficava frouxa (sobra
// de 1,3 KiB) e a de pior caso vivia a 0,1 KiB de reprovar por variacao de
// runner — o mesmo commit passava num passo e reprovava no outro.
// PERFORMANCE_BUDGET_PROFILE=worst-case seleciona o teto de pior caso; sem a
// variavel vale o de producao, que NAO foi afrouxado.
const WORST_CASE = process.env.PERFORMANCE_BUDGET_PROFILE === 'worst-case';
const brotli = promisify(brotliCompress);

async function assets() {
  let entries;
  try {
    entries = await readdir(assetsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('dist/assets não existe: rode `npm run build` antes de medir o orçamento.', { cause: error });
    throw error;
  }
  // join() em vez de new URL(nome, base): um nome com % ou # seria lido como outro arquivo.
  const directory = fileURLToPath(assetsDirectory);
  return Promise.all(entries.filter((entry) => entry.isFile()).map(async ({ name }) => {
    const contents = await readFile(join(directory, name));
    return { name, size: contents.byteLength, brotliSize: (await brotli(contents)).byteLength };
  }));
}

async function readManifest() {
  let text;
  try {
    text = await readFile(manifestUrl, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('dist/.vite/manifest.json não existe: rode `npm run build` (build.manifest precisa estar ativo no vite.config.ts).', { cause: error });
    throw error;
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw new Error(`dist/.vite/manifest.json não é um JSON válido: ${error.message}`, { cause: error });
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('dist/.vite/manifest.json não tem o formato de manifest do Vite.');
  }
  return manifest;
}

function assertBudget(label, value, maximum) {
  if (value > maximum) {
    throw new Error(`${label}: ${(value / 1024).toFixed(1)} KiB excede o limite de ${(maximum / 1024).toFixed(0)} KiB.`);
  }
}

try {
  const built = await assets();
  const manifest = await readManifest();
  const css = built.filter((asset) => asset.name.endsWith('.css')).reduce((sum, asset) => sum + asset.size, 0);
  const javascript = built.filter((asset) => asset.name.endsWith('.js')).reduce((sum, asset) => sum + asset.size, 0);
  const cssBrotli = built.filter((asset) => asset.name.endsWith('.css')).reduce((sum, asset) => sum + asset.brotliSize, 0);
  const javascriptBrotli = built.filter((asset) => asset.name.endsWith('.js')).reduce((sum, asset) => sum + asset.brotliSize, 0);
  const byName = new Map(built.map((asset) => [asset.name, asset]));
  const manifestEntry = Object.entries(manifest).find(([, chunk]) => chunk?.isEntry);
  if (!manifestEntry) throw new Error('Manifest do Vite sem entrada principal.');
  // Chunk medido de verdade ou falha: um arquivo ausente contado como 0 KiB
  // aprovaria o orçamento sem medir nada.
  function builtChunk(key) {
    const file = manifest[key]?.file;
    const asset = typeof file === 'string' ? byName.get(file.split('/').pop()) : undefined;
    if (!asset) throw new Error(`Chunk "${key}" do manifest (${file ?? 'sem arquivo'}) não existe em dist/assets: build inconsistente.`);
    return asset;
  }
  // A entrada vem do manifest: o padrão index-*.js também casa com chunks lazy
  // de módulos chamados index e não acha uma entrada com outro nome.
  const entryAsset = builtChunk(manifestEntry[0]);
  const entry = entryAsset.size;
  const entryBrotli = entryAsset.brotliSize;
  const initialKeys = new Set();
  function collectInitial(key) {
    if (initialKeys.has(key)) return;
    initialKeys.add(key);
    for (const imported of manifest[key]?.imports || []) collectInitial(imported);
  }
  collectInitial(manifestEntry[0]);
  const initialJavascriptBrotli = [...initialKeys].reduce((sum, key) => sum + builtChunk(key).brotliSize, 0);
  const largestAsyncJavascriptBrotli = built
    .filter((asset) => asset.name.endsWith('.js') && asset.name !== entryAsset.name)
    .reduce((maximum, asset) => Math.max(maximum, asset.brotliSize), 0);

  // Bytes brutos guardam custo de parse/memória; Brotli representa transferência.
  // Os dois limites evitam que uma regressão fique invisível por compressibilidade.
  assertBudget('CSS total', css, rawBytes(180));
  // Teto raw de JS recalibrado em 21/11/2026 de 950 para 960 KiB quando a F-30
  // (LGPD art. 18 na Area do Cliente) levou o build de producao a 953,7 KiB
  // (945 KiB base, +9 KiB da feature, arvore tree-shaken sem dependencia nova).
  // Pior caso com as flags ligadas: 957,7 KiB. Margem de 2,3 KiB nos dois perfis.
  assertBudget('JavaScript total', javascript, rawBytes(960));
  assertBudget('Bundle de entrada', entry, rawBytes(300));
  assertBudget('CSS total (Brotli)', cssBrotli, rawBytes(32));
  // O total é um teto de manutenção para todo o corpus lazy. O download real
  // da primeira visita é medido separadamente pelo grafo de imports estáticos.
  // A base equivalente à produção, com os três recursos persistentes e as
  // integrações públicas habilitadas, mede 263,7 KiB no SHA auditado em
  // 28/09/2026. O teto de 265 KiB mantém 1,3 KiB de margem e é sempre medido
  // contra um rebuild explícito com essas flags;
  // entrada, carga inicial e maior chunk continuam limitados separadamente.
  // O resumo editável do briefing e a confirmação aprovada acrescentam 1,3 KiB
  // nas rotas lazy (medição conjunta em 27/10/2026). Os tetos de entrada,
  // carga inicial, maior chunk e bytes brutos permanecem independentes.
  // Producao agora (F-30 LGPD): 269,0 KiB; pior caso: 270,0 KiB. Teto de
  // producao: 271 KiB (folga de 1,8 KiB apos a variacao de runner de ~0,2 KiB,
  // mesmo criterio do perfil de pior caso). Pior caso: 272 KiB, que e o teto de
  // producao mais os 1,2 KiB das flags mais 1,8 KiB de folga — a folga existe
  // porque a mesma arvore mede 266,9 KiB aqui e 267,1 KiB no runner da CI, e um
  // gate que reprova por essa diferenca nao esta medindo o codigo, esta medindo
  // a maquina.
  assertBudget(
    WORST_CASE ? 'JavaScript total (Brotli, pior caso com as flags ligadas)' : 'JavaScript total (Brotli)',
    javascriptBrotli,
    rawBytes(WORST_CASE ? 272 : 271),
  );
  assertBudget('Bundle de entrada (Brotli)', entryBrotli, rawBytes(90));
  assertBudget('JavaScript inicial (Brotli)', initialJavascriptBrotli, rawBytes(150));
  assertBudget('Maior chunk JavaScript assíncrono (Brotli)', largestAsyncJavascriptBrotli, rawBytes(50));
  console.log(
    `Orçamento de assets aprovado: CSS ${(css / 1024).toFixed(1)} KiB / ${(cssBrotli / 1024).toFixed(1)} KiB Brotli; `
    + `JS ${(javascript / 1024).toFixed(1)} KiB / ${(javascriptBrotli / 1024).toFixed(1)} KiB Brotli; `
    + `entrada ${(entry / 1024).toFixed(1)} KiB / ${(entryBrotli / 1024).toFixed(1)} KiB Brotli; `
    + `inicial ${(initialJavascriptBrotli / 1024).toFixed(1)} KiB Brotli; `
    + `maior chunk assíncrono ${(largestAsyncJavascriptBrotli / 1024).toFixed(1)} KiB Brotli.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
