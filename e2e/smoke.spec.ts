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

/**
 * Clipboard permissions are implemented by Chromium only.  The product still
 * uses the same Web Clipboard API everywhere; this shim keeps the assertion
 * portable for Firefox/WebKit without asking those engines for an unsupported
 * browser permission.
 */
async function enableClipboardForTest(page: Page, projectName: string) {
  if (projectName.includes('chromium')) {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    return;
  }

  await page.addInitScript(() => {
    let value = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          value = text;
        },
        readText: async () => value,
      },
    });
  });
}

test.beforeEach(async ({ page }) => mockCatalog(page));

test('headline principal usa Fold Text sem perder acessibilidade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Sua campanha merece um brinde que ninguém esquece.' })).toBeVisible();
  const headerLogo = page.locator('.brand img');
  await expect(headerLogo).toHaveAttribute('src', '/brand/promo-brindes-logo-v2-800.webp');
  await expect(page.locator('.footer-brand img')).toHaveAttribute('src', '/brand/promo-brindes-logo-v2-800.webp');
  expect(await headerLogo.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([800, 420]);
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

test('rotas públicas essenciais não introduzem violações automáticas de acessibilidade', async ({ page }) => {
  const routes = [
    ['/', 'Sua campanha merece um brinde que ninguém esquece.'],
    ['/catalogo', 'Sua seleção começa aqui.'],
    ['/catalogos', 'Catálogos para tirar seu briefing do branco'],
    ['/montar-kit', 'Monte um kit que faça sentido.'],
    ['/datas-comemorativas', 'Marque a data. Deixe sua marca.'],
    ['/contato', 'Uma boa ideia começa com um bom briefing.'],
    ['/entrar', /Acesso em configuração|Seus briefings/],
  ] as const;

  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations, `Violações em ${path}`).toEqual([]);
  }
});

test('montador de kits preserva componentes e calcula a quantidade completa', async ({ page }) => {
  const products = [
    product,
    { ...product, id: 'b74ae6e5-b462-4c9e-8108-663f7fd11e71', slug: 'garrafa-termica', sku: 'GA-10', name: 'Garrafa térmica', min_quantity: 60 },
    { ...product, id: 'c74ae6e5-b462-4c9e-8108-663f7fd11e72', slug: 'caderno-capa-dura', sku: 'CA-20', name: 'Caderno capa dura', min_quantity: 30 },
  ];
  await page.unroute(/\/rest\/v1\/v_(?:site_)?products_public\?/);
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'content-range': '0-2/3' },
    body: JSON.stringify(products),
  }));

  await page.goto('/montar-kit');
  if ((page.viewportSize()?.width || 0) > 980) {
    const [configBox, summaryBox] = await Promise.all([
      page.locator('.kit-builder__config').boundingBox(),
      page.locator('.kit-builder-summary').boundingBox(),
    ]);
    expect(configBox && summaryBox && Math.abs(configBox.y - summaryBox.y) < 4).toBe(true);
    expect(configBox && summaryBox && summaryBox.x > configBox.x).toBe(true);
  }
  await page.getByRole('button', { name: /2 a 4 itens Composição flexível/ }).click();
  await page.locator('.kit-product-grid > button').filter({ hasText: product.name }).click();
  await expect(page.getByRole('button', { name: 'Item de rotina: escolher produto' })).toBeFocused();
  await expect(page.getByRole('button', { name: /Levar para o briefing/ })).toBeDisabled();
  await page.locator('.kit-product-grid > button').filter({ hasText: 'Garrafa térmica' }).click();
  await expect(page.getByRole('button', { name: /Levar para o briefing/ })).toBeEnabled();
  await page.locator('.kit-product-grid > button').filter({ hasText: 'Caderno capa dura' }).click();
  await expect(page.getByText('3 componentes · mínimo calculado: 60 kits')).toBeVisible();
  await page.getByRole('button', { name: 'Remover Caderno capa dura' }).click();
  await page.getByLabel(`Unidades por kit de ${product.name}`).fill('2');

  await expect(page.getByText('Composição pronta para revisar')).toBeVisible();
  await expect(page.getByText('mínimo calculado: 60 kits')).toBeVisible();
  await expect(page.locator('.kit-builder-summary')).toContainText('300');
  await page.getByRole('button', { name: /Levar para o briefing/ }).click();
  await expect(page.getByText('2 itens · 300 unidades estimadas')).toBeVisible();
  await expect(page.getByText('Minha composição · 100 kits × 2 un.')).toBeVisible();
});

test('manifesto transforma as frases da marca em uma narrativa com próximo passo', async ({ page }) => {
  await page.goto('/');

  const manifesto = page.locator('.brand-manifesto');
  await expect(manifesto.getByRole('heading', { name: 'Entender para atender' })).toBeVisible();
  await expect(manifesto.getByRole('heading', { name: 'Conectando Marcas e Pessoas' })).toBeVisible();
  await expect(manifesto.getByRole('heading', { name: 'Excelência em cada detalhe' })).toBeVisible();
  await expect(manifesto.getByRole('heading', { name: 'Encantar pessoas, somos bons nisso!' })).toBeVisible();

  const [manifestoBox, categoriesBox] = await Promise.all([
    manifesto.boundingBox(),
    page.locator('.category-section').boundingBox(),
  ]);
  expect(manifestoBox && categoriesBox && manifestoBox.y < categoriesBox.y).toBe(true);

  await manifesto.getByRole('link', { name: 'Criar algo memorável' }).click();
  await expect(page).toHaveURL(/#conversa$/);
  await expect(page.locator('#conversa')).toBeInViewport();
});

test('biblioteca de catálogos transforma contexto em coleções compartilháveis', async ({ page }, testInfo) => {
  await enableClipboardForTest(page, testInfo.project.name);
  await page.goto('/catalogos');
  await waitForRoute(page);

  await expect(page.getByRole('heading', { name: /Catálogos para tirar seu briefing do branco/ })).toBeVisible();
  await expect(page).toHaveTitle('Catálogos de brindes | Promo Brindes');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/catalogos$/);
  await expect(page.getByText('10 catálogos encontrados')).toBeVisible();
  await expect(page.locator('.catalog-card')).toHaveCount(10);
  if (testInfo.project.name.includes('mobile')) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.getByRole('button', { name: 'Pessoas & cultura' }).click();
  await expect(page).toHaveURL(/tema=people/);
  await expect(page.locator('.catalog-card')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Pessoas & cultura' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Pessoas & cultura' })).toBeFocused();

  await page.getByLabel('O que você está planejando?').fill('tecnologia mobilidade');
  await page.getByRole('button', { name: 'Linhas de produto' }).click();
  await expect(page).toHaveURL(/q=tecnologia(?:\+|%20)mobilidade.*tema=products|tema=products.*q=tecnologia(?:\+|%20)mobilidade/);
  await expect(page.locator('.catalog-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Tech que resolve' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Linhas de produto' })).toBeFocused();

  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL(/\/catalogos$/);
  await expect(page.locator('.catalog-card')).toHaveCount(10);
  const newDrops = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { name: 'Novos drops' }) });
  await newDrops.getByRole('button', { name: 'Compartilhar Novos drops' }).click();
  await expect(newDrops.getByRole('button', { name: 'Compartilhar Novos drops' })).toContainText('Link copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/catalogo\?perfil=novos$/);
  await page.locator('.catalog-card').filter({ has: page.getByRole('heading', { name: 'Onboarding com cultura' }) }).getByRole('link', { name: /Explorar coleção/ }).click();
  await expect(page).toHaveURL(/\/catalogo\?momento=onboarding.*publico=colaboradores/);
  await expect(page).not.toHaveURL(/perfil=kits/);
});

