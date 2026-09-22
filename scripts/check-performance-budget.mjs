import { readFile, readdir } from 'node:fs/promises';
import { brotliCompress } from 'node:zlib';
import { promisify } from 'node:util';

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const manifestUrl = new URL('../dist/.vite/manifest.json', import.meta.url);
const rawBytes = (kilobytes) => kilobytes * 1024;
const brotli = promisify(brotliCompress);

async function assets() {
  const names = await readdir(assetsDirectory);
  return Promise.all(names.map(async (name) => {
    const contents = await readFile(new URL(name, assetsDirectory));
    return { name, size: contents.byteLength, brotliSize: (await brotli(contents)).byteLength };
  }));
}

function assertBudget(label, value, maximum) {
  if (value > maximum) {
    throw new Error(`${label}: ${(value / 1024).toFixed(1)} KiB excede o limite de ${(maximum / 1024).toFixed(0)} KiB.`);
  }
}

try {
  const built = await assets();
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  const css = built.filter((asset) => asset.name.endsWith('.css')).reduce((sum, asset) => sum + asset.size, 0);
  const javascript = built.filter((asset) => asset.name.endsWith('.js')).reduce((sum, asset) => sum + asset.size, 0);
  const cssBrotli = built.filter((asset) => asset.name.endsWith('.css')).reduce((sum, asset) => sum + asset.brotliSize, 0);
  const javascriptBrotli = built.filter((asset) => asset.name.endsWith('.js')).reduce((sum, asset) => sum + asset.brotliSize, 0);
  const entryAsset = built.find((asset) => /^index-[\w-]+\.js$/.test(asset.name));
  const entry = entryAsset?.size || 0;
  const entryBrotli = entryAsset?.brotliSize || 0;
  const byName = new Map(built.map((asset) => [asset.name, asset]));
  const manifestEntry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry);
  if (!manifestEntry) throw new Error('Manifest do Vite sem entrada principal.');
  const initialKeys = new Set();
  function collectInitial(key) {
    if (initialKeys.has(key)) return;
    initialKeys.add(key);
    for (const imported of manifest[key]?.imports || []) collectInitial(imported);
  }
  collectInitial(manifestEntry[0]);
  const initialJavascriptBrotli = [...initialKeys].reduce((sum, key) => {
    const name = manifest[key]?.file?.split('/').pop();
    return sum + (name ? byName.get(name)?.brotliSize || 0 : 0);
  }, 0);
  const largestAsyncJavascriptBrotli = built
    .filter((asset) => asset.name.endsWith('.js') && asset.name !== entryAsset?.name)
    .reduce((maximum, asset) => Math.max(maximum, asset.brotliSize), 0);

  // Bytes brutos guardam custo de parse/memória; Brotli representa transferência.
  // Os dois limites evitam que uma regressão fique invisível por compressibilidade.
  assertBudget('CSS total', css, rawBytes(180));
  assertBudget('JavaScript total', javascript, rawBytes(950));
  assertBudget('Bundle de entrada', entry, rawBytes(300));
  assertBudget('CSS total (Brotli)', cssBrotli, rawBytes(32));
  // O total é um teto de manutenção para todo o corpus lazy. O download real
  // da primeira visita é medido separadamente pelo grafo de imports estáticos.
  assertBudget('JavaScript total (Brotli)', javascriptBrotli, rawBytes(260));
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
