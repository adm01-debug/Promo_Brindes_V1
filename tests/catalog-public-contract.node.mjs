import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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

function deniedResponse() {
  return new Response(JSON.stringify({ message: 'column does not exist' }), { status: 400 });
}

function stableControlResponse(url, total) {
  const select = url.searchParams.get('select');
  if (url.pathname === '/rest/v1/v_products_public') return baselineResponse(total);
  if (url.pathname === '/rest/v1/v_site_products_public' && select === 'id') return baselineResponse(total);
  if (url.pathname === '/rest/v1/v_site_products_public' && select?.startsWith('id,')) return deniedResponse();
  return null;
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
  assert.throws(() => validateCatalogPublicContract([validRow({ dimensions: { supplierId: 'interno' } })]), /chaves aninhadas proibidas/);
  assert.throws(() => validateCatalogPublicContract([validRow({ dimensions: { costPrice: 10, stockQuantity: 2 } })]), /chaves aninhadas proibidas/);
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
  let baselineRequests = 0;
  let forbiddenProbes = 0;
  const fetchMock = async (url, init) => {
    assert.equal(url.origin, 'https://doufsxqlfjyuvxuezpln.supabase.co');
    if (url.pathname === '/rest/v1/v_products_public') {
      baselineRequests += 1;
      assert.equal(url.searchParams.get('select'), 'id');
      assert.equal(url.searchParams.get('is_active'), 'eq.true');
      assert.equal(url.searchParams.get('limit'), '1');
      assert.equal(init.headers.Prefer, 'count=exact');
      assert.equal(init.headers.apikey, 'sb_publishable_fixture');
      assert.equal(init.headers.Accept, 'application/json');
      assert.equal(init.signal instanceof AbortSignal, true);
      return baselineResponse(1);
    }
    if (url.searchParams.get('select') === 'id') return baselineResponse(1);
    if (url.searchParams.get('select')?.startsWith('id,')) {
      forbiddenProbes += 1;
      assert.equal(init.headers.Prefer, undefined);
      return deniedResponse();
    }
    siteRequests += 1;
    assert.equal(url.pathname, '/rest/v1/v_site_products_public');
    assert.equal(url.searchParams.get('select'), '*');
    assert.equal(url.searchParams.has('is_active'), false);
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.has('offset'), false);
    assert.equal(init.headers.apikey, 'sb_publishable_fixture');
    assert.equal(init.signal instanceof AbortSignal, true);
    assert.equal(init.headers.Prefer, siteRequests === 1 ? 'count=exact' : undefined);
    return catalogResponse(url.searchParams.has('id') ? [] : [validRow()], 1);
  };
  assert.deepEqual(await checkCatalogPublicContract(fetchMock), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
  assert.equal(siteRequests, 2);
  assert.equal(baselineRequests, 2);
  assert.equal(forbiddenProbes, 4);
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
    const control = stableControlResponse(url, 1001);
    if (control) return control;
    siteRequests += 1;
    const cursor = url.searchParams.get('id');
    if (!cursor) return catalogResponse(firstPage, 1001);
    assert.equal(cursor, `gt.${firstPage.at(-1).id}`);
    return catalogResponse([validRow({ color_swatches: [{ color_name: 'Azul', supplier_id: 'vazamento' }] })], 1);
  };
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /chaves aninhadas proibidas/);
  assert.equal(siteRequests, 2);
});

test('continua por mais de cem páginas quando o servidor impõe max-rows baixo', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  const rows = Array.from({ length: 101 }, (_, index) => validRow({
    id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
  }));
  let request = 0;
  const result = await checkCatalogPublicContract(async (url) => {
    const control = stableControlResponse(url, rows.length);
    if (control) return control;
    return catalogResponse(request < rows.length ? [rows[request++]] : [], rows.length);
  });
  assert.equal(result.inspectedRows, rows.length);
  assert.equal(request, rows.length);
});