test('seleção compartilhada copia o link e anuncia o resultado', async ({ page }, testInfo) => {
  await enableClipboardForTest(page, testInfo.project.name);
  const selection = Buffer.from(JSON.stringify({ v: 1, i: [{ id: product.id, q: 100, v: 'variant-blue' }] })).toString('base64url');
  await page.goto(`/selecoes/compartilhada?s=${selection}`);
  await expect(page.getByRole('heading', { name: /Uma direção para começar a conversa/i })).toBeVisible();
  await expect(page.getByText(product.name).first()).toBeVisible();

  await page.getByRole('button', { name: 'Copiar link' }).click();
  await expect(page.getByRole('button', { name: 'Link copiado' })).toBeVisible();
  await expect(page.locator('.shared-selection-hero [role="status"]')).toHaveText('Link copiado para a área de transferência.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/selecoes/compartilhada?s=');
});

test('seleção compartilhada não perde variantes removidas nem permite duplicação silenciosa', async ({ page }) => {
  const selection = Buffer.from(JSON.stringify({ v: 1, i: [
    { id: product.id, q: 100, v: 'variant-removed-blue' },
    { id: product.id, q: 200, v: 'variant-removed-green' },
    { id: '22222222-2222-4222-8222-222222222222', q: 300, v: 'variant-removed-black' },
  ] })).toString('base64url');
  await page.goto(`/selecoes/compartilhada?s=${selection}`);
  await expect(page.getByRole('alert')).toContainText('Esta seleção precisa de revisão.');
  await expect(page.getByText('Variante não publicada')).toHaveCount(2);
  await expect(page.getByText('300 unidades estimadas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duplicar e ajustar' })).toBeDisabled();
});

test('seleção compartilhada bloqueia kit quando o mínimo atual descaracteriza a composição', async ({ page }) => {
  const second = { ...product, id: '22222222-2222-4222-8222-222222222222', name: 'Segundo componente', slug: 'segundo-componente' };
  await page.unroute(/\/rest\/v1\/v_(?:site_)?products_public\?/);
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json', headers: { 'content-range': '0-1/2' },
    body: JSON.stringify([{ ...product, min_quantity: 200 }, second]),
  }));
  const kit = { k: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', kn: 'Conexão 🎁', kq: 100, ku: 1 };
  const selection = Buffer.from(JSON.stringify({ v: 2, i: [
    { id: product.id, q: 100, ...kit }, { id: second.id, q: 100, ...kit, d: 'alternative' },
  ] })).toString('base64url');
  await page.goto(`/selecoes/compartilhada?s=${selection}`);
  await expect(page.getByRole('alert')).toContainText('A composição do kit precisa de revisão.');
  await expect(page.getByText('Alternativa para comparar')).toBeVisible();
  await expect(page.getByText('Revise as referências sinalizadas e peça um link atualizado antes de duplicar esta seleção.')).toBeVisible();
  await expect(page.getByText('Você pode duplicar esta base e ajustar quantidades antes de pedir uma proposta.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Duplicar e ajustar' })).toBeDisabled();
});

test('link persistente espera a consulta e confirma antes de substituir a seleção local', async ({ page }) => {
  const token = '11111111-1111-4111-8111-111111111111';
  await page.addInitScript(() => {
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({
      items: [{ key: 'atual', productId: '99999999-9999-4999-8999-999999999999', slug: 'atual', name: 'Seleção atual', sku: 'ATUAL-1', imageUrl: '/images/product-placeholder.svg', quantity: 50, minQuantity: 50 }],
      selectionTitle: 'Campanha anterior', campaign: { source: 'finder', moment: 'evento' },
    }));
  });
  await page.route('**/api/shared-selections', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ id: product.id, q: 100, v: 'variant-blue' }], expiresAt: '2026-10-11T12:00:00.000Z' }) });
  });

  await page.goto(`/selecoes/compartilhada?s=${token}`);
  await expect(page.getByText('Carregando referências…')).toBeVisible();
  await expect(page.getByText('LINK INVÁLIDO')).toHaveCount(0);
  await expect(page.getByText(product.name).first()).toBeVisible();
  await page.getByRole('button', { name: 'Duplicar e ajustar' }).click();
  await expect(page.getByRole('dialog', { name: 'Substituir sua seleção atual?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Manter minha seleção' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Substituir e ajustar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Manter minha seleção' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Substituir sua seleção atual?' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Duplicar e ajustar' })).toBeFocused();
  await page.getByRole('button', { name: 'Duplicar e ajustar' }).click();
  await page.getByRole('button', { name: 'Substituir e ajustar' }).click();
  await expect(page.getByRole('dialog', { name: 'Minha seleção' })).toBeVisible();
  await expect(page.getByText(product.name).last()).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('promo-brindes:quote-selection:v1') || '{}'))).toEqual(expect.objectContaining({
    items: [expect.objectContaining({ productId: product.id })],
  }));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('promo-brindes:quote-selection:v1') || '{}').selectionTitle)).toBeUndefined();
});

