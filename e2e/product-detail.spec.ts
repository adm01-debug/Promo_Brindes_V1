import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const image = '/images/product-placeholder.svg';
const product = {
  id: 'a74ae6e5-b462-4c9e-8108-663f7fd11e70',
  slug: 'amplificador-de-teste', sku: 'TESTE-14906', name: 'Amplificador premium',
  primary_image_url: image,
  images: Array.from({ length: 11 }, (_, index) => `${image}?foto=${index + 2}`),
  description: `Amplificador em madeira, sem baterias. ${'Uma referência para a sua campanha. '.repeat(12)}\n✅ **Acabamento:** madeira.\n✅ **Último detalhe:** consulte as opções.`,
  short_description: 'Amplificador em madeira, sem baterias.',
  materials: ['Madeira', 'Couro sintético (ecológico)'],
  width_cm: 21.7, height_cm: 9.8, length_cm: 5.2, weight_g: 574,
  has_commercial_packaging: true, allows_personalization: true, min_quantity: 50,
  is_kit: false, is_new: true, stock_quantity: 0,
  color_swatches: [{ variant_id: 'variant-wood', color_name: 'Madeira', color_hex: '#643b22', image_url: `${image}?cor=madeira`, stock_quantity: 0 }],
};

async function mockProduct(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route('**/rest/v1/categories?**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([{ ...product, ...overrides }]),
  }));
}

test.beforeEach(async ({ page }) => { await mockProduct(page); });

test('ficha compacta reúne seleção e especificações ao lado da galeria no desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Geometria de três colunas é específica do desktop.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/produto/${product.slug}`);
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  const [gallery, selection, specs, title] = await Promise.all(['.product-gallery', '.product-info', '.product-overview', '.product-heading'].map((selector) => page.locator(selector).boundingBox()));
  expect(gallery && selection && specs && title).toBeTruthy();
  expect(selection!.x).toBeGreaterThan(gallery!.x + gallery!.width);
  expect(specs!.x).toBeGreaterThan(selection!.x + selection!.width);
  expect(specs!.x - (selection!.x + selection!.width)).toBeGreaterThanOrEqual(20);
  expect(Math.abs(selection!.y - specs!.y)).toBeLessThan(2);
  expect(Math.abs((selection!.y + selection!.height) - (specs!.y + specs!.height))).toBeLessThan(2);
  expect(title!.y).toBeLessThan(selection!.y);
  expect(specs!.y + specs!.height).toBeLessThan(1100);
  expect(await page.locator('.product-story').count()).toBe(0);
  await expect(page.getByRole('heading', { name: 'Especificações' })).toBeInViewport();
  const panelStyles = await page.locator('.product-panel').evaluateAll((panels) => panels.map((panel) => {
    const style = getComputedStyle(panel);
    return { borderLeft: style.borderLeftWidth, borderRight: style.borderRightWidth, radius: style.borderRadius };
  }));
  expect(panelStyles).toEqual([
    { borderLeft: '1px', borderRight: '1px', radius: '20px' },
    { borderLeft: '1px', borderRight: '1px', radius: '20px' },
  ]);
});

