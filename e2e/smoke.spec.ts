import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const rootCategoryId = '11111111-1111-4111-8111-111111111111';
const childCategoryId = '22222222-2222-4222-8222-222222222222';
const thirdCategoryId = '33333333-3333-4333-8333-333333333333';
const fourthCategoryId = '44444444-4444-4444-8444-444444444444';

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
  color_swatches: [{
    variant_id: 'variant-blue',
    color_name: 'Azul',
    color_hex: '#0047ab',
    stock_quantity: 0,
    is_in_stock: false,
  }],
  materials: ['Poliéster reciclado'],
  dimensions: {},
  width_cm: 30,
  height_cm: 42,
  length_cm: 12,
  capacity_ml: null,
  weight_g: 450,
  created_at: '2026-09-01T00:00:00Z',
};

async function mockCatalog(page: Page) {
  await page.route('**/rest/v1/categories?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'content-range': '0-1/2' },
      body: JSON.stringify([
        { id: rootCategoryId, name: 'Tecnologia', parent_id: null },
        { id: childCategoryId, name: 'Áudio', parent_id: rootCategoryId },
        { id: thirdCategoryId, name: 'Casa e cozinha', parent_id: null },
        { id: fourthCategoryId, name: 'Escritório', parent_id: null },
      ]),
    });
  });
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, async (route) => {
    expect(new URL(route.request().url()).searchParams.has('stock_quantity')).toBe(false);
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: JSON.stringify([product]),
    });
  });
}

async function waitForRoute(page: Page) {
  await expect(page.locator('.route-fallback')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => mockCatalog(page));

test('headline principal usa Fold Text sem perder acessibilidade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Sua campanha merece um brinde que ninguém esquece.' })).toBeVisible();
  await expect(page.locator('#hero-title .fold-text-piece')).toHaveCount(8);
  await expect(page.locator('#featured-title .glitch-text')).toHaveText('Drop da vez.');

  const motionState = await page.locator('#hero-title .fold-text-piece').evaluateAll((pieces) =>
    pieces.map((piece) => ({
      opacity: getComputedStyle(piece).opacity,
      transform: getComputedStyle(piece).transform,
    })),
  );
  expect(motionState.every(({ opacity, transform }) => opacity === '1' && transform === 'none')).toBe(true);
  const glitchAnimation = await page.locator('#featured-title .glitch-text').evaluate((element) =>
    getComputedStyle(element, '::before').animationName,
  );
  expect(glitchAnimation).toBe('none');
});

test('manifesto transforma as frases da marca em uma narrativa com próximo passo', async ({ page }) => {
  await page.goto('/');

  const manifesto = page.locator('.brand-manifesto');
  await expect(manifesto.getByRole('heading', { name: 'Entender para atender' })).toBeVisible();
  await expect(manifesto.getByRole('heading', { name: 'Conectando Marcas e Pessoas' })).toBeVisible();
  await expect(manifesto.getByRole('heading', { name: 'Excelência em cada detalhe' })).toBeVisible();
  await expect(manifesto.getByRole('heading', { name: 'Encantar pessoas, somos bons nisso!' })).toBeVisible();

  await manifesto.getByRole('link', { name: 'Criar algo memorável' }).click();
  await expect(page).toHaveURL(/#conversa$/);
  await expect(page.locator('#conversa')).toBeInViewport();
});

test('mostra produto sem estoque confiável e leva o cliente ao briefing sem checkout', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(page.getByRole('heading', { name: 'Seu moodboard começa aqui.' })).toBeVisible();
  await expect(page.getByText('1 produto encontrado')).toBeVisible();
  await page.getByRole('link', { name: /Mochila Executiva Sustentável/i }).first().click();
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Azul' })).toBeVisible();
  await expect(page.getByText(/não paga nada pelo site/i)).toBeVisible();
  await page.getByRole('button', { name: /Salvar no meu moodboard/i }).click();
  await expect(page.getByRole('dialog', { name: 'Meus saves' })).toBeVisible();
  await page.getByRole('link', { name: /^Transformar em briefing$/i }).click();
  await expect(page.getByRole('heading', { name: 'Transforme o moodboard em briefing.' })).toBeVisible();
  await expect(page.getByText('Não há pagamento nem compromisso nesta etapa.')).toBeVisible();
  await waitForRoute(page);
  const briefingA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(briefingA11y.violations, 'Violações no briefing preenchível').toEqual([]);
});

