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
  let requests = 0;
  const fetchMock = async (url, init) => {
    requests += 1;
    assert.equal(url.origin, 'https://doufsxqlfjyuvxuezpln.supabase.co');
    assert.equal(url.pathname, '/rest/v1/v_site_products_public');
    assert.equal(url.searchParams.get('select'), '*');
    assert.equal(url.searchParams.has('is_active'), false);
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.has('offset'), false);
    assert.equal(init.headers.apikey, 'sb_publishable_fixture');
    assert.equal(init.signal instanceof AbortSignal, true);
    return new Response(JSON.stringify(url.searchParams.has('id') ? [] : [validRow()]), { status: 200 });
  };
  assert.deepEqual(await checkCatalogPublicContract(fetchMock), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
  assert.equal(requests, 2);
});

test('pagina o catálogo completo e valida swatches além da primeira página', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let requests = 0;
  const firstPage = Array.from({ length: 1000 }, (_, index) => validRow({
    id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
  }));
  const fetchMock = async (url) => {
    requests += 1;
    const cursor = url.searchParams.get('id');
    if (!cursor) return new Response(JSON.stringify(firstPage), { status: 200 });
    assert.equal(cursor, `gt.${firstPage.at(-1).id}`);
    return new Response(JSON.stringify([validRow({ color_swatches: [{ color_name: 'Azul', supplier_id: 'vazamento' }] })]), { status: 200 });
  };
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /chaves aninhadas proibidas/);
  assert.equal(requests, 2);
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
  const result = await checkCatalogPublicContract(async () => new Response(JSON.stringify(pages[request++]), { status: 200 }));
  assert.equal(result.inspectedRows, 2);
  assert.equal(request, 3);
});

test('recusa UUID repetido entre páginas paginadas', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let request = 0;
  const fetchMock = async () => new Response(JSON.stringify(request++ < 2 ? [validRow()] : []), { status: 200 });
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /UUID público duplicado/);
});

test('aceita JWT legado somente quando a role declarada é anon', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = `${header}.${payload}.fixture`;
  let request = 0;
  const fetchMock = async () => new Response(JSON.stringify(request++ === 0 ? [validRow()] : []), { status: 200 });
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