test('soluções editoriais levam a uma curadoria explícita, não a uma promessa de estoque', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Onboarding sem kit genérico/i }).click();
  await expect(page).toHaveURL(/momento=onboarding.*publico=colaboradores/);
  await expect(page).not.toHaveURL(/perfil=kits/);
  await expect(page.getByRole('heading', { name: 'Curadoria para o seu briefing' })).toBeVisible();
});

test('ache pelo briefing transforma intenção em filtros explicáveis e compartilháveis', async ({ page }) => {
  await page.goto('/');
  const finder = page.locator('#ache-pelo-briefing');
  await finder.getByRole('button', { name: /^Onboarding/ }).click();
  await expect(finder.getByRole('heading', { name: 'Quem precisa ser encantado?' })).toBeVisible();
  await finder.getByRole('button', { name: /^Colaboradores/ }).click();
  await finder.getByRole('button', { name: /^51–200/ }).click();
  await finder.getByRole('button', { name: /^Sustentável/ }).click();

  const filteredRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.includes('products_public') && url.searchParams.get('is_kit') === null;
  });
  await finder.getByRole('button', { name: 'Ver minha curadoria' }).click();
  const requestUrl = new URL((await filteredRequest).url());
  expect(requestUrl.searchParams.get('and')).toContain('min_quantity.lte.200');
  expect(requestUrl.searchParams.get('and')).toContain('materials.cs."[\\"Reciclado\\"]"');
  await expect(page).toHaveURL(/momento=onboarding.*publico=colaboradores.*escala=51-200.*clima=sustentavel/);
  await expect(page.getByRole('heading', { name: 'Curadoria para o seu briefing' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Momento: Onboarding/ })).toBeVisible();
});

test('briefing tech espera a taxonomia antes de consultar produtos', async ({ page }) => {
  await page.unroute('**/rest/v1/categories?**');
  let releaseCategories!: () => void;
  const categoriesGate = new Promise<void>((resolve) => { releaseCategories = resolve; });
  await page.route('**/rest/v1/categories?**', async (route) => {
    await categoriesGate;
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'content-range': '0-1/2' },
      body: JSON.stringify([
        { id: rootCategoryId, name: 'Tecnologia', parent_id: null },
        { id: childCategoryId, name: 'Áudio', parent_id: rootCategoryId },
      ]),
    });
  });

  const productRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('products_public')) productRequests.push(request.url());
  });

  await page.goto('/catalogo?clima=tech');
  await expect(page.getByText('Buscando produtos…')).toBeVisible();
  expect(productRequests).toHaveLength(0);

  releaseCategories();
  await expect(page.getByText('1 produto encontrado')).toBeVisible();
  expect(productRequests).toHaveLength(1);
  const productRequest = productRequests[0];
  if (!productRequest) throw new Error('A consulta esperada do catálogo não ocorreu.');
  expect(new URL(productRequest).searchParams.get('and')).toContain(rootCategoryId);
});

test('briefing tech falha fechado quando a taxonomia está indisponível', async ({ page }) => {
  await page.unroute('**/rest/v1/categories?**');
  await page.route('**/rest/v1/categories?**', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Taxonomia temporariamente indisponível' }),
  }));
  const productRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('products_public')) productRequests.push(request.url());
  });

  await page.goto('/catalogo?clima=tech');
  await expect(page.locator('.catalog-message[role="alert"]')).toContainText('Taxonomia temporariamente indisponível');
  expect(productRequests).toHaveLength(0);
});

test('busca sugere linguagem do comprador e aceita teclado', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('#hero-search');
  await search.fill('onbo');
  await expect(page.getByRole('option', { name: /Kits de onboarding/i })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/catalogo\?q=kit(?:\+|%20)boas-vindas/);
});

test('mostra produto sem estoque confiável e leva o cliente ao briefing sem checkout', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(page.getByRole('heading', { name: 'Sua seleção começa aqui.' })).toBeVisible();
  await expect(page.getByText('1 produto encontrado')).toBeVisible();
  await expect(page.getByText('Novidade').first()).toBeVisible();
  await expect(page.getByText('Mín. 50 un.').first()).toBeVisible();
  await page.getByRole('link', { name: /Mochila Executiva Sustentável/i }).first().click();
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Azul' })).toBeVisible();
  await expect(page.getByText(/não paga nada pelo site/i)).toBeVisible();
  const quantity = page.locator('#product-quantity');
  await quantity.fill('');
  await quantity.pressSequentially('250');
  await expect(quantity).toHaveValue('250');
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await expect(quantity).toHaveValue('260');
  await quantity.blur();
  await expect(quantity).toHaveValue('260');
  await page.getByRole('button', { name: `Ampliar foto de ${product.name}` }).click();
  await expect(page.getByRole('dialog', { name: `Foto ampliada de ${product.name}` })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: `Foto ampliada de ${product.name}` })).toBeHidden();
  await page.getByRole('button', { name: /Adicionar à minha seleção/i }).click();
  await expect(page.getByRole('dialog', { name: 'Minha seleção' })).toBeVisible();
  await page.getByRole('link', { name: /^Transformar em briefing$/i }).click();
  await expect(page.getByRole('heading', { name: 'Transforme sua seleção em briefing.' })).toBeVisible();
  const briefingQuantity = page.locator('input[id^="quantity-"]').first();
  await briefingQuantity.fill('');
  await briefingQuantity.pressSequentially('250');
  await expect(briefingQuantity).toHaveValue('250');
  await page.getByRole('button', { name: 'Aumentar quantidade' }).last().click();
  await expect(briefingQuantity).toHaveValue('260');
  await briefingQuantity.blur();
  await expect(briefingQuantity).toHaveValue('260');
  await expect(page.getByText('Não há pagamento nem compromisso nesta etapa.')).toBeVisible();
  await waitForRoute(page);
  const briefingA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(briefingA11y.violations, 'Violações no briefing preenchível').toEqual([]);
});

