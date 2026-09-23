import { describe, expect, it } from 'vitest';
import { rankCatalogProducts, rankRelatedProducts } from './catalogRanking';
import type { CatalogProduct } from '../types';

function product(id: string, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id, name: `Produto ${id}`, sku: id, slug: `produto-${id}`, description: '', shortDescription: '', imageUrl: '', images: [],
    categoryId: 'categoria-a', mainCategoryId: 'categoria-a', brand: null, minQuantity: 100,
    isNew: false, isFeatured: false, isBestseller: false, isKit: false, allowsPersonalization: false,
    hasCommercialPackaging: false, colors: [], materials: ['Metal'], dimensions: {}, ...overrides,
  };
}

describe('catalog ranking', () => {
  it('prioriza intenção pesquisada sem usar preço ou estoque', () => {
    const ranked = rankCatalogProducts([
      product('1', { name: 'Caderno executivo' }),
      product('2', { name: 'Garrafa térmica', shortDescription: 'Garrafa para rotina', isFeatured: true }),
      product('3', { name: 'Caneta metálica', isBestseller: true }),
    ], { query: 'garrafa' });
    expect(ranked[0]?.id).toBe('2');
  });

  it('intercala famílias equivalentes nos primeiros resultados', () => {
    const ranked = rankCatalogProducts([
      product('1', { name: 'Garrafa A', mainCategoryId: 'bebidas', materials: ['Aço'] }),
      product('2', { name: 'Garrafa B', mainCategoryId: 'bebidas', materials: ['Aço'] }),
      product('3', { name: 'Caderno', mainCategoryId: 'papelaria', materials: ['Papel'] }),
    ]);
    expect(ranked.slice(0, 2).map((item) => item.mainCategoryId)).toContain('papelaria');
  });

  it('considera somente atributos publicados ao responder a um briefing', () => {
    const ranked = rankCatalogProducts([
      product('1', { name: 'Copo reciclado', materials: ['Plástico reciclado'] }),
      product('2', { name: 'Copo comum', materials: ['Plástico'] }),
    ], { campaign: { moment: 'evento', audience: 'clientes', scale: '51-200', mood: 'sustentavel' } });
    expect(ranked[0]?.id).toBe('1');
  });

  it('mantém relacionados da categoria do produto, sem repetir o próprio item', () => {
    const anchor = product('a', { mainCategoryId: 'bebidas', materials: ['Aço'] });
    const ranked = rankRelatedProducts([
      anchor,
      product('b', { mainCategoryId: 'papelaria' }),
      product('c', { mainCategoryId: 'bebidas', materials: ['Aço'] }),
    ], anchor);
    expect(ranked.map((item) => item.id)).toEqual(['c', 'b']);
  });
});
