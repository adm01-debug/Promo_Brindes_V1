import { expect, test, type Page } from '@playwright/test';

// PF-102: a suíte já cobria rota por rota, mas nenhum caso percorria a jornada
// inteira do visitante nem exercitava os dois modificadores que mais quebram
// essa jornada no mundo real — rede lenta e armazenamento do navegador
// bloqueado. As rotas do Supabase e do envio são interceptadas para que o caso
// meça o site, não a disponibilidade do catálogo.

const rootCategoryId = '11111111-1111-4111-8111-111111111111';
const childCategoryId = '22222222-2222-4222-8222-222222222222';

const product = {
  id: 'a74ae6e5-b462-4c9e-8108-663f7fd11e70',
  name: 'Mochila Executiva Sustentável',
  sku: 'MO-42',
  slug: 'mochila-executiva-sustentavel',
  primary_image_url: '/images/product-placeholder.svg',
  primary_image_fallback_url: null,
  set_image_url: null,
  og_image_url: null,
  images: [],
  category_id: childCategoryId,
  main_category_id: rootCategoryId,
  short_description: 'Mochila versátil para ações corporativas.',
  description: 'Um produto útil, elegante e pronto para receber a sua marca.',
  ai_title: null,
  ai_summary: null,
  ai_description: null,
  brand: null,
  stock_quantity: 0,
  min_quantity: 50,
  is_new: true,
  is_featured: true,
  is_bestseller: true,
  is_kit: false,
  allows_personalization: true,
  has_commercial_packaging: false,
  color_swatches: [],
  materials: ['Poliéster reciclado'],
  dimensions: {},
  width_cm: 30,
  height_cm: 42,
  length_cm: 12,
  capacity_ml: null,
  weight_g: 450,
  created_at: '2026-09-01T00:00:00Z',
};

const categories = [
  { id: rootCategoryId, name: 'Tecnologia', parent_id: null },
  { id: childCategoryId, name: 'Áudio', parent_id: rootCategoryId },
];

async function mockCatalog(page: Page, delayMs = 0) {
  await page.route('**/rest/v1/categories?**', async (route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-1/2' }, body: JSON.stringify(categories) });
  });
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, async (route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([product]) });
  });
}

async function mockQuoteSubmission(page: Page) {
  const state = { submissions: 0, payload: undefined as Record<string, unknown> | undefined };
  await page.route('**/api/quote-requests', (route) => {
    state.submissions += 1;
    state.payload = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: '{"requestId":"quote-jornada","duplicate":false,"confirmations":{"email":"pending","whatsapp":"not_requested"}}',
    });
  });
  return state;
}

async function fillRequiredQuoteContact(page: Page) {
  await page.locator('#name').fill('Pessoa de teste');
  await page.locator('#company').fill('Empresa de teste');
  await page.locator('#email').fill('pessoa@example.invalid');
  await page.locator('#phone').fill('11999999999');
  await page.getByRole('checkbox', { name: /Li o aviso de privacidade/ }).check();
}

/** Descoberta → catálogo → produto → seleção → briefing, sem atalho por URL. */
async function walkDiscoveryToSelection(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Catálogos por campanha' }).first().click();
  await expect(page).toHaveURL(/\/catalogos$/);
  await page.getByRole('link', { name: 'Radar completo' }).first().click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByText('1 produto encontrado')).toBeVisible();
  await page.getByRole('link', { name: new RegExp(product.name, 'i') }).first().click();
  await expect(page).toHaveURL(new RegExp(`/produto/${product.slug}$`));
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  await page.getByRole('button', { name: /Adicionar à minha seleção/i }).click();
  await expect(page.getByRole('dialog', { name: 'Minha seleção' })).toBeVisible();
  await page.getByRole('link', { name: /^Transformar em briefing$/i }).click();
  await expect(page).toHaveURL(/\/orcamento$/);
  await expect(page.getByRole('heading', { name: 'Transforme sua seleção em briefing.' })).toBeVisible();
  await expect(page.getByText(product.name).first()).toBeVisible();
}

test('jornada completa: home, catálogos, catálogo, produto, briefing enviado', async ({ page }) => {
  await mockCatalog(page);
  const submission = await mockQuoteSubmission(page);

  await walkDiscoveryToSelection(page);
  await fillRequiredQuoteContact(page);
  await page.getByRole('button', { name: 'Enviar briefing' }).click();

  await expect(page.getByRole('heading', { name: /recebemos sua seleção com 1 produto\./ })).toBeVisible();
  expect(submission.submissions).toBe(1);
  // O produto chega ao briefing pelo clique real, não por estado semeado: se a
  // seleção se perdesse em qualquer das cinco rotas, o envio iria vazio.
  expect(submission.payload).toMatchObject({ items: [{ productId: product.id }] });
  // Enviado, o rascunho e a seleção saem do navegador — nada de reenvio duplo.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('promo-brindes:quote-selection:v1'))).toBeNull();
});

test('jornada sobrevive a rede lenta: o visitante vê o progresso e a seleção chega ao briefing', async ({ page }) => {
  await mockCatalog(page, 1_200);
  const submission = await mockQuoteSubmission(page);

  await page.goto('/catalogo');
  // Sem estado de progresso o visitante lê "0 produtos encontrados" e desiste.
  await expect(page.getByText('Buscando produtos…')).toBeVisible();
  await expect(page.getByText('1 produto encontrado')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(product.name, 'i') }).first().click();
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  await page.getByRole('button', { name: /Adicionar à minha seleção/i }).click();
  await page.getByRole('link', { name: /^Transformar em briefing$/i }).click();
  await expect(page.getByText(product.name).first()).toBeVisible();

  await fillRequiredQuoteContact(page);
  await page.getByRole('button', { name: 'Enviar briefing' }).click();
  await expect(page.getByRole('heading', { name: /recebemos sua seleção com 1 produto\./ })).toBeVisible();
  expect(submission.submissions).toBe(1);
});

test('jornada sobrevive a armazenamento bloqueado: envia o briefing e não guarda nada', async ({ page }) => {
  // Navegação privada e bloqueio de dados do site fazem o próprio acesso a
  // window.localStorage lançar, não apenas a escrita.
  await page.addInitScript(() => {
    const blocked = () => { throw new DOMException('Acesso ao armazenamento bloqueado', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: blocked });
  });
  await mockCatalog(page);
  const submission = await mockQuoteSubmission(page);

  await walkDiscoveryToSelection(page);
  await fillRequiredQuoteContact(page);
  await page.getByRole('button', { name: 'Enviar briefing' }).click();
  await expect(page.getByRole('heading', { name: /recebemos sua seleção com 1 produto\./ })).toBeVisible();
  expect(submission.submissions).toBe(1);

  // Degradação esperada: sem armazenamento a seleção vive só na aba. Recarregar
  // cai no estado vazio da rota, com a saída para o catálogo, em vez de quebrar.
  await page.goto('/orcamento');
  await expect(page.getByRole('heading', { name: 'Sua seleção ainda está em branco.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Explorar catálogo/i })).toBeVisible();
  await expect(page.getByText(product.name)).toHaveCount(0);
});