test('detecta duplicata escondida no limite de uma página pela contagem exata', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let request = 0;
  const fetchMock = async (url) => {
    const control = stableControlResponse(url, 2);
    if (control) return control;
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
    if (url.searchParams.get('select') === 'id') return baselineResponse(1);
    return catalogResponse(request++ === 0 ? [validRow()] : [], 1);
  };
  await assert.rejects(() => checkCatalogPublicContract(fetchMock), /expõe 1 de 2 produtos ativos/);
});

test('repete a varredura uma vez quando as contagens mudam durante a leitura', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  const twoRows = [
    validRow({ id: '11111111-1111-4111-8111-111111111111' }),
    validRow({ id: '22222222-2222-4222-8222-222222222222' }),
  ];
  let legacyCounts = 0;
  let scanPage = 0;
  const fetchMock = async (url) => {
    const select = url.searchParams.get('select');
    if (url.pathname === '/rest/v1/v_products_public') {
      legacyCounts += 1;
      return baselineResponse(legacyCounts === 1 ? 1 : 2);
    }
    if (select === 'id') {
      return baselineResponse(2);
    }
    if (select?.startsWith('id,')) return deniedResponse();
    scanPage += 1;
    if (scanPage === 1) return catalogResponse([twoRows[0]], 1);
    if (scanPage === 2) return catalogResponse([], 1);
    if (scanPage === 3) return catalogResponse(twoRows, 2);
    return catalogResponse([], 2);
  };
  const result = await checkCatalogPublicContract(fetchMock);
  assert.equal(result.inspectedRows, 2);
  assert.equal(scanPage, 4);
});

