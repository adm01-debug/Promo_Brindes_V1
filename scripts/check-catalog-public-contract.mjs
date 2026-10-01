import { pathToFileURL } from 'node:url';

const CANONICAL_CATALOG_ORIGIN = 'https://doufsxqlfjyuvxuezpln.supabase.co';

export const EXPECTED_CATALOG_COLUMNS = Object.freeze([
  'ai_description',
  'ai_summary',
  'ai_title',
  'allows_personalization',
  'brand',
  'capacity_ml',
  'category_id',
  'color_swatches',
  'colors',
  'created_at',
  'description',
  'dimensions',
  'has_commercial_packaging',
  'has_gift_box',
  'height_cm',
  'id',
  'images',
  'is_active',
  'is_bestseller',
  'is_featured',
  'is_kit',
  'is_new',
  'length_cm',
  'main_category_id',
  'materials',
  'min_quantity',
  'name',
  'og_image_url',
  'primary_image_fallback_url',
  'primary_image_url',
  'set_image_url',
  'short_description',
  'sku',
  'slug',
  'weight_g',
  'width_cm',
].sort((left, right) => left.localeCompare(right)));

const FORBIDDEN_COLUMN_PATTERNS = [
  /(^|_)cost($|_)/i,
  /(^|_)price($|_)/i,
  /(^|_)stock($|_)/i,
  /(^|_)supplier($|_)/i,
  /(^|_)provider($|_)/i,
  /(^|_)variant_id$/i,
  /(^|_)integration($|_)/i,
];

const BOOLEAN_COLUMNS = [
  'allows_personalization',
  'has_commercial_packaging',
  'has_gift_box',
  'is_active',
  'is_bestseller',
  'is_featured',
  'is_kit',
  'is_new',
];

const NUMBER_COLUMNS = ['capacity_ml', 'height_cm', 'length_cm', 'min_quantity', 'weight_g', 'width_cm'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateCatalogPublicContract(rows) {
  assert(Array.isArray(rows), 'Contrato inválido: a resposta do catálogo não é uma lista.');
  assert(rows.length > 0, 'Contrato inconclusivo: a origem não devolveu produto algum para inspeção.');

  for (const [index, value] of rows.entries()) {
    assert(value !== null && typeof value === 'object' && !Array.isArray(value), `Contrato inválido: produto ${index + 1} não é um objeto.`);
    const row = value;
    const columns = Object.keys(row).sort((left, right) => left.localeCompare(right));
    const forbidden = columns.filter((column) => FORBIDDEN_COLUMN_PATTERNS.some((pattern) => pattern.test(column)));
    assert(forbidden.length === 0, `Contrato inseguro: produto ${index + 1} expõe colunas proibidas: ${forbidden.join(', ')}.`);
    if (!sameValues(columns, EXPECTED_CATALOG_COLUMNS)) {
      const missing = EXPECTED_CATALOG_COLUMNS.filter((column) => !columns.includes(column));
      const unexpected = columns.filter((column) => !EXPECTED_CATALOG_COLUMNS.includes(column));
      throw new Error(`Drift no contrato público: ausentes [${missing.join(', ')}]; inesperadas [${unexpected.join(', ')}].`);
    }

    assert(
      typeof row.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id),
      `Contrato inválido: produto ${index + 1} sem UUID público.`,
    );
    assert(typeof row.name === 'string' && row.name.trim().length > 0, `Contrato inválido: produto ${index + 1} sem nome.`);
    assert(typeof row.sku === 'string' && row.sku.trim().length > 0, `Contrato inválido: produto ${index + 1} sem SKU.`);
    assert(typeof row.slug === 'string' && row.slug.trim().length > 0, `Contrato inválido: produto ${index + 1} sem slug.`);
    assert(Array.isArray(row.images), `Contrato inválido: images do produto ${index + 1} não é lista.`);
    assert(Array.isArray(row.materials), `Contrato inválido: materials do produto ${index + 1} não é lista.`);
    assert(Array.isArray(row.colors), `Contrato inválido: colors do produto ${index + 1} não é lista.`);
    assert(Array.isArray(row.color_swatches), `Contrato inválido: color_swatches do produto ${index + 1} não é lista.`);

    for (const column of BOOLEAN_COLUMNS) {
      assert(row[column] === null || typeof row[column] === 'boolean', `Contrato inválido: ${column} do produto ${index + 1} não é boolean/null.`);
    }
    for (const column of NUMBER_COLUMNS) {
      assert(row[column] === null || (typeof row[column] === 'number' && Number.isFinite(row[column])), `Contrato inválido: ${column} do produto ${index + 1} não é number/null.`);
    }
    for (const [swatchIndex, swatch] of row.color_swatches.entries()) {
      assert(swatch !== null && typeof swatch === 'object' && !Array.isArray(swatch), `Contrato inválido: swatch ${swatchIndex + 1} do produto ${index + 1} não é objeto.`);
      const keys = Object.keys(swatch).sort((left, right) => left.localeCompare(right));
      const allowed = ['color_hex', 'color_name', 'image_url'];
      assert(keys.every((key) => allowed.includes(key)), `Contrato inseguro: swatch do produto ${index + 1} expõe [${keys.filter((key) => !allowed.includes(key)).join(', ')}].`);
      assert(
        typeof swatch.color_name === 'string' && swatch.color_name.trim().length > 0,
        `Contrato inválido: color_name do swatch ${swatchIndex + 1} do produto ${index + 1} não é string preenchida.`,
      );
      assert(
        swatch.color_hex === undefined || swatch.color_hex === null || typeof swatch.color_hex === 'string',
        `Contrato inválido: color_hex do swatch ${swatchIndex + 1} do produto ${index + 1} não é string/null.`,
      );
      assert(
        swatch.image_url === undefined || swatch.image_url === null || typeof swatch.image_url === 'string',
        `Contrato inválido: image_url do swatch ${swatchIndex + 1} do produto ${index + 1} não é string/null.`,
      );
    }
  }

  return { inspectedRows: rows.length, columns: EXPECTED_CATALOG_COLUMNS.length };
}

function catalogConfig() {
  const rawUrl = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  assert(rawUrl, 'VITE_SUPABASE_URL ausente.');
  let isPublicKey = Boolean(key?.startsWith('sb_publishable_'));
  if (!isPublicKey && key?.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString('utf8'));
      isPublicKey = payload?.role === 'anon';
    } catch {
      isPublicKey = false;
    }
  }
  assert(isPublicKey, 'VITE_SUPABASE_PUBLISHABLE_KEY ausente ou privilegiada.');
  const origin = new URL(rawUrl).origin;
  assert(origin === CANONICAL_CATALOG_ORIGIN, `Alvo recusado: esperado ${CANONICAL_CATALOG_ORIGIN}; recebido ${origin}.`);
  return { origin, key };
}

export async function checkCatalogPublicContract(fetchImplementation = fetch) {
  const { origin, key } = catalogConfig();
  const url = new URL('/rest/v1/v_site_products_public', origin);
  url.searchParams.set('select', '*');
  url.searchParams.set('is_active', 'eq.true');
  url.searchParams.set('order', 'id.asc');
  url.searchParams.set('limit', '5');
  const response = await fetchImplementation(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Contrato indisponível: v_site_products_public respondeu HTTP ${response.status}.`);
  const rows = await response.json().catch(() => null);
  return validateCatalogPublicContract(rows);
}

async function runCli() {
  const result = await checkCatalogPublicContract();
  process.stdout.write(`Contrato público aprovado: ${result.columns} colunas, ${result.inspectedRows} produtos inspecionados, nenhuma coluna proibida.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