test('galeria permite todas as fotos, volta ao início e amplia com foco contido', async ({ page }) => {
  await page.goto(`/produto/${product.slug}`);
  const thumbnails = page.getByRole('group', { name: 'Escolher foto' });
  await expect(thumbnails.getByRole('button')).toHaveCount(12);
  await thumbnails.getByRole('button', { name: 'Ver foto 12', exact: true }).click();
  await expect(page.locator('.product-gallery__main img')).toHaveAttribute('src', `${image}?foto=12`);
  await page.getByRole('button', { name: 'Próxima foto', exact: true }).click();
  await expect(page.locator('.product-gallery__main img')).toHaveAttribute('src', image);
  const zoom = page.getByRole('button', { name: `Ampliar foto de ${product.name}` });
  await zoom.click();
  const dialog = page.getByRole('dialog', { name: `Foto ampliada de ${product.name}` });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Fechar foto ampliada' });
  await expect(close).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('img')).toHaveAttribute('src', `${image}?foto=12`);
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Próxima foto' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  const a11y = await new AxeBuilder({ page }).include('.product-image-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(zoom).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('descrição completa formata marcadores sem perder conteúdo nem esconder especificações', async ({ page }) => {
  await page.goto(`/produto/${product.slug}`);
  const toggle = page.getByRole('button', { name: 'Ver descrição completa' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Último detalhe:', { exact: true })).toBeHidden();
  await toggle.click();
  await expect(page.getByText('Último detalhe:', { exact: true })).toBeVisible();
  await expect(page.locator('.product-description strong')).toHaveCount(2);
  await expect(page.locator('.product-description')).not.toContainText('**');
  await page.getByRole('button', { name: 'Recolher descrição' }).click();
  await expect(page.getByRole('heading', { name: 'Especificações' })).toBeVisible();
  await expect(page.locator('.product-facts')).toContainText('9,8 cm');
  await expect(page.locator('.product-facts')).toContainText('Embalagem individual');
});

test('cor e quantidade seguem para o orçamento, sem preço ou bloqueio por estoque', async ({ page }) => {
  await page.goto(`/produto/${product.slug}`);
  await page.getByRole('button', { name: 'Madeira', exact: true }).click();
  await expect(page.locator('.product-gallery__main img')).toHaveAttribute('src', `${image}?cor=madeira`);
  await page.getByLabel('Quantidade estimada').fill('1');
  await page.getByLabel('Quantidade estimada').blur();
  await expect(page.getByLabel('Quantidade estimada')).toHaveValue('50');
  await page.getByLabel('Quantidade estimada').fill('250');
  await page.getByRole('button', { name: 'Adicionar à minha seleção' }).click();
  await expect(page.getByRole('dialog', { name: 'Minha seleção' })).toBeVisible();
  const selection = await page.evaluate(() => JSON.parse(localStorage.getItem('promo-brindes:quote-selection:v1') || '{}'));
  expect(selection.items[0]).toMatchObject({ productId: product.id, quantity: 250, variantId: 'variant-wood', colorName: 'Madeira' });
  await expect(page.locator('.product-detail')).not.toContainText(/R\$|Fora de estoque|Comprar agora/);
});

test('ficha sem dados não inventa medidas, cores ou embalagem e mantém orçamento disponível', async ({ page }) => {
  await mockProduct(page, { images: [], materials: [], width_cm: null, height_cm: null, length_cm: null, weight_g: null, color_swatches: [], has_commercial_packaging: false, description: 'Descrição curta.', min_quantity: null });
  await page.goto(`/produto/${product.slug}`);
  await expect(page.locator('.product-specs-empty')).toBeVisible();
  await expect(page.locator('.product-facts > div')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Foto anterior' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Cor preferida opcional' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Adicionar à minha seleção' })).toBeEnabled();
  await expect(page.getByText('Quantidade mínima a confirmar com nosso time de especialistas')).toBeVisible();
});

test('conteúdo extenso não causa sobreposição nem rolagem horizontal em larguras críticas', async ({ page }) => {
  await mockProduct(page, {
    name: 'Amplificador premium com acabamento especial para campanhas corporativas e ações de relacionamento',
    materials: ['Poliéster reciclado com acabamento especial', 'Madeira de reflorestamento'],
    color_swatches: Array.from({ length: 12 }, (_, i) => ({ variant_id: `cor-${i}`, color_name: `Variante ${i + 1} de nome longo`, color_hex: '#ffffff' })),
  });
  await page.goto(`/produto/${product.slug}`);
  await expect(page.locator('.product-detail')).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `overflow em ${width}px`).toBe(true);
    const imageBox = await page.locator('.product-gallery__main').boundingBox();
    const toolbar = await page.locator('.product-gallery__toolbar').boundingBox();
    expect(toolbar!.y, `controles fora da imagem em ${width}px`).toBeGreaterThanOrEqual(imageBox!.y + imageBox!.height - 1);
    const info = await page.locator('.product-info').boundingBox();
    const overview = await page.locator('.product-overview').boundingBox();
    if (width <= 1220) expect(overview!.y).toBeGreaterThanOrEqual(info!.y + info!.height - 1);
  }
});

test('ficha compacta mantém contraste, rótulos e semântica acessíveis', async ({ page }) => {
  await page.goto(`/produto/${product.slug}`);
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('.product-detail').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
