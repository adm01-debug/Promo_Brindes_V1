import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SharedSelectionPage from './SharedSelectionPage';
import { QuoteCartProvider } from '../context/QuoteCartContext';

const mocks = vi.hoisted(() => ({ track: vi.fn(), fetchProductsByIds: vi.fn() }));

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/analytics')>()),
  trackFunnelEvent: mocks.track,
}));
vi.mock('../lib/catalog', () => ({ fetchProductsByIds: mocks.fetchProductsByIds }));

const product = {
  id: '11111111-1111-4111-8111-111111111111', name: 'Mochila', sku: 'MO-42', slug: 'mochila',
  description: '', shortDescription: '', imageUrl: '/m.webp', images: [], categoryId: null, mainCategoryId: null,
  brand: null, minQuantity: 50, isNew: false, isFeatured: false, isBestseller: false, isKit: false,
  allowsPersonalization: false, hasCommercialPackaging: false,
  colors: [{ name: 'Azul', hex: '#00f', variantId: 'var-1' }],
  materials: [], dimensions: {},
};

// payload v2: {"v":2,"i":[{"id":"...","c":"Azul","q":100}]}
const token = btoa(JSON.stringify({
  v: 2,
  i: [{ id: '11111111-1111-4111-8111-111111111111', c: 'Azul', q: 100 }],
})).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

describe('SharedSelectionPage telemetria', () => {
  beforeEach(() => {
    mocks.track.mockClear();
    mocks.fetchProductsByIds.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('registra a abertura do link compartilhado com a contagem de itens', async () => {
    mocks.fetchProductsByIds.mockResolvedValue([product]);
    render(<MemoryRouter initialEntries={[`/selecao?s=${token}`]}><QuoteCartProvider><SharedSelectionPage /></QuoteCartProvider></MemoryRouter>);
    await waitFor(() => expect(mocks.track).toHaveBeenCalledWith('shared_selection_opened', { item_count: 1, persistent: false }));
    expect(mocks.track).toHaveBeenCalledTimes(1);
  });

  it('nao registra a abertura quando a consulta falha', async () => {
    mocks.fetchProductsByIds.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter initialEntries={[`/selecao?s=${token}`]}><QuoteCartProvider><SharedSelectionPage /></QuoteCartProvider></MemoryRouter>);
    await waitFor(() => expect(mocks.fetchProductsByIds).toHaveBeenCalled());
    expect(mocks.track).not.toHaveBeenCalledWith('shared_selection_opened', expect.anything());
  });
});