test('envio confirmado remove contato e consentimento do rascunho da aba', async ({ page }) => {
  await page.addInitScript(({ product }) => {
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [{
      key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name,
      sku: product.sku, imageUrl: product.primary_image_url, quantity: 100, minQuantity: 50,
    }] }));
  }, { product });
  let submissions = 0;
  let sentPayload: Record<string, unknown> | undefined;
  await page.route('**/api/quote-requests', (route) => {
    submissions += 1;
    sentPayload = route.request().postDataJSON();
    return route.fulfill({ status: 201, contentType: 'application/json', body: '{"requestId":"quote-e2e","duplicate":false,"confirmations":{"email":"pending","whatsapp":"pending"}}' });
  });
  await page.goto('/orcamento');
  await page.locator('#name').fill('Pessoa de teste');
  await page.locator('#company').fill('Empresa de teste');
  await page.locator('#email').fill('pessoa@example.invalid');
  await page.locator('#phone').fill('11999999999');
  await page.getByRole('checkbox', { name: /Li o aviso de privacidade/ }).check();
  await page.getByRole('checkbox', { name: /cópia desta solicitação também pelo WhatsApp/ }).check();
  await page.getByRole('button', { name: 'Enviar briefing' }).click();

  await expect(page.getByRole('heading', { name: 'Sua solicitação chegou.' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('promo-brindes:quote-draft:v1'))).toBeNull();
  await expect(page.getByText('Confirmação por e-mail registrada para envio.')).toBeVisible();
  await expect(page.getByText('Confirmação pelo WhatsApp autorizada e registrada para envio.')).toBeVisible();
  expect(submissions).toBe(1);
  expect(sentPayload).toMatchObject({ notificationPreferences: { emailCopy: true, whatsappCopy: true } });
});

// R08: dados pessoais e consentimento não podem sobreviver a uma troca de
// titular em navegador compartilhado. As três rotas de conta abaixo se
// repetem em cada teste porque cada `page`/`context.newPage()` tem seu
// próprio interceptador de rede.
function customerAuthUser(user: { id: string; email: string }) {
  // O SDK valida a resposta de /auth/v1/user contra este formato; um objeto
  // incompleto (faltando aud/role/etc.) faz o signOut() falhar em silêncio.
  return { ...user, aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
}

function synthenticCustomerSession(fullUser: ReturnType<typeof customerAuthUser>) {
  return {
    access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
    user: fullUser,
  };
}

function mockCustomerAccountRoutes(target: Page, fullUser: ReturnType<typeof customerAuthUser>) {
  return Promise.all([
    target.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fullUser) })),
    target.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, contentType: 'application/json', body: '{}' })),
    target.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"claimed":0}' })),
    target.route('**/rest/v1/rpc/get_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"items":[],"total":0,"limit":12,"offset":0}' })),
  ]);
}

test('logout em outra aba invalida contato e consentimento do briefing aberto', async ({ page, context }) => {
  const user = customerAuthUser({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'titular-anterior@empresa.com' });
  await page.addInitScript(({ session, product }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify(session));
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [{ key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 100, minQuantity: 50 }] }));
  }, { session: synthenticCustomerSession(user), product });
  await mockCustomerAccountRoutes(page, user);

  await page.goto('/orcamento');
  await page.locator('#email').fill(user.email);
  await page.getByRole('checkbox', { name: /Li o aviso de privacidade/ }).check();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('promo-brindes:quote-draft:v1') || 'null')?.contact?.email)).toBe(user.email);

  const account = await context.newPage();
  await mockCatalog(account);
  await mockCustomerAccountRoutes(account, user);
  await account.goto('/minha-conta');
  await account.getByRole('button', { name: 'Sair', exact: true }).click();
  // signOut() é fire-and-forget (void auth.signOut() no onClick); fechar a aba
  // antes de a rede real completar aborta a operação em andamento.
  await expect.poll(() => account.evaluate(() => localStorage.getItem('promo-brindes-customer-session'))).toBeNull();
  await account.close();

  // A limpeza do storage é assíncrona (SDK reage ao evento nativo entre abas).
  await expect.poll(() => page.evaluate(() => localStorage.getItem('promo-brindes-customer-session'))).toBeNull();
  await expect.poll(() => page.locator('#email').inputValue()).toBe('');
  await expect(page.getByRole('checkbox', { name: /Li o aviso de privacidade/ })).not.toBeChecked();

  // A regressão real do R08: editar outro campo não pode regravar o contato anterior.
  await page.locator('#company').fill('Outra pessoa usando o navegador');
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('promo-brindes:quote-draft:v1') || 'null')?.contact?.email || '')).toBe('');
});

test('sair encerra a sessão e o próximo briefing aberto começa limpo', async ({ page }) => {
  // addInitScript reaplicaria estes dados a cada navegação da mesma página
  // (inclusive na segunda, para /orcamento), mascarando a limpeza real do
  // signOut. Semeia uma única vez via evaluate() + reload, só para a primeira.
  const user = customerAuthUser({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'saida-mesma-aba@empresa.com' });
  await mockCustomerAccountRoutes(page, user);
  await page.goto('/minha-conta');
  // Achado de auditoria adversarial (20/09/2026): sem esperar a página assentar
  // aqui, o efeito de escrita do QuoteCartContext (dispara a cada render em que
  // `state` muda de referência) corre contra o próprio page.evaluate() abaixo em
  // WebKit — reproduzido 100% das vezes isolando o cenário (goto → evaluate →
  // reload, sem nenhum código de signOut envolvido) e 0% das vezes depois de
  // aguardar `networkidle` antes de semear. Não é bug do CustomerAuthContext nem
  // do signOut (ambos confirmados corretos em ~140 execuções); é o teste
  // escrevendo no storage antes do primeiro mount do React assentar.
  await page.waitForLoadState('networkidle');
  await page.evaluate(({ session, product }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify(session));
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [{ key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 100, minQuantity: 50 }] }));
    sessionStorage.setItem('promo-brindes:quote-draft:v1', JSON.stringify({ contact: { name: 'Pessoa', company: 'Empresa', email: session.user.email, phone: '', city: '', deadline: '', notes: '', privacyAccepted: true, whatsappCopyAccepted: false }, updatedAt: new Date().toISOString() }));
  }, { session: synthenticCustomerSession(user), product });
  await page.reload();
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('promo-brindes-customer-session'))).toBeNull();

  await page.goto('/orcamento');
  await expect(page.locator('#email')).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: /Li o aviso de privacidade/ })).not.toBeChecked();
  expect(await page.evaluate(() => sessionStorage.getItem('promo-brindes:quote-draft:v1'))).toBeNull();
});

