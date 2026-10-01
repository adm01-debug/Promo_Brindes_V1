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
    ...overrides,
  };
}

test('aceita somente o contrato público exato de 36 colunas', () => {
  assert.deepEqual(validateCatalogPublicContract([validRow()]), { inspectedRows: 1, columns: 36 });
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
  assert.throws(() => validateCatalogPublicContract([validRow({ materials: 'algodão' })]), /materials/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 'Azul', variant_id: 'interno' }] })]), /swatch.*expõe/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{}] })]), /color_name/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 7 }] })]), /color_name/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 'Azul', color_hex: 7 }] })]), /color_hex/);
  assert.throws(() => validateCatalogPublicContract([validRow({ color_swatches: [{ color_name: 'Azul', image_url: false }] })]), /image_url/);
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

test('consulta apenas a origem canônica com chave pública e timeout', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  const fetchMock = async (url, init) => {
    assert.equal(url.origin, 'https://doufsxqlfjyuvxuezpln.supabase.co');
    assert.equal(url.pathname, '/rest/v1/v_site_products_public');
    assert.equal(url.searchParams.get('select'), '*');
    assert.equal(url.searchParams.get('limit'), '5');
    assert.equal(init.headers.apikey, 'sb_publishable_fixture');
    assert.equal(init.signal instanceof AbortSignal, true);
    return new Response(JSON.stringify([validRow()]), { status: 200 });
  };
  assert.deepEqual(await checkCatalogPublicContract(fetchMock), { inspectedRows: 1, columns: 36 });
});

test('aceita JWT legado somente quando a role declarada é anon', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = `${header}.${payload}.fixture`;
  const fetchMock = async () => new Response(JSON.stringify([validRow()]), { status: 200 });
  assert.deepEqual(await checkCatalogPublicContract(fetchMock), { inspectedRows: 1, columns: 36 });
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
