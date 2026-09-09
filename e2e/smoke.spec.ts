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

test('biblioteca de catálogos transforma contexto em coleções compartilháveis', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
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
  await expect(page).toHaveURL(/\/catalogo\?momento=onboarding.*perfil=kits/);
});

test('soluções editoriais levam a uma curadoria explícita, não a uma promessa de estoque', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Onboarding sem kit genérico/i }).click();
  await expect(page).toHaveURL(/momento=onboarding.*publico=colaboradores.*perfil=kits/);
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
    return url.pathname.includes('products_public') && url.searchParams.get('is_kit') === 'eq.true';
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
  expect(new URL(productRequests[0]).searchParams.get('and')).toContain(rootCategoryId);
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
  await expect(page.getByRole('heading', { name: 'Seu moodboard começa aqui.' })).toBeVisible();
  await expect(page.getByText('1 produto encontrado')).toBeVisible();
  await expect(page.getByText('Novidade').first()).toBeVisible();
  await expect(page.getByText('Mín. 50 un.').first()).toBeVisible();
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
  for (const path of ['/', '/catalogo', '/catalogos', `/produto/${product.slug}`, '/sobre', '/contato', '/privacidade', '/orcamento', '/entrar']) {
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

test('área do cliente protege histórico e oferece autenticação acessível', async ({ page }) => {
  await page.goto('/minha-conta');
  await expect(page).toHaveURL(/\/entrar\?next=/);
  await expect(page.getByRole('heading', { name: 'Acessar meus orçamentos' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Link ou código' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('E-mail')).toHaveAttribute('autocomplete', 'email');
  await page.getByRole('tab', { name: 'Senha' }).click();
  await expect(page.getByLabel('Senha')).toHaveAttribute('autocomplete', 'current-password');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('callback de acesso inválido falha de forma recuperável e privada', async ({ page }) => {
  await page.goto('/auth/confirm');
  await expect(page.getByRole('heading', { name: 'Não conseguimos vincular seu histórico.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao acesso' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});

test('cliente autenticado consulta detalhe e reutiliza o orçamento sem misturar históricos', async ({ page }) => {
  const quoteId = '55555555-5555-4555-8555-555555555555';
  const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'cliente@empresa.com', email_confirmed_at: '2026-09-09T12:00:00Z', user_metadata: {}, app_metadata: {}, created_at: '2026-09-09T12:00:00Z' };
  await page.addInitScript(({ user }) => {
    localStorage.setItem('promo-brindes-customer-session', JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
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
  await expect(page).toHaveURL(/\/orcamento\?repetir=/);
  await expect(page.getByRole('heading', { name: 'Transforme o moodboard em briefing.' })).toBeVisible();
  await expect(page.getByText('Mochila Executiva Sustentável').first()).toBeVisible();
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
  await page.getByRole('navigation', { name: 'Navegação móvel' }).getByRole('link', { name: 'Kits & onboarding' }).click();
  await expect(page).toHaveURL(/perfil=kits/);
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeHidden();
  await expect(page.locator('#catalog-results-title')).toBeInViewport();
});
