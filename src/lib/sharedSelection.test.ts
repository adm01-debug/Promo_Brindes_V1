import { describe, expect, it } from 'vitest';
import { decodeSharedSelection, encodeSharedSelection, hydrateSharedSelection } from './sharedSelection';

const item = {
  key: '11111111-1111-4111-8111-111111111111::variante-azul',
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'garrafa', name: 'Garrafa', sku: 'PB-1', imageUrl: '/images/product-placeholder.svg', minQuantity: 10, quantity: 25,
  variantId: 'azul', colorName: 'Azul', colorHex: '#0033aa',
};

describe('sharedSelection', () => {
  it('serializa apenas referência pública, quantidade e variante', () => {
    const encoded = encodeSharedSelection([item]);
    expect(encoded).toBeTruthy();
    expect(encoded).not.toContain('Garrafa');
    expect(decodeSharedSelection(encoded)).toEqual([{ id: item.productId, q: 25, v: 'azul' }]);
  });

  it('rejeita payloads inválidos e reidrata somente produtos publicados', () => {
    expect(decodeSharedSelection('%%')).toEqual([]);
    expect(hydrateSharedSelection([{ id: item.productId, q: 1, v: 'azul' }], [{
      id: item.productId, name: 'Garrafa atual', sku: 'PB-1', slug: 'garrafa-atual', description: '', shortDescription: '', imageUrl: '/a.webp', images: ['/a.webp'], categoryId: null, mainCategoryId: null, brand: null, minQuantity: 10, isNew: false, isFeatured: false, isBestseller: false, isKit: false, allowsPersonalization: false, hasCommercialPackaging: false, colors: [{ variantId: 'azul', name: 'Azul', hex: '#0033aa' }], materials: [], dimensions: {},
    }])).toMatchObject([{ name: 'Garrafa atual', quantity: 10, variantId: 'azul' }]);
  });
});