test('logout durante envio em andamento não mostra sucesso nem erro de outra pessoa', async ({ page, context }) => {
  const user = customerAuthUser({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', email: 'envio-interrompido@empresa.com' });
  await page.addInitScript(({ session, product }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify(session));
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [{ key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 100, minQuantity: 50 }] }));
  }, { session: synthenticCustomerSession(user), product });
  await mockCustomerAccountRoutes(page, user);
  let releaseSubmission: () => void = () => {};
  const submissionRequested = new Promise<void>((resolve) => {
    releaseSubmission = resolve;
  });
  await page.route('**/api/quote-requests', async (route) => {
    await submissionRequested;
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{"requestId":"quote-interrompido","duplicate":false,"confirmations":{"email":"pending","whatsapp":"pending"}}' });
  });

  await page.goto('/orcamento');
  await page.locator('#name').fill('Pessoa de teste');
  await page.locator('#company').fill('Empresa de teste');
  await page.locator('#email').fill(user.email);
  await page.locator('#phone').fill('11999999999');
  await page.getByRole('checkbox', { name: /Li o aviso de privacidade/ }).check();
  await page.getByRole('button', { name: 'Enviar briefing' }).click();
  await expect(page.getByRole('button', { name: 'Enviando…' })).toBeVisible();

  const account = await context.newPage();
  await mockCatalog(account);
  await mockCustomerAccountRoutes(account, user);
  await account.goto('/minha-conta');
  await account.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect.poll(() => account.evaluate(() => localStorage.getItem('promo-brindes-customer-session'))).toBeNull();
  await account.close();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('promo-brindes-customer-session'))).toBeNull();

  releaseSubmission();
  await page.waitForTimeout(200);
  await expect(page.getByRole('heading', { name: 'Sua solicitação chegou.' })).not.toBeVisible();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await expect(page.locator('#email')).toHaveValue('');
});

test('evento passado recebe erro no campo e não chama a API', async ({ page }) => {
  await page.addInitScript(({ product }) => {
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ items: [{
      key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name,
      sku: product.sku, imageUrl: product.primary_image_url, quantity: 100, minQuantity: 50,
    }] }));
  }, { product });
  let submissions = 0;
  await page.route('**/api/quote-requests', (route) => { submissions += 1; return route.abort(); });
  await page.goto('/orcamento');
  await page.locator('#name').fill('Pessoa de teste');
  await page.locator('#company').fill('Empresa de teste');
  await page.locator('#email').fill('pessoa@example.invalid');
  await page.locator('#phone').fill('11999999999');
  await page.locator('#eventDate').fill('2020-01-01');
  await page.getByRole('checkbox', { name: /Li o aviso de privacidade/ }).check();
  await page.getByRole('button', { name: 'Enviar briefing' }).click();

  await expect(page.locator('#event-date-error')).toContainText('a partir de hoje');
  await expect(page.locator('#eventDate')).toBeFocused();
  expect(submissions).toBe(0);
});

test('card exibe somente o badge de maior prioridade', async ({ page }) => {
  await page.unroute(/\/rest\/v1\/v_(?:site_)?products_public\?/);
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'content-range': '0-0/1' },
    body: JSON.stringify([{
      ...product,
      name: 'Kit executivo sustentável',
      is_new: false,
      is_kit: true,
      created_at: '2026-01-01T00:00:00.000Z',
    }]),
  }));

  await page.goto('/catalogo');
  const card = page.locator('.product-card').first();
  const badges = card.locator('.product-card__badges .badge');
  await expect(badges).toHaveCount(1);
  await expect(badges).toHaveText('Kit');
  await expect(badges).toHaveClass(/badge--kit/);
  await expect(card.getByText('Sua marca aqui')).toHaveCount(0);

  const [badgeBox, imageBox] = await Promise.all([
    card.locator('.product-card__badges').boundingBox(),
    card.locator('.product-card__image-wrap').boundingBox(),
  ]);
  expect(badgeBox && imageBox && badgeBox.y + badgeBox.height <= imageBox.y + imageBox.height).toBe(true);
});

