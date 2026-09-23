import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommemorativeDatesPage from './CommemorativeDatesPage';

const mocks = vi.hoisted(() => ({
  user: { id: 'conta-a' } as { id: string } | null,
  list: vi.fn(),
  save: vi.fn(),
}));

vi.mock('../context/customerAuth', () => ({
  useCustomerAuth: () => ({ user: mocks.user, loading: false, configured: true }),
}));
vi.mock('../lib/customerOccasionFavorites', () => ({
  listMyOccasionFavorites: mocks.list,
  setMyOccasionFavorite: mocks.save,
}));
vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));
vi.mock('../components/Seo', () => ({ Seo: () => null }));

const legacyKey = 'promo-brindes:occasion-favorites:v1';
const ownerKey = 'promo-brindes:occasion-favorites:local-owner';
const accountKey = (id: string) => `promo-brindes:occasion-favorites:account:${id}`;
const page = () => <MemoryRouter initialEntries={['/datas-comemorativas?ano=2026']}><CommemorativeDatesPage /></MemoryRouter>;

describe('favoritos de datas comemorativas por titular', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
    mocks.user = { id: 'conta-a' };
    mocks.list.mockReset().mockResolvedValue([]);
    mocks.save.mockReset().mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it('promove favoritos anônimos depois do login sem perdê-los', async () => {
    window.localStorage.setItem(legacyKey, JSON.stringify(['dia-do-cliente']));
    window.localStorage.setItem(ownerKey, 'anonymous');

    render(page());

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('dia-do-cliente', true));
    expect(await screen.findByRole('heading', { name: 'Minhas datas' })).toBeVisible();
    expect(window.localStorage.getItem(accountKey('conta-a'))).toContain('dia-do-cliente');
    expect(window.localStorage.getItem('promo-brindes:occasion-favorites:account-promoted:conta-a')).toBe('1');
  });

  it('não exibe cache da conta anterior se o carregamento da nova conta falhar', async () => {
    window.localStorage.setItem(legacyKey, JSON.stringify(['dia-do-cliente']));
    window.localStorage.setItem(ownerKey, 'conta-a');
    mocks.user = { id: 'conta-b' };
    mocks.list.mockRejectedValue(new Error('falha sintética'));

    const view = render(page());

    await screen.findByText('Não foi possível carregar suas datas salvas agora. Tente novamente mais tarde.');
    expect(view.container.querySelector('.saved-dates')).not.toHaveTextContent('Dia do Cliente');
    expect(window.localStorage.getItem(accountKey('conta-b'))).toBe('[]');
  });

  it('ignora rollback tardio de uma mutação da conta anterior', async () => {
    let rejectSave!: (error: Error) => void;
    mocks.list.mockResolvedValueOnce(['dia-do-cliente']).mockResolvedValueOnce([]);
    mocks.save.mockImplementation(() => new Promise((_, reject) => { rejectSave = reject; }));

    const view = render(page());
    const remove = await screen.findByRole('button', { name: 'Remover Dia do Cliente em Minhas datas' });
    fireEvent.click(remove);

    mocks.user = { id: 'conta-b' };
    view.rerender(page());
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.container.querySelector('.saved-dates')).not.toHaveTextContent('Dia do Cliente'));

    await act(async () => rejectSave(new Error('falha sintética atrasada')));

    await waitFor(() => expect(view.container.querySelector('.saved-dates')).not.toHaveTextContent('Dia do Cliente'));
    expect(window.localStorage.getItem(accountKey('conta-b'))).toBe('[]');
  });

  it('restaura a seleção e encerra o desfazer quando a remoção é rejeitada', async () => {
    mocks.list.mockResolvedValue(['dia-do-cliente']);
    mocks.save.mockRejectedValue(new Error('falha sintética'));

    const view = render(page());
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Dia do Cliente em Minhas datas' }));

    await screen.findByText('Não foi possível sincronizar esta alteração. Sua lista foi restaurada.');
    expect(view.container.querySelector('.saved-dates')).toHaveTextContent('Dia do Cliente');
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });
});
