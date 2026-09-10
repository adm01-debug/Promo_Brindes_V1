import { readdir, stat } from 'node:fs/promises';

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const rawBytes = (kilobytes) => kilobytes * 1024;

async function assets() {
  const names = await readdir(assetsDirectory);
  return Promise.all(names.map(async (name) => ({
    name,
    size: (await stat(new URL(name, assetsDirectory))).size,
  })));
}

function assertBudget(label, value, maximum) {
  if (value > maximum) {
    throw new Error(`${label}: ${(value / 1024).toFixed(1)} KiB excede o limite de ${(maximum / 1024).toFixed(0)} KiB.`);
  }
}

try {
  const built = await assets();
  const css = built.filter((asset) => asset.name.endsWith('.css')).reduce((sum, asset) => sum + asset.size, 0);
  const javascript = built.filter((asset) => asset.name.endsWith('.js')).reduce((sum, asset) => sum + asset.size, 0);
  const entry = built.find((asset) => /^index-[\w-]+\.js$/.test(asset.name))?.size || 0;

  // Protege contra regressões acidentais de peso; não substitui Core Web Vitals reais.
  assertBudget('CSS total', css, rawBytes(180));
  assertBudget('JavaScript total', javascript, rawBytes(950));
  assertBudget('Bundle de entrada', entry, rawBytes(380));
  console.log(`Orçamento de assets aprovado: CSS ${(css / 1024).toFixed(1)} KiB; JS ${(javascript / 1024).toFixed(1)} KiB; entrada ${(entry / 1024).toFixed(1)} KiB.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
