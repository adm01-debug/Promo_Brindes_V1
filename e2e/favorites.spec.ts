import { expect, test, type Page } from '@playwright/test';

// PF-53: a logica de favoritos tinha 24 testes unitarios e nenhum e2e. O que o
// unitario nao alcanca e justamente o que depende do navegador de verdade:
// localStorage sobrevivendo a um reload e a sincronizacao entre abas, que o hook
// faz pelo evento `storage` (src/lib/useOccasionFavorites.ts:328) e que jsdom
// nao dispara entre documentos.
const FAVORITES_KEY = 'promo-brindes:occasion-favorites:v1';

function firstFavoriteButton(page: Page) {
  return page.getByRole('button', { name: /^Salvar .+ em Minhas datas$/ }).first();
}

test('favorito sobrevive ao recarregar a pagina, sem conta', async ({ page }) => {
  await page.goto('/datas-comemorativas');
  const salvar = firstFavoriteButton(page);
  await expect(salvar).toBeVisible();
  const rotulo = await salvar.getAttribute('aria-label');
  await salvar.click();
  // aria-pressed e o contrato de acessibilidade do botao: so o estado visual
  // nao prova que o favorito foi registrado.
  await expect(page.getByLabel(String(rotulo).replace('Salvar', 'Remover'))).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByLabel(String(rotulo).replace('Salvar', 'Remover'))).toHaveAttribute('aria-pressed', 'true');
  const guardado = await page.evaluate((key) => window.localStorage.getItem(key), FAVORITES_KEY);
  expect(guardado).toBeTruthy();
});

test('favorito salvo numa aba aparece na outra sem recarregar', async ({ context }) => {
  const abaA = await context.newPage();
  const abaB = await context.newPage();
  await abaA.goto('/datas-comemorativas');
  await abaB.goto('/datas-comemorativas');

  const salvar = firstFavoriteButton(abaA);
  await expect(salvar).toBeVisible();
  const rotulo = String(await salvar.getAttribute('aria-label'));
  const alvoB = abaB.getByLabel(rotulo);
  await expect(alvoB).toHaveAttribute('aria-pressed', 'false');

  await salvar.click();

  // Sem reload na aba B: o evento `storage` do navegador e o unico caminho, e e
  // exatamente o que um teste em jsdom nao consegue exercitar.
  await expect(abaB.getByLabel(rotulo.replace('Salvar', 'Remover'))).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });

  // E o inverso: desfazer na aba B tem de refletir na aba A.
  await abaB.getByLabel(rotulo.replace('Salvar', 'Remover')).click();
  await expect(abaA.getByLabel(rotulo)).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
});
