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

const NULLABLE_TEXT_COLUMNS = [
  'ai_description',
  'ai_summary',
  'ai_title',
  'brand',
  'category_id',
  'created_at',
  'description',
  'main_category_id',
  'og_image_url',
  'primary_image_fallback_url',
  'primary_image_url',
  'set_image_url',
  'short_description',
];

const CATALOG_PAGE_SIZE = 1_000;
const MAX_CATALOG_PAGES = 100;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function nestedForbiddenKeys(value, path = '') {
  if (Array.isArray(value)) return value.flatMap((item, index) => nestedForbiddenKeys(item, `${path}[${index}]`));
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    return [
      ...(FORBIDDEN_COLUMN_PATTERNS.some((pattern) => pattern.test(key)) ? [childPath] : []),
      ...nestedForbiddenKeys(child, childPath),
    ];
  });
}

export function validateCatalogPublicContract(rows, { seenProductIds = new Set() } = {}) {
  assert(Array.isArray(rows), 'Contrato inválido: a resposta do catálogo não é uma lista.');
  assert(rows.length > 0, 'Contrato inconclusivo: a origem não devolveu produto algum para inspeção.');
  let blankSwatchNames = 0;
  let duplicateSwatchNames = 0;

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
      typeof row.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id),
      `Contrato inválido: produto ${index + 1} sem UUID público.`,
    );
    assert(!seenProductIds.has(row.id), `Contrato inválido: UUID público duplicado (${row.id}).`);
    seenProductIds.add(row.id);
    assert(typeof row.name === 'string' && row.name.trim().length > 0, `Contrato inválido: produto ${index + 1} sem nome.`);
    assert(typeof row.sku === 'string' && row.sku.trim().length > 0, `Contrato inválido: produto ${index + 1} sem SKU.`);
    assert(
      typeof row.slug === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/i.test(row.slug),
      `Contrato inválido: produto ${index + 1} sem slug público compatível.`,
    );
    assert(Array.isArray(row.images), `Contrato inválido: images do produto ${index + 1} não é lista.`);
    assert(Array.isArray(row.materials), `Contrato inválido: materials do produto ${index + 1} não é lista.`);
    assert(Array.isArray(row.colors), `Contrato inválido: colors do produto ${index + 1} não é lista.`);
    assert(Array.isArray(row.color_swatches), `Contrato inválido: color_swatches do produto ${index + 1} não é lista.`);
    for (const column of ['images', 'materials', 'colors']) {
      assert(row[column].every((item) => typeof item === 'string'), `Contrato inválido: ${column} do produto ${index + 1} contém item que não é string.`);
    }
    assert(
      row.dimensions === null || (typeof row.dimensions === 'object' && !Array.isArray(row.dimensions)),
      `Contrato inválido: dimensions do produto ${index + 1} não é objeto/null.`,
    );
    const forbiddenNested = ['images', 'materials', 'colors', 'dimensions', 'color_swatches']
      .flatMap((column) => nestedForbiddenKeys(row[column], column));
    assert(forbiddenNested.length === 0, `Contrato inseguro: produto ${index + 1} expõe chaves aninhadas proibidas: ${forbiddenNested.join(', ')}.`);
    assert(row.is_active === true, `Contrato inseguro: produto ${index + 1} inativo está exposto na view pública.`);

    for (const column of BOOLEAN_COLUMNS) {
      assert(row[column] === null || typeof row[column] === 'boolean', `Contrato inválido: ${column} do produto ${index + 1} não é boolean/null.`);
    }
    for (const column of NUMBER_COLUMNS) {
      assert(row[column] === null || (typeof row[column] === 'number' && Number.isFinite(row[column])), `Contrato inválido: ${column} do produto ${index + 1} não é number/null.`);
    }
    for (const column of NULLABLE_TEXT_COLUMNS) {
      assert(row[column] === null || typeof row[column] === 'string', `Contrato inválido: ${column} do produto ${index + 1} não é string/null.`);
    }
    const normalizedSwatchNames = new Set();
    for (const [swatchIndex, swatch] of row.color_swatches.entries()) {
      assert(swatch !== null && typeof swatch === 'object' && !Array.isArray(swatch), `Contrato inválido: swatch ${swatchIndex + 1} do produto ${index + 1} não é objeto.`);
      const keys = Object.keys(swatch).sort((left, right) => left.localeCompare(right));
      const allowed = ['color_hex', 'color_name', 'image_url'];
      assert(keys.every((key) => allowed.includes(key)), `Contrato inseguro: swatch do produto ${index + 1} expõe [${keys.filter((key) => !allowed.includes(key)).join(', ')}].`);
      assert(
        typeof swatch.color_name === 'string',
        `Contrato inválido: color_name do swatch ${swatchIndex + 1} do produto ${index + 1} não é string.`,
      );
      const normalizedName = swatch.color_name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
      if (!normalizedName) blankSwatchNames += 1;
      else if (normalizedSwatchNames.has(normalizedName)) duplicateSwatchNames += 1;
      else normalizedSwatchNames.add(normalizedName);
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

  return {
    inspectedRows: rows.length,
    columns: EXPECTED_CATALOG_COLUMNS.length,
    warnings: { blankSwatchNames, duplicateSwatchNames },
  };
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
  let inspectedRows = 0;
  let lastId = '';
  const seenProductIds = new Set();
  const warnings = { blankSwatchNames: 0, duplicateSwatchNames: 0 };

  for (let page = 0; page < MAX_CATALOG_PAGES; page += 1) {
    const url = new URL('/rest/v1/v_site_products_public', origin);
    url.searchParams.set('select', '*');
    // A view deve aplicar o isolamento. Não filtre is_active aqui: isso esconderia
    // uma regressão que passasse a publicar produtos inativos.
    url.searchParams.set('order', 'id.asc');
    url.searchParams.set('limit', String(CATALOG_PAGE_SIZE));
    // Cursor imutável por UUID: evita saltos de offset se o catálogo mudar
    // enquanto a leitura percorre as páginas e funciona mesmo com max-rows baixo.
    if (lastId) url.searchParams.set('id', `gt.${lastId}`);
    const response = await fetchImplementation(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Contrato indisponível: v_site_products_public respondeu HTTP ${response.status}.`);
    const rows = await response.json().catch(() => null);
    assert(Array.isArray(rows), 'Contrato inválido: a resposta do catálogo não é uma lista.');
    if (rows.length === 0) {
      assert(inspectedRows > 0, 'Contrato inconclusivo: a origem não devolveu produto algum para inspeção.');
      return { inspectedRows, columns: EXPECTED_CATALOG_COLUMNS.length, warnings };
    }
    const result = validateCatalogPublicContract(rows, { seenProductIds });
    inspectedRows += result.inspectedRows;
    warnings.blankSwatchNames += result.warnings.blankSwatchNames;
    warnings.duplicateSwatchNames += result.warnings.duplicateSwatchNames;
    const pageLastId = rows.at(-1)?.id;
    assert(typeof pageLastId === 'string' && (!lastId || pageLastId > lastId), 'Contrato inválido: paginação do catálogo não avançou por UUID.');
    lastId = pageLastId;
  }

  throw new Error(`Contrato inconclusivo: catálogo excedeu ${MAX_CATALOG_PAGES * CATALOG_PAGE_SIZE} produtos durante a inspeção paginada.`);
}

async function runCli() {
  const result = await checkCatalogPublicContract();
  process.stdout.write(`Contrato público aprovado: ${result.columns} colunas, ${result.inspectedRows} produtos inspecionados, nenhuma coluna proibida.\n`);
  if (result.warnings.blankSwatchNames || result.warnings.duplicateSwatchNames) {
    process.stdout.write(`Avisos de qualidade da origem: ${result.warnings.blankSwatchNames} swatch(es) sem nome e ${result.warnings.duplicateSwatchNames} nome(s) duplicado(s).\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