test('comparação mantém no máximo três referências e não sugere preço ou estoque', async ({ page }) => {
  await page.unroute(/\/rest\/v1\/v_(?:site_)?products_public\?/);
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'content-range': '0-2/3' },
    body: JSON.stringify([
      product,
      { ...product, id: 'b74ae6e5-b462-4c9e-8108-663f7fd11e70', sku: 'CO-43', slug: 'copo-43', name: 'Copo térmico', min_quantity: 100, materials: ['Aço inox'] },
      { ...product, id: 'c74ae6e5-b462-4c9e-8108-663f7fd11e70', sku: 'CA-44', slug: 'caderno-44', name: 'Caderno de campanha', min_quantity: 25, materials: ['Papel reciclado'] },
    ]),
  }));

  await page.goto('/catalogo');
  await page.getByRole('button', { name: 'Comparar Mochila Executiva Sustentável' }).click();
  await page.getByRole('button', { name: 'Comparar Copo térmico' }).click();
  await page.getByRole('button', { name: 'Comparar Caderno de campanha' }).click();
  const comparison = page.getByRole('complementary', { name: /3 de 3 referências lado a lado/i });
  await expect(comparison).toBeVisible();
  await expect(comparison).toContainText('Quantidade mínima');
  await expect(comparison).not.toContainText(/R\$|em estoque|indisponível/i);
  await expect(page.getByRole('button', { name: 'Remover Mochila Executiva Sustentável', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('FAQ contextual esclarece limites sem inventar preço ou estoque', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByText('Por que os produtos não mostram preço?').click();
  await expect(page.getByText(/quantidade, técnica de personalização/i)).toBeVisible();
  await page.getByText('Tudo o que aparece pode entrar no orçamento?').click();
  await expect(page.getByText(/confirmados pelo nosso time de especialistas/i)).toBeVisible();
  await page.getByRole('link', { name: /Mochila Executiva Sustentável/i }).first().click();
  await page.getByText('Como descubro se minha logo funciona neste produto?').click();
  await expect(page.getByText(/nosso time de especialistas cruza material, área disponível/i)).toBeVisible();
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
  await expect(page.getByText('Para conversar diretamente com nosso time de especialistas.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quer impressionar seu público? Vamos conversar.' })).toBeVisible();
  await page.getByRole('button', { name: 'Falar com a Promo' }).click();
  const name = page.getByLabel('Seu nome *');
  await expect(name).toBeFocused();
  await expect(page.getByText('Conte para a gente como chamar você.')).toBeVisible();
  await expect(page.getByText('Autorize o contato para continuar.')).toBeVisible();
  await expect(page.getByLabel('O que você quer fazer acontecer? opcional')).toBeVisible();
});

test('limpeza da seleção oferece uma recuperação reversível', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('button', { name: /Adicionar Mochila Executiva Sustentável à seleção/ }).click();
  await page.getByLabel(/Nome da campanha/).fill('Boas-vindas 2026');
  await page.getByRole('button', { name: 'Limpar seleção' }).click();
  const confirmation = page.getByRole('alertdialog', { name: 'Limpar todos os produtos?' });
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole('button', { name: 'Manter seleção' })).toBeFocused();
  await confirmation.getByRole('button', { name: 'Limpar produtos' }).click();
  await expect(page.getByRole('status')).toContainText('Seleção limpa.');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Mochila Executiva Sustentável').last()).toBeVisible();
  await expect(page.getByLabel(/Nome da campanha/)).toHaveValue('Boas-vindas 2026');
});

test('seleção com cinquenta produtos bloqueia a próxima inclusão de forma visível', async ({ page }) => {
  const fullSelection = Array.from({ length: 50 }, (_, index) => {
    const productId = `${String(index + 1).padStart(8, '0')}-1111-4111-8111-111111111111`;
    return {
      key: `${productId}::sem-cor`, productId, slug: `referencia-${index + 1}`, name: `Referência ${index + 1}`,
      sku: `REF-${index + 1}`, imageUrl: '/images/product-placeholder.svg', quantity: 50, minQuantity: 50,
    };
  });
  await page.addInitScript((items) => {
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify(items));
  }, fullSelection);
  await page.goto('/catalogo');
  await page.getByRole('button', { name: `Adicionar ${product.name} à seleção` }).click();

  const drawer = page.getByRole('dialog', { name: 'Minha seleção' });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.quote-drawer__notice[role="status"]')).toContainText('limite de 50 produtos');
  await expect(drawer.locator('.drawer-item')).toHaveCount(50);
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

test('templates principais não apresentam violações automáticas WCAG A/AA', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'), 'Axe é executado uma vez no Chromium; a matriz cobre os fluxos nos demais motores.');
  for (const path of ['/', '/catalogo', '/catalogos', '/datas-comemorativas', `/produto/${product.slug}`, '/sobre', '/contato', '/privacidade', '/orcamento', '/entrar']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await waitForRoute(page);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations, `Violações em ${path}`).toEqual([]);
  }
});

test('agenda transforma uma data em oportunidade salvável e exportável', async ({ page }) => {
  await page.goto('/datas-comemorativas?ano=2026&mes=9');
  await expect(page.getByRole('heading', { name: 'Marque a data. Deixe sua marca.' })).toBeVisible();
  await expect(page.getByText('Dia do Cliente', { exact: true }).first()).toBeVisible();
  const clientDay = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Dia do Cliente' }) });
  const openButton = clientDay.getByRole('button', { name: 'Ver ideias' });
  await openButton.click();
  const dialog = page.getByRole('dialog', { name: 'Dia do Cliente' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Janela sugerida:/)).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Explorar no catálogo' }).first()).toHaveAttribute('href', /\/catalogo\?.*ocasiao=dia-do-cliente.*q=/);
  await dialog.getByRole('button', { name: 'Salvar data' }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Adicionar a data à agenda' }).click();
  expect((await download).suggestedFilename()).toBe('dia-do-cliente-2026.ics');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openButton).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Minhas datas' })).toBeVisible();
  await expect(page.locator('.saved-dates').getByText('Dia do Cliente', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('.dates-calendar')).toHaveAttribute('aria-label', 'Setembro de 2026');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('mudança de rota posiciona o foco no conteúdo principal', async ({ page }) => {
  await page.goto('/');
  await waitForRoute(page);
  await page.getByRole('link', { name: 'Como funciona' }).first().click();
  await expect(page).toHaveURL(/\/sobre$/);
  await expect(page.locator('#conteudo')).toBeFocused();
});

test('rodapé apresenta redes sociais acessíveis e seguras', async ({ page }) => {
  await page.goto('/');
  const social = page.getByRole('navigation', { name: 'Redes sociais da Promo Brindes' });
  await expect(social).toBeVisible();
  for (const network of ['Instagram', 'Facebook', 'Pinterest', 'YouTube']) {
    const link = social.getByRole('link', { name: `Promo Brindes no ${network}` });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

test('área do cliente protege histórico e oferece autenticação acessível', async ({ page }) => {
  await page.goto('/minha-conta');
  await expect(page).toHaveURL(/\/entrar\?next=/);
  await expect(page.getByRole('heading', { name: 'Acessar meus orçamentos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Link ou código' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('E-mail')).toHaveAttribute('autocomplete', 'email');
  await page.getByRole('button', { name: 'Senha', exact: true }).click();
  const passwordInput = page.getByRole('textbox', { name: 'Senha' });
  await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(passwordInput).toHaveAttribute('type', 'text');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('seleção salva explicitamente reaparece em outro navegador da mesma conta', async ({ page, browser }) => {
  const user = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', aud: 'authenticated', role: 'authenticated', email: 'selecao@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  const savedId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const saved: Array<Record<string, unknown>> = [];
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  try {
    await mockCatalog(secondPage);
    for (const current of [page, secondPage]) {
      await current.addInitScript(({ user, isFirst, initialProduct }) => {
        localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
        if (isFirst) localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify({ selectionTitle: 'Boas-vindas de outubro', items: [{ key: `${initialProduct.id}::sem-cor`, productId: initialProduct.id, slug: initialProduct.slug, name: initialProduct.name, sku: initialProduct.sku, imageUrl: initialProduct.primary_image_url, minQuantity: 50, quantity: 100 }] }));
      }, { user, isFirst: current === page, initialProduct: product });
      await current.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
      await current.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"claimed":0}' }));
      await current.route('**/rest/v1/rpc/get_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"items":[],"total":0,"limit":12,"offset":0}' }));
      await current.route('**/rest/v1/rpc/list_my_selections', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: saved }) }));
      await current.route('**/rest/v1/rpc/save_my_selection', (route) => {
        const payload = route.request().postDataJSON() as { p_title: string; p_references: unknown[]; p_campaign?: unknown };
        saved.push({ id: savedId, title: payload.p_title, references: payload.p_references, campaign: payload.p_campaign || null, version: 1, archivedAt: null, createdAt: '2026-09-22T12:00:00Z', updatedAt: '2026-09-22T12:00:00Z' });
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: savedId, version: 1 }) });
      });
    }

    await page.goto('/minha-conta');
    await page.getByRole('button', { name: 'Salvar na minha conta' }).click();
    await expect(page.getByText('Seleção salva na sua conta. Ela poderá ser aberta em outro dispositivo.')).toBeVisible();
    expect(saved).toHaveLength(1);
    await secondPage.goto('/minha-conta');
    await expect(secondPage.getByRole('heading', { name: 'Boas-vindas de outubro' })).toBeVisible();
    await secondPage.getByRole('button', { name: /Retomar seleção/ }).click();
    await expect(secondPage.getByText('Mochila Executiva Sustentável').first()).toBeVisible();
    await expect.poll(() => secondPage.evaluate(() => localStorage.getItem('promo-brindes:quote-selection:v1')))
      .toContain(product.id);
  } finally {
    await secondContext.close();
  }
});

