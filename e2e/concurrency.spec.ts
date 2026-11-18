import { expect, test, type BrowserContext } from '@playwright/test';

// PF-103: a suíte não tinha nenhum cenário de concorrência — nem duas abas, nem
// dois dispositivos. A seleção de orçamento é compartilhada por `localStorage` e
// sincronizada pelo evento `storage` do navegador
// (src/context/QuoteCartContext.tsx:56-78), que o jsdom não dispara entre
// documentos: só um navegador de verdade com duas páginas cobre isso.

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

// O mock vale para o contexto inteiro: as duas abas leem o mesmo catálogo.
async function mockCatalogForContext(context: BrowserContext) {
  await context.route('**/rest/v1/categories?**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'content-range': '0-1/2' },
    body: JSON.stringify([
      { id: rootCategoryId, name: 'Tecnologia', parent_id: null },
      { id: childCategoryId, name: 'Áudio', parent_id: rootCategoryId },
    ]),
  }));
  await context.route(/\/rest\/v1\/v_(?:site_)?products_public\?/, (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'content-range': '0-0/1' },
    body: JSON.stringify([product]),
  }));
}

const VAZIA = 'Sua seleção ainda está em branco.';
const BRIEFING = 'Transforme sua seleção em briefing.';

test('seleção feita num dispositivo aparece no outro, e limpar num deles esvazia o outro', async ({ context }) => {
  await mockCatalogForContext(context);
  const dispositivoA = await context.newPage();
  const dispositivoB = await context.newPage();

  // B fica aberto no briefing ANTES de A escolher: o evento `storage` só chega a
  // quem já estava com a página aberta, que é o caso do cliente com o orçamento
  // em uma aba e o catálogo em outra.
  await dispositivoB.goto('/orcamento');
  await expect(dispositivoB.getByRole('heading', { name: VAZIA })).toBeVisible();

  await dispositivoA.goto(`/produto/${product.slug}`);
  await dispositivoA.getByRole('button', { name: /Adicionar à minha seleção/i }).click();
  await expect(dispositivoA.getByRole('dialog', { name: 'Minha seleção' })).toBeVisible();

  // Sem recarregar B: se a sincronização falhasse, o cliente veria "em branco"
  // com o produto já escolhido do outro lado e escolheria de novo.
  await expect(dispositivoB.getByRole('heading', { name: BRIEFING })).toBeVisible({ timeout: 10_000 });
  await expect(dispositivoB.getByText(product.name).first()).toBeVisible();

  // E o inverso: limpar em A tem de esvaziar B, sem deixar briefing órfão.
  await dispositivoA.goto('/orcamento');
  await expect(dispositivoA.getByRole('heading', { name: BRIEFING })).toBeVisible();
  await dispositivoA.getByRole('button', { name: 'Limpar seleção' }).click();
  await expect(dispositivoB.getByRole('heading', { name: VAZIA })).toBeVisible({ timeout: 10_000 });
  await expect(dispositivoB.getByText(product.name)).toHaveCount(0);
});

test('o mesmo produto escolhido nos dois dispositivos ao mesmo tempo não duplica a seleção', async ({ context }) => {
  await mockCatalogForContext(context);
  const dispositivoA = await context.newPage();
  const dispositivoB = await context.newPage();
  await dispositivoA.goto(`/produto/${product.slug}`);
  await dispositivoB.goto(`/produto/${product.slug}`);

  // Dois cliques simultâneos no mesmo produto, um em cada dispositivo.
  await Promise.all([
    dispositivoA.getByRole('button', { name: /Adicionar à minha seleção/i }).click(),
    dispositivoB.getByRole('button', { name: /Adicionar à minha seleção/i }).click(),
  ]);

  const briefing = await context.newPage();
  await briefing.goto('/orcamento');
  await expect(briefing.getByRole('heading', { name: BRIEFING })).toBeVisible();
  // Um item, não dois: a chave da seleção é produto + cor, e a última escrita
  // substitui o estado em vez de somar.
  await expect(briefing.getByRole('heading', { name: 'Produtos selecionados' })).toBeVisible();
  await expect(briefing.locator('input[id^="quantity-"]')).toHaveCount(1);
});
