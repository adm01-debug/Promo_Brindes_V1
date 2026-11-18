import { expect, test, type Page } from '@playwright/test';

// PF-103 e vazio nº 1 de docs/MATRIZ_RISCO_CAMADA_TESTE.md: o anexo é o único
// fluxo em que o cliente entrega um arquivo, e nada cobria o caminho em
// navegador — `grep -rlniE 'upload|anexo|briefing-asset' e2e/` devolvia zero
// arquivos. O que existia cobre o handler (tests/api/briefing-assets.test.ts) e
// o banco (briefing_assets.test.sql), não a tela: escolher o arquivo, a reserva,
// a transferência, a verificação server-side e o estado resultante.

const BUCKET = 'customer-briefing-assets';
const product = {
  id: 'a74ae6e5-b462-4c9e-8108-663f7fd11e70',
  name: 'Mochila Executiva Sustentável',
  sku: 'MO-42',
  slug: 'mochila-executiva-sustentavel',
  primary_image_url: '/images/product-placeholder.svg',
  min_quantity: 50,
};

const user = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  email: 'arquivos@empresa.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2026-09-09T12:00:00Z',
  user_metadata: {},
  app_metadata: {},
  created_at: '2026-09-09T12:00:00Z',
};

const reserved = {
  id: '11111111-aaaa-4aaa-8aaa-111111111111',
  path: `${user.id}/11111111-aaaa-4aaa-8aaa-111111111111.png`,
  name: 'marca.png',
  kind: 'logo',
  mimeType: 'image/png',
  sizeBytes: 9,
  quoteRequestId: null,
  verifiedAt: null,
  createdAt: '2026-11-18T01:00:00Z',
  expiresAt: '2026-12-18T01:00:00Z',
};

// PNG real de 9 bytes: a assinatura importa porque é ela que a verificação
// server-side lê, e um arquivo de bytes aleatórios não exercitaria o caminho.
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

async function signIn(page: Page) {
  await page.addInitScript(({ session, selected }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify(session));
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [selected] }));
  }, {
    session: {
      access_token: 'header.payload.signature',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      // Sem `expires_at` no futuro o SDK trata a sessão como vencida e o
      // uploader cai no estado anônimo, que não tem campo de arquivo.
      expires_at: 4102444800,
      token_type: 'bearer',
      user,
    },
    selected: {
      key: `${product.id}::sem-cor`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      imageUrl: product.primary_image_url,
      quantity: 100,
      minQuantity: 50,
    },
  });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/auth/v1/token**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: 4102444800, token_type: 'bearer', user }) }));
  await page.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"claimed":0}' }));
  await page.route('**/rest/v1/rpc/get_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"items":[],"total":0,"limit":12,"offset":0}' }));
  await page.route('**/rest/v1/rpc/list_my_briefing_assets', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
}

/** Registra cada etapa do upload para o teste afirmar o que de fato aconteceu. */
function trackUploadRoutes(page: Page) {
  const calls: string[] = [];
  const route = async (pattern: string | RegExp, name: string, handler: Parameters<Page['route']>[1]) => {
    await page.route(pattern, async (r) => { calls.push(name); await handler(r, undefined as never); });
  };
  return { calls, route };
}

async function chooseFile(page: Page) {
  await page.getByLabel('Enviar logo ou referência').setInputFiles({
    name: reserved.name, mimeType: 'image/png', buffer: PNG_BYTES,
  });
}

test('cliente anexa um PNG: reserva, transferência, verificação e arquivo disponível no briefing', async ({ page }) => {
  await signIn(page);
  const { calls, route } = trackUploadRoutes(page);
  await route('**/rest/v1/rpc/create_my_briefing_asset', 'reserva', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(reserved) }));
  await route(`**/storage/v1/object/${BUCKET}/**`, 'transferencia', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: `${BUCKET}/${reserved.path}` }) }));
  await route('**/api/briefing-assets', 'verificacao', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"verifiedAt":"2026-11-18T01:05:00.000Z"}' }));

  await page.goto('/orcamento');
  await expect(page.getByRole('heading', { name: 'Transforme sua seleção em briefing.' })).toBeVisible();
  await chooseFile(page);

  // O arquivo só serve ao briefing se aparecer selecionável: é o que liga o
  // anexo ao orçamento enviado.
  const escolha = page.getByRole('checkbox', { name: new RegExp(reserved.name) });
  await expect(escolha).toBeVisible({ timeout: 15_000 });
  await expect(escolha).toBeChecked();
  // As três etapas, na ordem: sem a verificação o arquivo fica no bucket sem
  // ninguém atestar que o conteúdo é o que o cliente declarou.
  expect(calls).toEqual(['reserva', 'transferencia', 'verificacao']);
});

test('verificação recusa o conteúdo: o cliente é avisado e o arquivo não fica para trás', async ({ page }) => {
  await signIn(page);
  const { calls, route } = trackUploadRoutes(page);
  await route('**/rest/v1/rpc/create_my_briefing_asset', 'reserva', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(reserved) }));
  await route(`**/storage/v1/object/${BUCKET}/**`, 'transferencia', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: `${BUCKET}/${reserved.path}` }) }));
  await route('**/api/briefing-assets', 'verificacao', (r) => r.fulfill({
    status: 422,
    contentType: 'application/json',
    body: '{"error":"briefing_asset_signature_mismatch","message":"O conteúdo do arquivo não corresponde ao formato informado."}',
  }));
  await route('**/rest/v1/rpc/delete_my_briefing_asset', 'limpeza-metadado', (r) => r.fulfill({ contentType: 'application/json', body: 'null' }));

  await page.goto('/orcamento');
  await chooseFile(page);

  // A mensagem do servidor chega à tela: um "não foi possível enviar" genérico
  // esconderia do cliente que o problema é o conteúdo do arquivo dele.
  await expect(page.getByText('O conteúdo do arquivo não corresponde ao formato informado.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('checkbox', { name: new RegExp(reserved.name) })).toHaveCount(0);
  // Recusado, o metadado é apagado: reserva órfã viraria arquivo invisível
  // contando no limite de 10 anexos do cliente.
  await expect.poll(() => calls.includes('limpeza-metadado'), { timeout: 15_000 }).toBe(true);
});