test('histórico recupera de uma falha temporária sem exigir mudança de filtro', async ({ page }) => {
  const quoteId = '66666666-6666-4666-8666-666666666666';
  const user = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', aud: 'authenticated', role: 'authenticated', email: 'recuperacao@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  let listReads = 0;
  await page.addInitScript(({ user }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
  }, { user });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ claimed: 0 }) }));
  await page.route('**/rest/v1/rpc/list_my_selections', (route) => route.fulfill({ contentType: 'application/json', body: '{"items":[]}' }));
  await page.route('**/rest/v1/rpc/get_my_quote_requests', (route) => {
    listReads += 1;
    if (listReads === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary_failure' }) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ id: quoteId, protocol: '66666666', status: 'new', company: 'Empresa Recuperada', createdAt: '2026-09-09T12:00:00Z', desiredDeadline: null, itemCount: 1, totalUnits: 50, productNames: ['Produto de teste'] }], total: 1, limit: 12, offset: 0 }) });
  });

  await page.goto('/minha-conta');
  await expect(page.locator('.customer-results-state[role="alert"]')).toContainText('Não conseguimos carregar seus orçamentos agora.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Empresa Recuperada').first()).toBeVisible();
  expect(listReads).toBe(2);
});

test('callback de acesso inválido falha de forma recuperável e privada', async ({ page }) => {
  await page.goto('/auth/confirm');
  await expect(page.getByRole('heading', { name: 'Não conseguimos vincular seu histórico.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao acesso' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});

test('cliente autenticado confirma antes de substituir a seleção ao reutilizar o orçamento', async ({ page }) => {
  const quoteId = '55555555-5555-4555-8555-555555555555';
  const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'cliente@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  await page.addInitScript(({ user }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
    localStorage.setItem('promo-brindes:quote-selection:v1', JSON.stringify([{ key: 'save-atual', productId: '99999999-9999-4999-8999-999999999999', slug: 'save-atual', name: 'Save atual', sku: 'SAVE-1', imageUrl: '/images/product-placeholder.svg', quantity: 50, minQuantity: 50 }]));
  }, { user });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ claimed: 1, email: user.email }) }));
  await page.route('**/rest/v1/rpc/get_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ id: quoteId, protocol: '55555555', status: 'in_progress', company: 'Empresa Criativa', createdAt: '2026-09-09T12:00:00Z', desiredDeadline: null, itemCount: 1, totalUnits: 100, productNames: ['Mochila Executiva Sustentável'] }], total: 1, limit: 12, offset: 0 }) }));
  await page.route('**/rest/v1/rpc/get_my_quote_request', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: quoteId, protocol: '55555555', status: 'in_progress', company: 'Empresa Criativa', contactName: 'Ana', email: user.email, phone: '(11) 99999-9999', city: 'São Paulo / SP', desiredDeadline: null, notes: 'Onboarding', createdAt: '2026-09-09T12:00:00Z', submittedAt: '2026-09-09T12:00:00Z', items: [{ key: `${product.id}::azul`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 100, minQuantity: 50, colorName: 'Azul', colorHex: '#0047ab' }], events: [{ id: 'event-1', type: 'status_changed', status: 'in_progress', title: 'Curadoria em andamento', description: null, createdAt: '2026-09-09T13:00:00Z' }], proposals: [] }) }));

  await page.goto('/minha-conta');
  await expect(page.getByRole('heading', { name: 'Meus orçamentos' })).toBeVisible();
  await expect(page.getByText('Empresa Criativa').first()).toBeVisible();
  await page.getByRole('link', { name: 'Ver solicitação' }).click();
  await expect(page).toHaveURL(new RegExp(`/minha-conta/orcamentos/${quoteId}$`));
  await expect(page.getByRole('heading', { name: 'Seleção enviada' })).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar novamente' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Trocar sua seleção atual?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Manter minha seleção' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Substituir e continuar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Manter minha seleção' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Trocar sua seleção atual?' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Solicitar novamente' }).first()).toBeFocused();
  await page.getByRole('button', { name: 'Solicitar novamente' }).first().click();
  await page.getByRole('button', { name: 'Substituir e continuar' }).click();
  await expect(page).toHaveURL(/\/orcamento\?repetir=/);
  await expect(page.getByRole('heading', { name: 'Transforme sua seleção em briefing.' })).toBeVisible();
  await expect(page.getByText('Mochila Executiva Sustentável').first()).toBeVisible();
});

