import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

const trackMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/analytics')>()),
  trackFunnelEvent: trackMock,
}));
import { MemoryRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { QuoteDrawer } from './QuoteDrawer';
import { QuoteCartProvider } from '../context/QuoteCartContext';
import { useQuoteCart } from '../context/quoteCart';

const STORAGE_KEY = 'promo-brindes:quote-selection:v1';

function DrawerHarness() {
  const cart = useQuoteCart();
  useEffect(() => { cart.setDrawerOpen(true); }, [cart]);
  return <QuoteDrawer />;
}

describe('QuoteDrawer', () => {
  beforeEach(() => {
    trackMock.mockClear();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [{
      key: '11111111-1111-4111-8111-111111111111::sem-cor',
      productId: '11111111-1111-4111-8111-111111111111', slug: 'mochila', name: 'Mochila', sku: 'MO-42',
      imageUrl: '/images/product-placeholder.svg', minQuantity: 50, quantity: 100,
    }] }));
  });

  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it('registra a remoção de um item com a contagem restante', () => {
    render(<MemoryRouter><QuoteCartProvider><DrawerHarness /></QuoteCartProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Remover Mochila' }));
    expect(trackMock).toHaveBeenCalledWith('selection_item_removed', { item_count: 0, via: 'item' });
  });

  it('registra a limpeza da seleção somente depois da confirmação', () => {
    render(<MemoryRouter><QuoteCartProvider><DrawerHarness /></QuoteCartProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));
    expect(trackMock).not.toHaveBeenCalledWith('selection_item_removed', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Limpar produtos' }));
    expect(trackMock).toHaveBeenCalledWith('selection_item_removed', { item_count: 0, via: 'clear' });
  });

  it('deixa substituir a quantidade inteira antes de aplicar o mínimo no blur', () => {
    render(<MemoryRouter><QuoteCartProvider><DrawerHarness /></QuoteCartProvider></MemoryRouter>);
    const input = screen.getByRole('spinbutton', { name: 'Quantidade desejada de Mochila' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '250' } });
    expect(input).toHaveValue(250);
    fireEvent.blur(input);
    expect(input).toHaveValue(250);

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(50);
  });
});
