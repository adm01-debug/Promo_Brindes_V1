import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogProduct } from '../types';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  cart: { setCampaign: vi.fn() },
  track: vi.fn(),
}));

vi.mock('./hooks', () => ({
  useCatalog: mocks.catalog,
  useAllCategories: () => ({ data: [], loading: false, error: null }),
}));
vi.mock('../context/quoteCart', () => ({ useQuoteCart: () => mocks.cart }));
vi.mock('./analytics', () => ({ trackFunnelEvent: mocks.track }));

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

  it('sincroniza o contexto da campanha a partir da URL', () => {
    renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo?momento=evento']}>{children}</MemoryRouter>,
    });

    expect(mocks.cart.setCampaign).toHaveBeenLastCalledWith({ source: 'finder', moment: 'evento' });
  });

  it('preserva o contexto do carrinho na montagem sem recorte de campanha ativo', () => {
    renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo']}>{children}</MemoryRouter>,
    });

    expect(mocks.cart.setCampaign).not.toHaveBeenCalledWith(undefined);
  });

  it('marca a visualizacao do catalogo como originada de busca quando ha termo', () => {
    mocks.track.mockClear();
    renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo?q=mochila']}>{children}</MemoryRouter>,
    });

    expect(mocks.track).toHaveBeenCalledWith('catalog_result_viewed', expect.objectContaining({ has_query: true }));
  });

  it('marca a visualizacao como navegacao quando nao ha termo de busca', () => {
    mocks.track.mockClear();
    renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo']}>{children}</MemoryRouter>,
    });

    expect(mocks.track).toHaveBeenCalledWith('catalog_result_viewed', expect.objectContaining({ has_query: false }));
  });

  it('marca a busca por SKU exato como busca, e não como navegação', () => {
    mocks.track.mockClear();
    renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo?sku=MO-42']}>{children}</MemoryRouter>,
    });

    expect(mocks.track).toHaveBeenCalledWith('catalog_result_viewed', expect.objectContaining({ has_query: true }));
  });

  it('nao registra visualizacao enquanto a consulta ainda descreve a busca anterior', () => {
    mocks.track.mockClear();
    mocks.catalog.mockReturnValue({
      data: { products: [product('a', 'A', false), product('b', 'B', true)], total: 2, page: 1, pageSize: 24 },
      loading: false,
      error: null,
      stale: true,
    });
    renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo?q=mochila']}>{children}</MemoryRouter>,
    });

    // `has_query` da busca nova não pode ser combinado com o total da busca antiga.
    expect(mocks.track).not.toHaveBeenCalledWith('catalog_result_viewed', expect.anything());
  });

  it('limpa o contexto do carrinho ao remover o último filtro de campanha na sessão', () => {
    const { result } = renderHook(() => useCatalogPageState(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/catalogo?momento=evento']}>{children}</MemoryRouter>,
    });

    // Montou com campanha ativa: o contexto é sincronizado.
    expect(mocks.cart.setCampaign).toHaveBeenLastCalledWith({ source: 'finder', moment: 'evento' });

    // Remove o último filtro de campanha dentro da mesma sessão: ativa → inativa.
    act(() => result.current.updateParams({ momento: null }));

    expect(mocks.cart.setCampaign).toHaveBeenLastCalledWith(undefined);
  });
});
