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

  it('compara conflito entre dispositivos e permite preservar as duas versões', async () => {
    mocks.cartItems = [{ productId: '33333333-3333-4333-8333-333333333333' }];
    const latest = { ...saved, version: 2, references: [...saved.references, { id: '44444444-4444-4444-8444-444444444444', q: 50 }], updatedAt: '2026-09-23T12:00:00Z' };
    mocks.list.mockResolvedValueOnce([saved]).mockResolvedValueOnce([latest]).mockResolvedValueOnce([latest]);
    mocks.save.mockRejectedValueOnce(new Error('selection_version_conflict')).mockResolvedValueOnce(undefined);
    render(<MemoryRouter><SavedSelections /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Atualizar com a seleção atual' }));
    expect(await screen.findByRole('alertdialog', { name: 'Esta campanha mudou em outro dispositivo.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Versão deste navegador')).toHaveTextContent('1 produto');
    expect(screen.getByLabelText('Versão salva na conta')).toHaveTextContent('2 produtos');
    fireEvent.click(screen.getByRole('button', { name: 'Preservar as duas' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save.mock.calls[1]?.[0]).toBe('Feira de outubro — cópia');
    expect(mocks.save.mock.calls[1]?.[3]).toBeUndefined();
    expect(await screen.findByText(/As duas versões foram preservadas/)).toBeVisible();
  });

  it('não oferece sobrescrever quando outra sessão arquivou a seleção', async () => {
    mocks.cartItems = [{ productId: '33333333-3333-4333-8333-333333333333' }];
    const archived = { ...saved, version: 2, archivedAt: '2026-09-23T12:00:00Z', updatedAt: '2026-09-23T12:00:00Z' };
    mocks.list.mockResolvedValueOnce([saved]).mockResolvedValueOnce([archived]);
    mocks.save.mockRejectedValueOnce(new Error('selection_version_conflict'));
    render(<MemoryRouter><SavedSelections /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Atualizar com a seleção atual' }));

    expect(await screen.findByRole('alertdialog', { name: 'Esta campanha mudou em outro dispositivo.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Versão salva na conta')).toHaveTextContent('Arquivada em');
    expect(screen.queryByRole('button', { name: 'Substituir pela deste navegador' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preservar as duas' })).toBeEnabled();
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});