test('menu e busca permanecem utilizáveis em tela móvel', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Cenário dedicado ao viewport móvel.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.locator('#mobile-search').fill('mochila');
  await page.locator('.mobile-search').getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/\/catalogo\?q=mochila/);
});

test('convite editorial de contato valida o essencial sem esconder labels', async ({ page }) => {
  await page.goto('/contato');
  await expect(page.getByRole('heading', { name: 'Quer impressionar seu público? Vamos conversar.' })).toBeVisible();
  await page.getByRole('button', { name: 'Falar com a Promo' }).click();
  const name = page.getByLabel('Seu nome *');
  await expect(name).toBeFocused();
  await expect(page.getByText('Conte para a gente como chamar você.')).toBeVisible();
  await expect(page.getByText('Autorize o contato para continuar.')).toBeVisible();
});

test('superfiltro móvel combina critérios, preserva a URL e devolve o foco', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Cenário dedicado ao drawer móvel.');
  await page.goto('/catalogo');
  const trigger = page.getByRole('button', { name: 'Afinar o radar' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Afine seu radar' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'Expandir Tecnologia' }).click();
  await dialog.getByRole('checkbox', { name: 'Áudio' }).click();
  await expect(page).toHaveURL(new RegExp(`categorias=${childCategoryId}`));
  await expect(dialog.getByRole('checkbox', { name: 'Áudio' })).toBeChecked();
  await dialog.getByRole('button', { name: /^Cor Preto/ }).click();
  await expect(page).toHaveURL(/cores=preto/);
  await dialog.getByRole('checkbox', { name: 'Aço inox' }).click();
  await expect(page).toHaveURL(/materiais=aco-inox/);
  await expect(dialog.getByRole('checkbox', { name: 'Aço inox' })).toBeChecked();

  const filteredRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.includes('products_public') && url.searchParams.get('allows_personalization') === 'eq.true';
  });
  await dialog.getByRole('checkbox', { name: /Personalizável/ }).click();
  const requestUrl = new URL((await filteredRequest).url());
  expect(requestUrl.searchParams.get('and')).toContain(childCategoryId);
  expect(requestUrl.searchParams.get('and')).toContain('colors.cs."[\\"PRETO\\"]"');
  expect(requestUrl.searchParams.get('and')).toContain('materials.cs."[\\"Aço Inox\\"]"');
  await expect(dialog.getByRole('button', { name: /Ver 1 produto/ })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('templates principais não apresentam violações automáticas WCAG A/AA', async ({ page }) => {
  for (const path of ['/', '/catalogo', `/produto/${product.slug}`, '/sobre', '/contato', '/privacidade', '/orcamento']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await waitForRoute(page);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations, `Violações em ${path}`).toEqual([]);
  }
});

test('mudança de rota posiciona o foco no conteúdo principal', async ({ page }) => {
  await page.goto('/');
  await waitForRoute(page);
  await page.getByRole('link', { name: 'Como funciona' }).first().click();
  await expect(page).toHaveURL(/\/sobre$/);
  await expect(page.locator('#conteudo')).toBeFocused();
});

test('produto com identificador inválido falha fechado e não pode ser indexado', async ({ page }) => {
  await page.goto('/produto/slug),or(is_active.eq.false');
  await waitForRoute(page);
  await expect(page.getByRole('heading', { name: 'O catálogo fez uma pausa.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});

test('limpar a busca remove também seu estado compartilhável da URL', async ({ page }) => {
  await page.goto('/catalogo?q=squeeze');
  await expect(page.getByRole('heading', { name: 'Matchs para “squeeze”' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole('heading', { name: 'Radar completo' })).toBeVisible();
});

test('falha temporária no detalhe oferece retry e recupera o produto', async ({ page }) => {
  let attempts = 0;
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Serviço temporariamente indisponível"}' });
      return;
    }
    await route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([product]) });
  });
  await page.goto(`/produto/${product.slug}`);
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
});
