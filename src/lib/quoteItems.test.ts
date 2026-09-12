import { describe, expect, it } from 'vitest';
import { normalizeQuoteItems, reconcileHistoricalQuoteItems } from './quoteItems';
import type { CatalogProduct, QuoteItem } from '../types';

const item: QuoteItem = {
  key: '11111111-1111-4111-8111-111111111111::variante-azul-antigo',
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'produto-antigo', name: 'Produto antigo', sku: 'OLD-1', imageUrl: '/antiga.webp',
  quantity: 40, minQuantity: 10, variantId: 'azul-antigo', colorName: 'Azul antigo',
};

const product: CatalogProduct = {
  id: item.productId, slug: 'produto-atual', name: 'Produto atual', sku: 'NEW-1',
  description: '', shortDescription: '', imageUrl: '/atual.webp', images: ['/atual.webp'],
  categoryId: null, mainCategoryId: null, brand: null, minQuantity: 50,
  isNew: false, isFeatured: false, isBestseller: false, isKit: false,
  allowsPersonalization: true, hasCommercialPackaging: false,
  colors: [{ variantId: 'azul-atual', name: 'Azul', hex: '#0047ab' }], materials: [], dimensions: {},
};

describe('revalidação de itens históricos', () => {
  it('preserva referência removida como bloqueio visível', () => {
    expect(reconcileHistoricalQuoteItems([item], [product])[0]).toMatchObject({
      name: 'Produto atual', sku: 'NEW-1', minQuantity: 50, quantity: 50,
      variantId: 'azul-antigo', variantUnavailable: true,
    });
  });

  it('marca produto removido sem apagá-lo silenciosamente', () => {
    expect(reconcileHistoricalQuoteItems([item], [])[0]).toMatchObject({
      productId: item.productId, productUnavailable: true,
    });
  });

  it('mantém os marcadores ao normalizar armazenamento local', () => {
    expect(normalizeQuoteItems([{ ...item, variantUnavailable: true, productUnavailable: true }])[0]).toMatchObject({
      variantUnavailable: true, productUnavailable: true,
    });
  });
});
