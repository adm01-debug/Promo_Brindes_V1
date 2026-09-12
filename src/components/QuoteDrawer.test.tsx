import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { QuoteDrawer } from './QuoteDrawer';
import { QuoteCartProvider, useQuoteCart } from '../context/QuoteCartContext';

const STORAGE_KEY = 'promo-brindes:quote-selection:v1';

function DrawerHarness() {
  const cart = useQuoteCart();
  useEffect(() => { cart.setDrawerOpen(true); }, [cart]);
  return <QuoteDrawer />;
}

describe('QuoteDrawer', () => {
  beforeEach(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [{
      key: '11111111-1111-4111-8111-111111111111::sem-cor',
      productId: '11111111-1111-4111-8111-111111111111', slug: 'mochila', name: 'Mochila', sku: 'MO-42',
      imageUrl: '/images/product-placeholder.svg', minQuantity: 50, quantity: 100,
    }] }));
  });

  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

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
