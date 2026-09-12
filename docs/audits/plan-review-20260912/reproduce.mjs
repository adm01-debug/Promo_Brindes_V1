// Diagnósticos da revisão: dados sintéticos, backend interceptado, sem escritas remotas.
// Executar contra servidor LOCAL com endpoint de orçamento e Auth habilitados.
// Preparação e limites estão no README.md deste diretório; não apontar para produção.
import { chromium } from '@playwright/test';
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const base = process.env.PB_AUDIT_BASE_URL || 'http://127.0.0.1:4181';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) {
  throw new Error('Este diagnóstico só pode usar um servidor local.');
}
const id = 'aaaaaaaa-1111-4111-8111-111111111111';
const item = { key: `${id}::sem-cor`, productId: id, slug: 'produto-auditoria', name: 'Produto sintético', sku: 'QA-1', imageUrl: '/images/product-placeholder.svg', quantity: 100, minQuantity: 50 };
const results = [];
const browser = await chromium.launch();
async function makePage(auth = false) {
  const page = await browser.newPage();
  await page.route('**/*.supabase.co/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/**', route => route.fulfill({ status: 501, contentType: 'application/json', body: '{"message":"audit_unhandled_mock"}' }));
  await page.addInitScript(({ item, auth }) => {
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [item] }));
    if (auth) {
      const user = { id: 'bbbbbbbb-1111-4111-8111-111111111111', email: 'audit@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: {}, app_metadata: {}, email_confirmed_at: '2026-09-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z' };
      localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'synthetic-refresh', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user }));
    }
  }, { item, auth });
  return page;
}
async function fillContact(page) {
  for (const [field, value] of Object.entries({ name: 'Pessoa de teste', company: 'Empresa sintética', email: 'audit@example.invalid', phone: '11999999999' })) await page.locator(`#${field}`).fill(value);
  await page.locator('[name=privacyAccepted]').check();
}
try {
  const page = await makePage();
  let posts = 0;
  await page.route('**/api/quote-requests', route => { posts++; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ requestId: 'cccccccc-1111-4111-8111-111111111111' }) }); });
  await page.goto(`${base}/orcamento`);
  await fillContact(page);
  await page.locator('#actionName').fill('Campanha sintética');
  await page.getByRole('button', { name: 'Enviar briefing', exact: true }).click();
  await page.getByRole('heading', { name: 'Sua solicitação chegou.' }).waitFor();
  // Aguarda o efeito de persistência disparado pelo estado de sucesso.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  results.push({ scenario: 'rascunho_apos_sucesso', posts, ...await page.evaluate(() => {
    const draft = JSON.parse(sessionStorage.getItem('promo-brindes:quote-draft:v1') || 'null');
    return { draftExists: Boolean(draft), contactRetained: Boolean(draft?.contact?.email), consentRetained: Boolean(draft?.contact?.privacyAccepted) };
  }) });
  await page.close();

  const dated = await makePage();
  let sentPastDate;
  await dated.route('**/api/quote-requests', route => { sentPastDate = route.request().postDataJSON()?.briefing?.eventDate; return route.fulfill({ contentType: 'application/json', body: '{"requestId":"synthetic"}' }); });
  await dated.goto(`${base}/orcamento`);
  await fillContact(dated);
  await dated.locator('#eventDate').fill('2020-01-01');
  await dated.getByRole('button', { name: 'Enviar briefing', exact: true }).click();
  await dated.getByRole('heading', { name: 'Sua solicitação chegou.' }).waitFor();
  results.push({ scenario: 'evento_passado_sem_recebimento', submittedEventDate: sentPastDate });
  await dated.close();

  const account = await makePage(true);
  const quoteId = 'dddddddd-1111-4111-8111-111111111111';
  const nextId = 'eeeeeeee-1111-4111-8111-111111111111';
  let calls = 0;
  await account.route('**/rest/v1/rpc/get_my_quote_request', route => {
    calls++;
    const p = route.request().postDataJSON();
    if (Object.values(p).includes(nextId)) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"synthetic_failure"}' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: quoteId, protocol: 'QA-ORIGINAL', status: 'quoted', company: 'Empresa anterior', contactName: 'Pessoa de teste', email: 'audit@example.invalid', phone: '11999999999', createdAt: '2026-09-01T00:00:00Z', submittedAt: '2026-09-01T00:00:00Z', items: [item], events: [], proposals: [{ id: 'ffffffff-1111-4111-8111-111111111111', title: 'Proposta vencida', version: 1, isCurrent: true, validUntil: '2020-01-01', publishedAt: '2020-01-01T00:00:00Z' }] }) });
  });
  await account.goto(`${base}/minha-conta/orcamentos/${quoteId}`);
  await account.getByRole('heading', { name: 'Empresa anterior', exact: true }).waitFor();
  results.push({ scenario: 'proposta_vencida', proposalText: await account.locator('.customer-proposals').innerText() });
  await account.evaluate(nextId => {
    history.pushState({}, '', `/minha-conta/orcamentos/${nextId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, nextId);
  await account.waitForFunction(() => !document.body.textContent.includes('Carregando solicitação'));
  await account.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  results.push({ scenario: 'troca_solicitacao_com_erro', calls, urlHasNewId: account.url().includes(nextId), oldTitleVisible: await account.getByRole('heading', { name: 'Empresa anterior', exact: true }).isVisible(), genericErrorVisible: await account.getByRole('heading', { name: 'Não foi possível abrir.', exact: true }).isVisible() });
  await account.close();
} finally { await browser.close(); }

// Executa a função real de reconciliação com fetch sintético; não chama a API pública.
function transpile(path) { return ts.transpileModule(readFileSync(new URL(path, root), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText; }
const dataUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const contractsUrl = dataUrl(transpile('api/_lib/contracts.ts'));
const module = await import(dataUrl(transpile('api/_lib/catalogValidation.ts').replace("'./contracts.js'", JSON.stringify(contractsUrl))));
const originalFetch = globalThis.fetch;
const oldKey = process.env.CATALOG_SUPABASE_PUBLISHABLE_KEY;
process.env.CATALOG_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic';
try {
  for (const minimum of [null, 0, 50]) {
    globalThis.fetch = async () => new Response(JSON.stringify([{ id, name: item.name, slug: item.slug, sku: item.sku, min_quantity: minimum, color_swatches: [] }]));
    try {
      const p = await module.reconcileQuoteItems({ items: [{ ...item, variantId: 'variante-que-nao-existe', colorName: 'Cor inexistente' }] });
      results.push({ scenario: 'reconciliar_catalogo', minimum, accepted: true, storedMinimum: p.items[0].minQuantity, acceptedUnknownVariant: p.items[0].variantId === 'variante-que-nao-existe' });
    } catch (error) { results.push({ scenario: 'reconciliar_catalogo', minimum, accepted: false, code: error.code }); }
  }
} finally {
  globalThis.fetch = originalFetch;
  if (oldKey === undefined) delete process.env.CATALOG_SUPABASE_PUBLISHABLE_KEY; else process.env.CATALOG_SUPABASE_PUBLISHABLE_KEY = oldKey;
}
writeFileSync(new URL('simulations.json', import.meta.url), `${JSON.stringify({ date: new Date().toISOString(), environment: 'local-mocked', results }, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
