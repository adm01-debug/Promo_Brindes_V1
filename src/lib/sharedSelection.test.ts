import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPersistentSharedSelection, decodeSharedSelection, encodeSharedSelection, fetchPersistentSharedSelection, hydrateSharedSelection, hydrateSharedSelectionDetails, managedSharedSelectionToken, managedSharedSelectionTokens, MAX_SHARED_SELECTION_ITEMS, revokePersistentSharedSelection, sharedSelectionUrl } from './sharedSelection';

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

  it('preserva variantes não publicadas e aponta produtos removidos sem perder quantidades', () => {
    const removedProduct = '22222222-2222-4222-8222-222222222222';
    const hydration = hydrateSharedSelectionDetails([
      { id: item.productId, q: 100, v: 'azul' },
      { id: item.productId, q: 200, v: 'verde' },
      { id: removedProduct, q: 300, v: 'preto' },
    ], [{
      id: item.productId, name: 'Garrafa atual', sku: 'PB-1', slug: 'garrafa-atual', description: '', shortDescription: '', imageUrl: '/a.webp', images: ['/a.webp'], categoryId: null, mainCategoryId: null, brand: null, minQuantity: 10, isNew: false, isFeatured: false, isBestseller: false, isKit: false, allowsPersonalization: false, hasCommercialPackaging: false, colors: [], materials: [], dimensions: {},
    }]);

    expect(hydration.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ variantId: 'azul', quantity: 100, variantUnavailable: true }),
      expect.objectContaining({ variantId: 'verde', quantity: 200, variantUnavailable: true }),
    ]));
    expect(hydration.items).toHaveLength(2);
    expect(hydration.items.reduce((total, current) => total + current.quantity, 0)).toBe(300);
    expect(hydration.unavailableVariantReferences).toHaveLength(2);
    expect(hydration.unavailableProductReferences).toEqual([{ id: removedProduct, q: 300, v: 'preto' }]);
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
    expect(managedSharedSelectionTokens()).toEqual([token]);
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain('Garrafa');

    await expect(fetchPersistentSharedSelection(token)).resolves.toEqual({ items: [{ id: item.productId, q: 25, v: 'azul' }], expiresAt: '2026-10-11T12:00:00.000Z' });
    await expect(revokePersistentSharedSelection(token)).resolves.toBe(true);
    expect(managedSharedSelectionToken(token)).toBeNull();
  });

  it('mantém o mesmo limite do moodboard e remove chaves expiradas do dispositivo', async () => {
    const items = Array.from({ length: MAX_SHARED_SELECTION_ITEMS + 2 }, (_, index) => ({
      ...item,
      productId: `${String(index + 1).padStart(8, '0')}-1111-4111-8111-111111111111`,
    }));
    expect(decodeSharedSelection(encodeSharedSelection(items))).toHaveLength(MAX_SHARED_SELECTION_ITEMS);

    const token = '44444444-4444-4444-8444-444444444444';
    window.localStorage.setItem(`promo-brindes:shared-selection-management:${token}`, JSON.stringify({ managementToken: '55555555-5555-4555-8555-555555555555', expiresAt: '2020-01-01T00:00:00.000Z' }));
    expect(managedSharedSelectionTokens(Date.parse('2026-01-01T00:00:00.000Z'))).not.toContain(token);
    expect(window.localStorage.getItem(`promo-brindes:shared-selection-management:${token}`)).toBeNull();
  });

  it('mantém cinquenta variantes longas no link persistente sem forçar o limite da URL legada', async () => {
    const references = Array.from({ length: MAX_SHARED_SELECTION_ITEMS }, (_, index) => ({
      ...item,
      productId: `${String(index + 1).padStart(8, '0')}-1111-4111-8111-111111111111`,
      variantId: `variante-${String(index).padStart(2, '0')}-${'x'.repeat(84)}`,
    }));
    const encoded = encodeSharedSelection(references);
    expect(encoded?.length).toBeGreaterThan(8_000);
    expect(decodeSharedSelection(encoded)).toEqual([]);
    expect(sharedSelectionUrl(references)).toBeNull();

    const token = '88888888-8888-4888-8888-888888888888';
    const managementToken = '99999999-9999-4999-8999-999999999999';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token, managementToken, expiresAt: '2030-01-01T00:00:00.000Z' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createPersistentSharedSelection(references)).resolves.toMatchObject({ token });
    const request = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(request.items).toHaveLength(MAX_SHARED_SELECTION_ITEMS);
    expect(request.items[0].v).toHaveLength(96);
  });

  it('mantém links válidos acessíveis quando uma chave anterior expirou ou está corrompida', () => {
    const expired = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const corrupted = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const active = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const managementToken = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const prefix = 'promo-brindes:shared-selection-management:';
    window.localStorage.setItem(`${prefix}${expired}`, JSON.stringify({ managementToken, expiresAt: '2020-01-01T00:00:00.000Z' }));
    window.localStorage.setItem(`${prefix}${corrupted}`, '{not-json');
    window.localStorage.setItem(`${prefix}${active}`, JSON.stringify({ managementToken, expiresAt: '2030-01-01T00:00:00.000Z' }));

    expect(managedSharedSelectionTokens(Date.parse('2026-01-01T00:00:00.000Z'))).toContain(active);
    expect(window.localStorage.getItem(`${prefix}${expired}`)).toBeNull();
    expect(window.localStorage.getItem(`${prefix}${corrupted}`)).toBeNull();
  });

  it('remove também a chave expirada que ainda existe somente nesta sessão', async () => {
    const token = '66666666-6666-4666-8666-666666666666';
    const managementToken = '77777777-7777-4777-8777-777777777777';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ token, managementToken, expiresAt: '2020-01-01T00:00:00.000Z' }), { status: 201 })));
    await createPersistentSharedSelection([item]);
    expect(managedSharedSelectionTokens(Date.parse('2026-01-01T00:00:00.000Z'))).not.toContain(token);
    expect(managedSharedSelectionToken(token, Date.parse('2026-01-01T00:00:00.000Z'))).toBeNull();
  });
});