test('falha ao abrir proposta fica visível e permite nova tentativa', async ({ page }) => {
  const quoteId = '77777777-7777-4777-8777-777777777777';
  const proposalId = '88888888-8888-4888-8888-888888888888';
  const user = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', aud: 'authenticated', role: 'authenticated', email: 'proposta@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  await page.addInitScript(({ user }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
  }, { user });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ claimed: 0 }) }));
  await page.route('**/rest/v1/rpc/get_my_quote_request', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: quoteId, protocol: '77777777', status: 'quoted', company: 'Empresa Proposta', contactName: 'Bia', email: user.email, phone: '(11) 98888-8888', city: null, desiredDeadline: null, notes: '', createdAt: '2026-09-09T12:00:00Z', submittedAt: '2026-09-09T12:00:00Z', items: [{ key: `${product.id}::preto`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 50, minQuantity: 50, colorName: null, colorHex: null }], events: [], proposals: [{ id: proposalId, version: 1, title: 'Proposta para campanha', validUntil: '2020-01-01', publishedAt: '2026-09-09T14:00:00Z', isCurrent: true }] }) }));
  await page.route('**/api/customer-proposals', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'proposal_not_found' }) }));

  await page.goto(`/minha-conta/orcamentos/${quoteId}`);
  await expect(page.getByRole('heading', { name: 'Propostas' })).toBeVisible();
  await expect(page.getByText('Validade encerrada em 01/01/2020')).toBeVisible();
  await expect(page.getByText(/Versão mais recente · v1/)).toBeVisible();
  const openProposal = page.getByRole('button', { name: 'Abrir proposta' });
  await openProposal.click();
  await expect(page.getByRole('alert')).toContainText('Não conseguimos abrir esta proposta agora.');
  await expect(openProposal).toBeEnabled();
});

test('detalhe do orçamento recupera de indisponibilidade temporária', async ({ page }) => {
  const quoteId = '99999999-9999-4999-8999-999999999998';
  const user = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', aud: 'authenticated', role: 'authenticated', email: 'detalhe@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  let detailReads = 0;
  await page.addInitScript(({ user }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
  }, { user });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ claimed: 0 }) }));
  await page.route('**/rest/v1/rpc/get_my_quote_request', (route) => {
    detailReads += 1;
    if (detailReads === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary_failure' }) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: quoteId, protocol: '99999999', status: 'new', company: 'Empresa Recuperada', contactName: 'Caio', email: user.email, phone: '(11) 97777-7777', city: null, desiredDeadline: null, notes: '', createdAt: '2026-09-09T12:00:00Z', submittedAt: '2026-09-09T12:00:00Z', items: [{ key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 50, minQuantity: 50, colorName: null, colorHex: null }], events: [], proposals: [] }) });
  });

  await page.goto(`/minha-conta/orcamentos/${quoteId}`);
  await expect(page.getByRole('heading', { name: 'Não foi possível abrir.' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Seleção enviada' })).toBeVisible();
  expect(detailReads).toBe(2);
});

test('falha ao trocar de orçamento nunca mantém dados e ações da rota anterior', async ({ page }) => {
  const firstId = '11111111-aaaa-4aaa-8aaa-111111111111';
  const nextId = '22222222-bbbb-4bbb-8bbb-222222222222';
  const user = { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', aud: 'authenticated', role: 'authenticated', email: 'rotas@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  await page.addInitScript(({ user }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
  }, { user });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/rest/v1/rpc/claim_my_quote_requests', (route) => route.fulfill({ contentType: 'application/json', body: '{"claimed":0}' }));
  await page.route('**/rest/v1/rpc/get_my_quote_request', (route) => {
    const requestId = Object.values(route.request().postDataJSON() || {}).find((value) => typeof value === 'string');
    if (requestId === nextId) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"temporary_failure"}' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: firstId, protocol: 'ROTA-1', status: 'new', company: 'Empresa da rota anterior', contactName: 'Dani', email: user.email, phone: '(11) 96666-6666', city: null, desiredDeadline: null, notes: '', createdAt: '2026-09-09T12:00:00Z', submittedAt: '2026-09-09T12:00:00Z', items: [{ key: `${product.id}::sem-cor`, productId: product.id, slug: product.slug, name: product.name, sku: product.sku, imageUrl: product.primary_image_url, quantity: 50, minQuantity: 50 }], events: [], proposals: [] }) });
  });

  await page.goto(`/minha-conta/orcamentos/${firstId}`);
  await expect(page.getByRole('heading', { name: 'Empresa da rota anterior' })).toBeVisible();
  await page.evaluate((id) => {
    history.pushState({}, '', `/minha-conta/orcamentos/${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, nextId);

  await expect(page.getByRole('heading', { name: 'Não foi possível abrir.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Empresa da rota anterior' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Solicitar novamente' })).toHaveCount(0);
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
    if (attempts <= 2) {
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

test('galeria com muitas fotos mantém o documento dentro da viewport móvel', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Cenário dedicado ao viewport móvel.');
  await page.unroute(/\/rest\/v1\/v_(?:site_)?products_public\?/);
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'content-range': '0-0/1' },
    body: JSON.stringify([{
      ...product,
      images: Array.from({ length: 7 }, (_, index) => `/images/product-placeholder.svg?foto=${index + 1}`),
    }]),
  }));
  await page.goto(`/produto/${product.slug}`);
  await expect(page.locator('.product-gallery__thumbs button')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('navegação de catálogo por query fecha menu e reposiciona resultados', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Cenário dedicado ao viewport móvel.');
  await page.goto('/catalogo');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('navigation', { name: 'Navegação móvel' }).getByRole('link', { name: 'Novos drops' }).click();
  await expect(page).toHaveURL(/perfil=novos/);
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeHidden();
  await expect(page.locator('#catalog-results-title')).toBeInViewport();
});
