import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPECTED_CATALOG_COLUMNS,
  checkCatalogPublicContract,
  validateCatalogPublicContract,
} from '../scripts/check-catalog-public-contract.mjs';

function validRow(overrides = {}) {
  const row = Object.fromEntries(EXPECTED_CATALOG_COLUMNS.map((column) => [column, null]));
  return {
    ...row,
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Mochila',
    sku: 'MO-42',
    slug: 'mochila',
    images: [],
    materials: [],
    colors: [],
    color_swatches: [{ color_name: 'Verde', color_hex: '#00aa66', image_url: null }],
    is_active: true,
    ...overrides,
  };
}

function catalogResponse(rows, total = rows.length) {
  const range = rows.length ? `0-${rows.length - 1}/${total}` : `*/${total}`;
  return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-range': range } });
}

function baselineResponse(total) {
  return catalogResponse(total > 0 ? [{ id: '11111111-1111-4111-8111-111111111111' }] : [], total);
}

test('aceita somente o contrato público exato de 36 colunas', () => {
  assert.deepEqual(validateCatalogPublicContract([validRow()]), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
});

test('falha se uma coluna esperada sumir ou uma coluna nova aparecer', () => {
  const missing = validRow();
  delete missing.created_at;
  assert.throws(() => validateCatalogPublicContract([missing]), /ausentes \[created_at\]/);
  assert.throws(() => validateCatalogPublicContract([{ ...validRow(), editorial_extra: true }]), /inesperadas \[editorial_extra\]/);
});

test('falha explicitamente se preço, estoque ou fornecedor forem expostos', () => {
  for (const column of ['sale_price', 'stock_quantity', 'supplier_id']) {
    assert.throws(() => validateCatalogPublicContract([{ ...validRow(), [column]: 'vazamento' }]), /colunas proibidas/);
  }
});

test('recusa identificador, arrays e swatches incompatíveis', () => {
  assert.throws(() => validateCatalogPublicContract([validRow({ id: 'interno-42' })]), /sem UUID público/);
  assert.throws(() => validateCatalogPublicContract([validRow({ id: '11111111-1111-7111-8111-111111111111' })]), /sem UUID público/);
  assert.throws(() => validateCatalogPublicContract([validRow({ slug: 'slug_inválido' })]), /slug público compatível/);
  assert.throws(() => validateCatalogPublicContract([validRow({ min_quantity: 1.5 })]), /intervalo cotável/);
  assert.throws(() => validateCatalogPublicContract([validRow({ min_quantity: 1_000_000 })]), /intervalo cotável/);
  assert.throws(() => validateCatalogPublicContract([validRow({ materials: 'algodão' })]), /materials/);
  assert.throws(() => validateCatalogPublicContract([validRow({ images: [{ cost_price: 10 }] })]), /images.*não é string/);
  assert.throws(() => validateCatalogPublicContract([validRow({ dimensions: { supplier_id: 'interno' } })]), /chaves aninhadas proibidas/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 'Azul', variant_id: 'interno' }] })]), /chaves aninhadas proibidas/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{}] })]), /color_name/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 7 }] })]), /color_name/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 'Azul', color_hex: 7 }] })]), /color_hex/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 'Azul', image_url: false }] })]), /image_url/);
});

test('torna anomalias de nomes de swatches observáveis sem confundi-las com vazamento', () => {
  assert.deepEqual(
    validateCatalogPublicContract([validRow({ color_swatches: [
      { color_name: ' ' },
      { color_name: 'Azul' },
      { color_name: ' AZUL ' },
    ] })]).warnings,
    { blankSwatchNames: 1, duplicateSwatchNames: 1 },
  );
});

test('recusa UUID de produto repetido no mesmo lote', () => {
  assert.throws(() => validateCatalogPublicContract([validRow(), validRow()]), /UUID público duplicado/);
});

