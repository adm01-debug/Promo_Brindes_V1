/** Auditoria: PASS confirma o defeito observado, não a correção. Sem rede ou banco. */
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Page from '../../../src/pages/CommemorativeDatesPage';
import { rankRelatedProducts } from '../../../src/lib/catalogRanking';
import { useCatalogPageState } from '../../../src/lib/useCatalogPageState';
import type { CatalogProduct } from '../../../src/types';

const mocks = vi.hoisted(() => ({
  user: { id: 'conta-a' } as { id: string } | null,
  list: vi.fn(), save: vi.fn(),
  catalog: vi.fn(), categories: { data: [], loading: false, error: null },
  cart: { setCampaign: vi.fn() },
}));
vi.mock('../../../src/context/customerAuth', () => ({
  useCustomerAuth: () => ({ user: mocks.user, loading: false, configured: true }),
}));
vi.mock('../../../src/lib/customerOccasionFavorites', () => ({
  listMyOccasionFavorites: mocks.list, setMyOccasionFavorite: mocks.save,
}));
vi.mock('../../../src/lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));
vi.mock('../../../src/components/Seo', () => ({ Seo: () => null }));
vi.mock('../../../src/lib/hooks', () => ({
  useCatalog: mocks.catalog, useAllCategories: () => mocks.categories,
}));
vi.mock('../../../src/context/quoteCart', () => ({ useQuoteCart: () => mocks.cart }));

const key = 'promo-brindes:occasion-favorites:v1';
const ownerKey = 'promo-brindes:occasion-favorites:local-owner';
const ui = () => <MemoryRouter initialEntries={['/datas-comemorativas?ano=2026']}><Page /></MemoryRouter>;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  window.localStorage.clear();
  mocks.user = { id: 'conta-a' };
  mocks.list.mockReset();
  mocks.save.mockReset().mockResolvedValue(undefined);
  window.sessionStorage.clear();
});
afterEach(cleanup);

it('A01: favoritos anônimos são apagados sem promoção após login', async () => {
  window.localStorage.setItem(key, JSON.stringify(['dia-do-cliente']));
  window.localStorage.setItem(ownerKey, 'anonymous');
  mocks.list.mockResolvedValue([]);
  render(ui());
  await waitFor(() => expect(window.localStorage.getItem(key)).toBe('[]'));
  expect(mocks.list).toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it('A02: falha ao carregar conta B mantém favoritos da conta A visíveis e reatribui cache', async () => {
  window.localStorage.setItem(key, JSON.stringify(['dia-do-cliente']));
  window.localStorage.setItem(ownerKey, 'conta-a');
  mocks.user = { id: 'conta-b' };
  mocks.list.mockRejectedValue(new Error('falha sintética'));
  const { container } = render(ui());
  await screen.findByText('Não foi possível carregar suas datas salvas agora. Tente novamente mais tarde.');
  expect(container.querySelector('.saved-dates')).toHaveTextContent('Dia do Cliente');
  expect(window.localStorage.getItem(ownerKey)).toBe('conta-b');
});

it('A03: rollback tardio de remoção da conta A insere favorito na interface da conta B', async () => {
  let rejectSave!: (error: Error) => void;
  mocks.list.mockResolvedValueOnce(['dia-do-cliente']).mockResolvedValueOnce([]);
  mocks.save.mockImplementation(() => new Promise((_, reject) => { rejectSave = reject; }));
  const view = render(ui());
  const remove = await screen.findByRole('button', { name: 'Remover Dia do Cliente em Minhas datas' });
  fireEvent.click(remove);
  mocks.user = { id: 'conta-b' };
  view.rerender(ui());
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(window.localStorage.getItem(key)).toBe('[]'));
  await act(async () => rejectSave(new Error('falha sintética atrasada')));
  await waitFor(() => expect(view.container.querySelector('.saved-dates')).toHaveTextContent('Dia do Cliente'));
  expect(window.localStorage.getItem(ownerKey)).toBe('conta-b');
});

it('A04: ordenação final de relacionados desfaz a diversidade calculada', () => {
  const make = (id: string, name: string, material: string) => ({
    id, name, sku: id, slug: id, description: '', shortDescription: '', imageUrl: '', images: [],
    categoryId: 'categoria', mainCategoryId: 'categoria', brand: null, minQuantity: 10,
    isNew: false, isFeatured: false, isBestseller: false, isKit: false,
    allowsPersonalization: false, hasCommercialPackaging: false, colors: [], materials: [material], dimensions: {},
  }) satisfies CatalogProduct;
  const ranked = rankRelatedProducts([
    make('a', 'A', 'Aço'), make('b', 'B', 'Aço'), make('c', 'C', 'Aço'), make('d', 'D', 'Bambu'),
  ], make('anchor', 'Base', 'Outro'));
  expect(ranked.slice(0, 3).map((product) => product.materials[0])).toEqual(['Aço', 'Aço', 'Aço']);
});

it.each(['nome', 'recentes'])('A05: curadoria sobrescreve a ordem explícita %s', (sort) => {
  const make = (id: string, name: string, featured: boolean) => ({
    id, name, sku: id, slug: id, description: '', shortDescription: '', imageUrl: '', images: [],
    categoryId: 'categoria', mainCategoryId: 'categoria', brand: null, minQuantity: 10,
    isNew: false, isFeatured: featured, isBestseller: false, isKit: false,
    allowsPersonalization: false, hasCommercialPackaging: false, colors: [], materials: [], dimensions: {},
  }) satisfies CatalogProduct;
  // API já devolveu A antes de B segundo a ordenação solicitada.
  mocks.catalog.mockReturnValue({ data: { products: [make('a', 'A', false), make('b', 'B', true)], total: 2, page: 1, pageSize: 24 }, loading: false, error: null });
  const { result } = renderHook(() => useCatalogPageState(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[`/catalogo?ordem=${sort}`]}>{children}</MemoryRouter>,
  });
  expect(result.current.sort).toBe(sort);
  expect(result.current.catalog.data.products.map((product) => product.id)).toEqual(['b', 'a']);
});