test('aceita JWT legado somente quando a role declarada é anon', async (t) => {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = `${header}.${payload}.fixture`;
  let request = 0;
  const fetchMock = async (url) => {
    const control = stableControlResponse(url, 1);
    if (control) return control;
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

const NO_DELAY = { retryDelaysMs: [0, 0] };

function canonicalEnv(t) {
  restoreEnvAfter(t);
  process.env.VITE_SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
}

function networkError(code) {
  return new TypeError('fetch failed', { cause: Object.assign(new Error(`connect ${code}`), { code }) });
}

// Catálogo saudável de um produto; `intercept` pode trocar a resposta de qualquer requisição.
function healthyFetch(intercept = () => null) {
  const requests = [];
  const fetchMock = async (url) => {
    const select = url.searchParams.get('select');
    const kind = url.pathname === '/rest/v1/v_products_public' ? 'baseline'
      : select === 'id' ? 'site-count'
        : select?.startsWith('id,') ? 'probe'
          : 'scan';
    requests.push(kind);
    const intercepted = await intercept(kind, requests.filter((entry) => entry === kind).length, url);
    if (intercepted) return intercepted;
    if (kind === 'probe') return deniedResponse();
    if (kind !== 'scan') return baselineResponse(1);
    return catalogResponse(url.searchParams.has('id') ? [] : [validRow()], 1);
  };
  return { fetchMock, requests, count: (kind) => requests.filter((entry) => entry === kind).length };
}

test('sonda de coluna proibida não conta erro do servidor como recusa (falha fechada)', async (t) => {
  canonicalEnv(t);
  for (const status of [500, 502, 503, 429, 408]) {
    const { fetchMock, count } = healthyFetch((kind) => (kind === 'probe' ? new Response('indisponível', { status }) : null));
    await assert.rejects(
      () => checkCatalogPublicContract(fetchMock, NO_DELAY),
      new RegExp(`Contrato inconclusivo: a sonda da coluna proibida sale_price respondeu HTTP ${status}\\.`),
    );
    assert.equal(count('probe'), 3, 'a sonda é repetida antes de desistir');
  }
});

test('sonda de coluna proibida aceita como recusa somente resposta 4xx do PostgREST', async (t) => {
  canonicalEnv(t);
  for (const status of [400, 401, 403, 404]) {
    const { fetchMock, count } = healthyFetch((kind) => (kind === 'probe' ? new Response('{}', { status }) : null));
    assert.equal((await checkCatalogPublicContract(fetchMock, NO_DELAY)).inspectedRows, 1);
    assert.equal(count('probe'), 4);
  }
  const leaking = healthyFetch((kind, nth) => (kind === 'probe' && nth === 3 ? catalogResponse([{ id: 'x', supplier_id: 'y' }], 1) : null));
  await assert.rejects(() => checkCatalogPublicContract(leaking.fetchMock, NO_DELAY), /Contrato inseguro: a coluna proibida supplier_id pode ser selecionada/);
});

test('repete leitura após falha transitória de rede, 5xx ou 429 e aprova quando a origem se recupera', async (t) => {
  canonicalEnv(t);
  const { fetchMock, count } = healthyFetch((kind, nth) => {
    if (kind === 'baseline' && nth === 1) throw networkError('ECONNRESET');
    if (kind === 'scan' && nth === 1) return new Response('bad gateway', { status: 502 });
    if (kind === 'site-count' && nth === 1) return new Response('{}', { status: 429 });
    if (kind === 'probe' && nth === 2) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    if (kind === 'probe' && nth === 4) return new Response('{}', { status: 503 });
    return null;
  });
  assert.deepEqual(await checkCatalogPublicContract(fetchMock, NO_DELAY), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
  assert.equal(count('baseline'), 3);
  assert.equal(count('scan'), 3);
  assert.equal(count('site-count'), 2);
  assert.equal(count('probe'), 6);
});

test('repetição de leitura também cobre 401 da camada Auth com backoff nas contagens e na varredura', async (t) => {
  canonicalEnv(t);
  const { fetchMock, count } = healthyFetch((kind, nth) => {
    // 401 na 1ª contagem baseline, na 1ª página da varredura e na 1ª contagem site.
    if (kind === 'baseline' && nth === 1) return new Response('{}', { status: 401 });
    if (kind === 'scan' && nth === 1) return new Response('{}', { status: 401 });
    if (kind === 'site-count' && nth === 1) return new Response('{}', { status: 401 });
    return null;
  });
  assert.deepEqual(await checkCatalogPublicContract(fetchMock, NO_DELAY), {
    inspectedRows: 1,
    columns: 36,
    warnings: { blankSwatchNames: 0, duplicateSwatchNames: 0 },
  });
  assert.equal(count('baseline'), 3);
  assert.equal(count('scan'), 3);
  assert.equal(count('site-count'), 2);
});

test('401 persistente nas leituras reprova com o código HTTP, sem esperar para sempre', async (t) => {
  canonicalEnv(t);
  const unauth = healthyFetch(() => new Response('{}', { status: 401 }));
  await assert.rejects(
    () => checkCatalogPublicContract(unauth.fetchMock, NO_DELAY),
    /Contrato inconclusivo: v_products_public respondeu HTTP 401\./,
  );
});

test('falha de rede persistente reprova com causa e recurso, depois de três tentativas', async (t) => {
  canonicalEnv(t);
  const refused = healthyFetch(() => { throw networkError('ECONNREFUSED'); });
  await assert.rejects(
    () => checkCatalogPublicContract(refused.fetchMock, NO_DELAY),
    /^Error: Contrato indisponível: falha de rede ao consultar v_products_public após 3 tentativa\(s\) \(ECONNREFUSED\)\.$/,
  );
  assert.equal(refused.requests.length, 3);
  const timeout = healthyFetch((kind) => { if (kind === 'scan') throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); return null; });
  await assert.rejects(
    () => checkCatalogPublicContract(timeout.fetchMock, NO_DELAY),
    /falha de rede ao consultar v_site_products_public após 3 tentativa\(s\) \(TimeoutError: The operation was aborted due to timeout\)/,
  );
  const once = healthyFetch(() => { throw networkError('ENOTFOUND'); });
  await assert.rejects(() => checkCatalogPublicContract(once.fetchMock, { retryDelaysMs: [] }), /após 1 tentativa\(s\) \(ENOTFOUND\)/);
  assert.equal(once.requests.length, 1);
});

test('erro HTTP persistente reprova com o status; 4xx não é repetido', async (t) => {
  canonicalEnv(t);
  const down = healthyFetch((kind) => (kind === 'scan' ? new Response('erro', { status: 500 }) : null));
  await assert.rejects(() => checkCatalogPublicContract(down.fetchMock, NO_DELAY), /Contrato indisponível: v_site_products_public respondeu HTTP 500\./);
  assert.equal(down.count('scan'), 3);
  const unauthorized = healthyFetch((kind) => (kind === 'baseline' ? new Response('{}', { status: 401 }) : null));
  await assert.rejects(() => checkCatalogPublicContract(unauthorized.fetchMock, NO_DELAY), /Contrato inconclusivo: v_products_public respondeu HTTP 401\./);
  assert.equal(unauthorized.requests.length, 1);
});

test('erro que não é de rede atravessa sem repetição nem disfarce', async (t) => {
  canonicalEnv(t);
  const broken = healthyFetch(() => { throw new RangeError('defeito no chamador'); });
  await assert.rejects(() => checkCatalogPublicContract(broken.fetchMock, NO_DELAY), (error) => error instanceof RangeError);
  assert.equal(broken.requests.length, 1);
});

test('resposta sem contagem exata, corpo que não é JSON ou não é lista é reprovada', async (t) => {
  canonicalEnv(t);
  const noRange = healthyFetch((kind) => (kind === 'baseline' ? new Response('[]', { status: 200 }) : null));
  await assert.rejects(() => checkCatalogPublicContract(noRange.fetchMock, NO_DELAY), /v_products_public não informou contagem exata/);
  const unknownTotal = healthyFetch((kind) => (kind === 'baseline' ? new Response('[]', { status: 200, headers: { 'content-range': '0-0/*' } }) : null));
  await assert.rejects(() => checkCatalogPublicContract(unknownTotal.fetchMock, NO_DELAY), /não informou contagem exata/);
  for (const body of ['<html>gateway</html>', '{"message":"ok"}', 'null', '']) {
    const html = healthyFetch((kind) => (kind === 'scan' ? new Response(body, { status: 200, headers: { 'content-range': '0-0/1' } }) : null));
    await assert.rejects(() => checkCatalogPublicContract(html.fetchMock, NO_DELAY), /a resposta do catálogo não é uma lista/);
  }
  const empty = healthyFetch((kind) => (kind === 'scan' ? catalogResponse([], 0) : kind === 'probe' ? null : baselineResponse(0)));
  await assert.rejects(() => checkCatalogPublicContract(empty.fetchMock, NO_DELAY), /não devolveu produto algum para inspeção/);
});

test('configuração ausente, malformada ou apontando para outra origem é recusada antes de qualquer requisição', async (t) => {
  restoreEnvAfter(t);
  const neverFetch = async () => assert.fail('não deveria fazer requisição');
  const cases = [
    [undefined, 'sb_publishable_fixture', /VITE_SUPABASE_URL ausente/],
    ['   ', 'sb_publishable_fixture', /VITE_SUPABASE_URL ausente/],
    ['doufsxqlfjyuvxuezpln.supabase.co', 'sb_publishable_fixture', /VITE_SUPABASE_URL inválida/],
    ['não é url', 'sb_publishable_fixture', /VITE_SUPABASE_URL inválida/],
    ['http://doufsxqlfjyuvxuezpln.supabase.co', 'sb_publishable_fixture', /Alvo recusado/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co:8443', 'sb_publishable_fixture', /Alvo recusado/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co@exemplo.test', 'sb_publishable_fixture', /Alvo recusado/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co.exemplo.test', 'sb_publishable_fixture', /Alvo recusado/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co', undefined, /ausente ou privilegiada/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co', '  ', /ausente ou privilegiada/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co', 'a.b.c', /ausente ou privilegiada/],
    ['https://doufsxqlfjyuvxuezpln.supabase.co', `x.${Buffer.from('"anon"').toString('base64url')}.y`, /ausente ou privilegiada/],
  ];
  for (const [url, key, pattern] of cases) {
    if (url === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = url;
    if (key === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = key;
    await assert.rejects(() => checkCatalogPublicContract(neverFetch, NO_DELAY), pattern, `${url} / ${key}`);
  }
  process.env.VITE_SUPABASE_URL = ' https://DOUFSXQLFJYUVXUEZPLN.supabase.co/rest/v1/?x=1 ';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = ' sb_publishable_fixture ';
  assert.equal((await checkCatalogPublicContract(healthyFetch().fetchMock, NO_DELAY)).inspectedRows, 1, 'caminho, caixa do host e espaços em volta não mudam a origem');
});

// CLI de ponta a ponta sem rede: um módulo pré-carregado troca o fetch global por um
// catálogo falso. A origem continua travada no projeto canônico pelo próprio script.
const SCRIPT = fileURLToPath(new URL('../scripts/check-catalog-public-contract.mjs', import.meta.url));

function runCli(t, { mode, scriptPath = SCRIPT, env = {} }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog contract é-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const preload = path.join(directory, 'fake-fetch.mjs');
  const columns = JSON.stringify(EXPECTED_CATALOG_COLUMNS);
  fs.writeFileSync(preload, `
const columns = ${columns};
const row = { ...Object.fromEntries(columns.map((column) => [column, null])), id: '11111111-1111-4111-8111-111111111111', name: 'Mochila', sku: 'MO-42', slug: 'mochila', images: [], materials: [], colors: [], color_swatches: [{ color_name: ' ' }], is_active: true };
const json = (body, total) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-range': body.length ? '0-0/' + total : '*/' + total } });
globalThis.fetch = async (input) => {
  const url = new URL(input);
  if (url.origin !== 'https://doufsxqlfjyuvxuezpln.supabase.co') throw new Error('origem inesperada: ' + url.origin);
  if (${JSON.stringify(mode)} === 'offline') throw new TypeError('fetch failed', { cause: Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }) });
  const select = url.searchParams.get('select');
  if (select === 'id') return json([{ id: row.id }], 1);
  if (select.startsWith('id,')) return new Response('{"code":"42703"}', { status: 400 });
  if (${JSON.stringify(mode)} === 'leak' && !url.searchParams.has('id')) return json([{ ...row, sale_price: 10 }], 1);
  return json(url.searchParams.has('id') ? [] : [row], 1);
};
`);
  const link = path.join(directory, 'atalho.mjs');
  fs.symlinkSync(SCRIPT, link);
  const cleanEnv = { ...process.env };
  delete cleanEnv.VITE_SUPABASE_URL;
  delete cleanEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  return spawnSync(process.execPath, ['--import', preload, scriptPath === 'symlink' ? link : scriptPath], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...cleanEnv, VITE_SUPABASE_URL: 'https://doufsxqlfjyuvxuezpln.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', ...env },
  });
}

test('CLI: contrato íntegro sai com código 0, resultado e avisos em stdout', (t) => {
  for (const scriptPath of [SCRIPT, 'symlink']) {
    const result = runCli(t, { mode: 'ok', scriptPath });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'Contrato público aprovado: 36 colunas, 1 produtos inspecionados, nenhuma coluna proibida.\nAvisos de qualidade da origem: 1 swatch(es) sem nome e 0 nome(s) duplicado(s).\n');
    assert.equal(result.stderr, '');
  }
});

test('CLI: vazamento, origem fora do ar e configuração ausente saem com código 1 e uma linha em stderr', (t) => {
  const leak = runCli(t, { mode: 'leak' });
  assert.equal(leak.status, 1);
  assert.equal(leak.stdout, '');
  assert.equal(leak.stderr, 'Contrato inseguro: produto 1 expõe colunas proibidas: sale_price.\n');

  const offline = runCli(t, { mode: 'offline' });
  assert.equal(offline.status, 1);
  assert.equal(offline.stderr, 'Contrato indisponível: falha de rede ao consultar v_products_public após 3 tentativa(s) (ENOTFOUND).\n');

  for (const scriptPath of [SCRIPT, 'symlink']) {
    const unconfigured = runCli(t, { mode: 'ok', scriptPath, env: { VITE_SUPABASE_URL: '' } });
    assert.equal(unconfigured.status, 1, 'por symlink a sonda também tem de rodar, não sair com 0 em silêncio');
    assert.equal(unconfigured.stderr, 'VITE_SUPABASE_URL ausente.\n');
  }
});