test('recusa produto inativo e textos incompatíveis com os consumidores', () => {
  assert.throws(() => validateCatalogPublicContract([validRow({ is_active: false })]), /inativo está exposto/);
  for (const column of ['ai_summary', 'short_description', 'primary_image_url', 'created_at']) {
    assert.throws(() => validateCatalogPublicContract([validRow({ [column]: { inesperado: true } })]), new RegExp(column));
  }
});

function restoreEnvAfter(t) {
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });
}

test('consulta todas as linhas da origem canônica com chave pública e timeout', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let siteRequests = 0;
  const fetchMock = async (url, init) => {
    assert.equal(url.origin, 'https://doufsxqlfjyuvxuezpln.supabase.co');
    if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(1);
    siteRequests += 1;
    assert.equal(url.pathname, '/rest/v1/v_site_products_public');
    assert.equal(url.searchParams.get('select'), '*');
    assert.equal(url.searchParams.has('is_active'), false);
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.has('offset'), false);
    assert.equal(init.headers.apikey, 'sb_publishable_fixture');
    assert.equal(init.signal instanceof AbortSignal, true);
    return catalogResponse(url.searchParams.has('id') ? [] : [validRow()], 1);
  };
  assert.deepEqual(await checkCatalogPublicContract(fetchMock), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
  assert.equal(siteRequests, 2);
});

test('pagina o catálogo completo e valida swatches além da primeira página', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let siteRequests = 0;
  const firstPage = Array.from({ length: 1000 }, (_, index) => validRow({
    id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
  }));
  const fetchMock = async (url) => {
    if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(1001);
    siteRequests += 1;
    const cursor = url.searchParams.get('id');
    if (!cursor) return catalogResponse(firstPage, 1001);
    assert.equal(cursor, `gt.${firstPage.at(-1).id}`);
    return catalogResponse([validRow({ color_swatches: [{ color_name: 'Azul', supplier_id: 'vazamento' }] })], 1);
  };
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /chaves aninhadas proibidas/);
  assert.equal(siteRequests, 2);
});

test('continua após uma página menor que o limite imposto pelo servidor', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  const pages = [
    [validRow({ id: '11111111-1111-4111-8111-111111111111' })],
    [validRow({ id: '22222222-2222-4222-8222-222222222222' })],
    [],
  ];
  let request = 0;
  const result = await checkCatalogPublicContract(async (url) => {
    if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(2);
    return catalogResponse(pages[request++], 2);
  });
  assert.equal(result.inspectedRows, 2);
  assert.equal(request, 3);
});

test('detecta duplicata escondida no limite de uma página pela contagem exata', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let request = 0;
  const fetchMock = async (url) => {
    if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(2);
    return catalogResponse(request++ === 0 ? [validRow()] : [], 2);
  };
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /paginação inspecionou 1 de 2/);
});

test('detecta desaparecimento parcial comparando a view dedicada com a referência pública', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let request = 0;
  const fetchMock = async (url) => {
    if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(2);
    return catalogResponse(request++ === 0 ? [validRow()] : [], 1);
  };
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /expõe 1 de 2 produtos ativos/);
});

test('aceita JWT legado somente quando a role declarada é anon', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = `${header}.${payload}.fixture`;
  let request = 0;
  const fetchMock = async (url) => {
    if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(1);
    return catalogResponse(request++ === 0 ? [validRow()] : [], 1);
  };
  assert.deepEqual(await checkCatalogPublicContract(fetchMock), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
});

test('falha fechado para outro projeto ou chave privilegiada', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://xlzmclcjdncjfdrjxclt.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  await assert.rejects(() => checkCatalogPublicContract(), /Alvo recusado/);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_fixture';
  await assert.rejects(() => checkCatalogPublicContract(), /ausente ou privilegiada/);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = `${header}.${payload}.fixture`;
  await assert.rejects(() => checkCatalogPublicContract(), /ausente ou privilegiada/);
});
