import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthConfirmPage from './AuthConfirmPage';

const mocks = vi.hoisted(() => ({
  auth: {
    configured: true,
    loading: true,
    initializationFailed: false,
    user: null as { id: string } | null,
    claimHistory: vi.fn(() => new Promise<number>(() => undefined)),
    retryInitialization: vi.fn(),
  },
}));

vi.mock('../context/customerAuth', () => ({ useCustomerAuth: () => mocks.auth }));
vi.mock('../components/Seo', () => ({ Seo: () => null }));

describe('confirmação de acesso do cliente', () => {
  beforeEach(() => {
    mocks.auth.loading = true;
    mocks.auth.initializationFailed = false;
    mocks.auth.user = null;
    mocks.auth.claimHistory.mockClear();
    mocks.auth.retryInitialization.mockClear();
  });

  afterEach(cleanup);

  it('não anuncia identidade verificada enquanto a sessão ainda está carregando', () => {
    render(<MemoryRouter><AuthConfirmPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Validando seu acesso…' })).toBeVisible();
    expect(screen.queryByText('IDENTIDADE VERIFICADA')).not.toBeInTheDocument();
  });

  it('expõe uma recuperação real quando a inicialização falha', () => {
    mocks.auth.loading = false;
    mocks.auth.initializationFailed = true;
    render(<MemoryRouter><AuthConfirmPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mocks.auth.retryInitialization).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('IDENTIDADE VERIFICADA')).not.toBeInTheDocument();
  });

  it('só anuncia a identidade depois de receber um usuário autenticado', () => {
    mocks.auth.loading = false;
    mocks.auth.user = { id: 'customer-1' };
    render(<MemoryRouter><AuthConfirmPage /></MemoryRouter>);

    expect(screen.getByText('IDENTIDADE VERIFICADA')).toBeVisible();
    expect(mocks.auth.claimHistory).toHaveBeenCalledTimes(1);
  });

  it('mostra a falha diretamente quando a inicialização termina sem sessão', () => {
    mocks.auth.loading = false;
    mocks.auth.user = null;
    render(<MemoryRouter><AuthConfirmPage /></MemoryRouter>);

    expect(screen.getByRole('alert')).toHaveTextContent('ACESSO NÃO CONCLUÍDO');
    expect(screen.queryByText('IDENTIDADE VERIFICADA')).not.toBeInTheDocument();
  });
});
