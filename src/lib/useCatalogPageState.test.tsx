import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogProduct } from '../types';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  cart: { setCampaign: vi.fn() },
}));

vi.mock('./hooks', () => ({
  useCatalog: mocks.catalog,
  useAllCategories: () => ({ data: [], loading: false, error: null }),
}));
vi.mock('../context/quoteCart', () => ({ useQuoteCart: () => mocks.cart }));
vi.mock('./analytics', () => ({ trackFunnelEvent: vi.fn() }));

import { useCatalogPageState } from './useCatalogPageState';

function product(id: string, name: string, featured: boolean): CatalogProduct {
  return {
    id, name, sku: id, slug: id, description: '', shortDescription: '', imageUrl: '', images: [],
    categoryId: 'categoria', mainCategoryId: 'categoria', brand: null, minQuantity: 10,
    isNew: false, isFeatured: featured, isBestseller: false, isKit: false, allowsPersonalization: false,
    hasCommercialPackaging: false, colors: [], materials: [], dimensions: {},
  };
}

describe('useCatalogPageState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    mocks.cart.setCampaign.mockReset();
    mocks.catalog.mockReturnValue({
      data: { products: [product('a', 'A', false), product('b', 'B', true)], total: 2, page: 1, pageSize: 24 },
      loading: false,
      error: null,
    });
  });

  it.each([
    ['nome', ['a', 'b']],
    ['recentes', ['a', 'b']],
  ] as const)('preserva a resposta da API quando a ordem explícita é %s', (sort, expected) => {
    const { result } = renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[`/catalogo?ordem=${sort}`]}>{children}</MemoryRouter>,
    });

    expect(result.current.sort).toBe(sort);
    expect(result.current.catalog.data.products.map((item) => item.id)).toEqual(expected);
  });

  it('aplica curadoria somente quando ela é a ordem escolhida', () => {
    const { result } = renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo?ordem=curadoria']}>{children}</MemoryRouter>,
    });

    expect(result.current.catalog.data.products.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
