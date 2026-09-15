// Duas abas locais; toda chamada externa é interceptada. Sem login ou logout real.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';

const server = await preview({ configFile: false, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4193, strictPort: true } });
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 });
    if (url.pathname.endsWith('/get_my_quote_requests')) return route.fulfill({ contentType: 'application/json', body: '{"items":[],"total":0,"limit":12,"offset":0}' });
    if (url.pathname.endsWith('/claim_my_quote_requests')) return route.fulfill({ contentType: 'application/json', body: '{"claimed":0}' });
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  const quote = await context.newPage();
  await quote.goto('http://127.0.0.1:4193/');
  await quote.evaluate(() => {
    const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'audit@example.invalid', email_confirmed_at: '2026-09-09T12:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'synthetic-refresh', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user }));
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [{ productId: '11111111-1111-4111-8111-111111111111', key: '11111111-1111-4111-8111-111111111111::sem-cor', slug: 'auditoria', name: 'Produto sintético', sku: 'AUDIT', imageUrl: '/images/product-placeholder.svg', minQuantity: 1, quantity: 100 }] }));
  });
  await quote.goto('http://127.0.0.1:4193/orcamento');
  await quote.locator('#email').fill('audit@example.invalid');
  await quote.locator('[name=privacyAccepted]').check();
  const account = await context.newPage();
  await account.goto('http://127.0.0.1:4193/minha-conta');
  await account.getByRole('button', { name: 'Sair', exact: true }).click();
  await quote.waitForFunction(() => !localStorage.getItem('promo-brindes-customer-session'));
  // Aguarda a limpeza assíncrona disparada pelo SDK na aba de orçamento.
  await quote.waitForFunction(() => !sessionStorage.getItem('promo-brindes:quote-draft:v1'));
  const retainedEmail = await quote.locator('#email').inputValue();
  const retainedConsent = await quote.locator('[name=privacyAccepted]').isChecked();
  await quote.locator('#company').fill('Outra pessoa usando o navegador');
  await quote.waitForFunction(() => Boolean(sessionStorage.getItem('promo-brindes:quote-draft:v1')));
  const stored = await quote.evaluate(() => JSON.parse(sessionStorage.getItem('promo-brindes:quote-draft:v1')));
  assert.equal(retainedEmail, 'audit@example.invalid');
  assert.equal(retainedConsent, true);
  assert.equal(stored.contact.email, 'audit@example.invalid');
  console.log(JSON.stringify({ id: 'R08', environment: 'local-browser-mocked-auth', loggedOut: true,
    draftWasCleared: true, emailRemainsInForm: true, consentRemainsInForm: retainedConsent,
    oldContactRepersistedAfterEditing: true, defectReproduced: true }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
