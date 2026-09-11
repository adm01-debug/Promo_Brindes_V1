import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPersistentSharedSelection, decodeSharedSelection, encodeSharedSelection, fetchPersistentSharedSelection, hydrateSharedSelection, managedSharedSelectionToken, revokePersistentSharedSelection } from './sharedSelection';

const item = {
  key: '11111111-1111-4111-8111-111111111111::variante-azul',
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'garrafa', name: 'Garrafa', sku: 'PB-1', imageUrl: '/images/product-placeholder.svg', minQuantity: 10, quantity: 25,
  variantId: 'azul', colorName: 'Azul', colorHex: '#0033aa',
};

describe('sharedSelection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

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

  it('usa token opaco persistente e conserva a chave de revogação somente no dispositivo criador', async () => {
    const token = '22222222-2222-4222-8222-222222222222';
    const managementToken = '33333333-3333-4333-8333-333333333333';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, managementToken, expiresAt: '2026-10-11T12:00:00.000Z' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: item.productId, q: 25, v: 'azul' }], expiresAt: '2026-10-11T12:00:00.000Z' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ revoked: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const created = await createPersistentSharedSelection([item]);
    expect(created.url).toContain(`s=${token}`);
    expect(managedSharedSelectionToken(token)).toBe(managementToken);
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain('Garrafa');

    await expect(fetchPersistentSharedSelection(token)).resolves.toEqual({ items: [{ id: item.productId, q: 25, v: 'azul' }], expiresAt: '2026-10-11T12:00:00.000Z' });
    await expect(revokePersistentSharedSelection(token)).resolves.toBe(true);
    expect(managedSharedSelectionToken(token)).toBeNull();
  });
});
