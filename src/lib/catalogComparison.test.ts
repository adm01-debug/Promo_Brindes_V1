import { describe, expect, it } from 'vitest';
import { MAX_COMPARISON_ITEMS, normalizeComparison, loadCatalogComparison, saveCatalogComparison } from './catalogComparison';
import type { CatalogProduct } from '../types';

const product = (id: string): CatalogProduct => ({
  id, name: `Produto ${id}`, sku: id, slug: `produto-${id}`, description: '', shortDescription: '', imageUrl: '/image.webp', images: ['/image.webp'], categoryId: null, mainCategoryId: null, brand: null, minQuantity: 10, isNew: false, isFeatured: false, isBestseller: false, isKit: false, allowsPersonalization: false, hasCommercialPackaging: false, colors: [], materials: [], dimensions: {},
});

describe('comparação persistente', () => {
  it('remove dados inválidos, duplicados e respeita o limite de três produtos', () => {
    const products = [product('a'), product('a'), product('b'), product('c'), product('d'), { id: 'forjado' }];
    expect(normalizeComparison(products)).toEqual([product('a'), product('b'), product('c')]);
    expect(normalizeComparison(products)).toHaveLength(MAX_COMPARISON_ITEMS);
  });

  it('salva identificadores estáveis junto de um retrato local para sobreviver à navegação', () => {
    saveCatalogComparison([product('a'), product('b')]);
    const stored = JSON.parse(window.sessionStorage.getItem('promo-brindes:catalog-comparison:v1') || '{}');
    expect(stored.productIds).toEqual(['a', 'b']);
    expect(loadCatalogComparison()).toEqual([product('a'), product('b')]);
  });
});
