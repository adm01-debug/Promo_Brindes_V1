import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SavedSelections } from './SavedSelections';

const mocks = vi.hoisted(() => ({
  list: vi.fn(), save: vi.fn(), hydrate: vi.fn(), archive: vi.fn(), remove: vi.fn(),
  restore: vi.fn(), openDrawer: vi.fn(), setTitle: vi.fn(),
  cartItems: [] as Array<Record<string, unknown>>,
}));

vi.mock('../context/quoteCart', () => ({
  useQuoteCart: () => ({
    items: mocks.cartItems, itemCount: mocks.cartItems.length, selectionTitle: 'Atual',
    restoreSavedSelection: mocks.restore, setDrawerOpen: mocks.openDrawer, setSelectionTitle: mocks.setTitle,
  }),
}));
vi.mock('../lib/customerSelections', () => ({
  listMySelections: mocks.list, saveMySelection: mocks.save,
  hydrateMySelection: mocks.hydrate, setMySelectionArchived: mocks.archive, deleteMySelection: mocks.remove,
}));

const saved = {
  id: '22222222-2222-4222-8222-222222222222', title: 'Feira de outubro',
  references: [{ id: '11111111-1111-4111-8111-111111111111', q: 100 }],
  campaign: { source: 'finder', moment: 'evento' }, version: 1, archivedAt: null,
  createdAt: '2026-09-22T12:00:00Z', updatedAt: '2026-09-22T12:00:00Z',
};

describe('seleções salvas na Área do Cliente', () => {
  afterEach(() => {
    mocks.cartItems = [];
    for (const value of [mocks.list, mocks.save, mocks.hydrate, mocks.archive, mocks.remove, mocks.restore, mocks.openDrawer, mocks.setTitle]) value.mockReset();
  });

  it('mostra as seleções sem copiar automaticamente o carrinho para a conta', async () => {
    mocks.list.mockResolvedValue([saved]);
    render(<MemoryRouter><SavedSelections /></MemoryRouter>);
    expect(await screen.findByText('Feira de outubro')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Salvar na minha conta' })).not.toBeInTheDocument();
  });

  it('exige confirmação antes de substituir o carrinho e preserva a seleção ao cancelar', async () => {
    mocks.cartItems = [{ productId: '33333333-3333-4333-8333-333333333333' }];
    mocks.list.mockResolvedValue([saved]);
    mocks.hydrate.mockResolvedValue([{ productId: saved.references[0]?.id }]);
    render(<MemoryRouter><SavedSelections /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Retomar seleção/ }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Retomar seleção/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Trocar seleção' }));
    await waitFor(() => expect(mocks.restore).toHaveBeenCalledWith(
      [{ productId: saved.references[0]?.id }], saved.campaign, saved.title,
    ));
  });
});
