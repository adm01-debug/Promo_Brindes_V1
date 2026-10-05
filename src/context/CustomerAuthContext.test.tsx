import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAuthProvider } from './CustomerAuthContext';
import { useCustomerAuth } from './customerAuth';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  reportClientError: vi.fn(),
}));

vi.mock('../lib/siteSupabaseConfig', () => ({ hasSiteAuthConfiguration: () => true }));
vi.mock('../lib/clientObservability', () => ({ reportClientError: mocks.reportClientError }));
vi.mock('../lib/siteSupabase', () => ({
  siteSupabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: vi.fn(),
    },
  },
}));

function Probe() {
  const auth = useCustomerAuth();
  return <><span>{auth.loading ? 'loading' : auth.initializationFailed ? 'failed' : 'ready'}</span><button type="button" onClick={auth.retryInitialization}>retry</button></>;
}

describe('inicialização da autenticação do cliente', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.reportClientError.mockReset();
  });

  it('sai do carregamento infinito, informa a falha e permite tentar novamente', async () => {
    mocks.getSession
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ data: { session: null } });

    render(<CustomerAuthProvider><Probe /></CustomerAuthProvider>);

    expect(await screen.findByText('failed')).toBeVisible();
    expect(mocks.reportClientError).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(screen.getByText('ready')).toBeVisible());
    expect(mocks.getSession).toHaveBeenCalledTimes(2);
  });

  it('trata o erro retornado pelo SDK mesmo quando a Promise é resolvida', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error('invalid stored session') });

    render(<CustomerAuthProvider><Probe /></CustomerAuthProvider>);

    expect(await screen.findByText('failed')).toBeVisible();
    expect(mocks.reportClientError).toHaveBeenCalledWith(expect.objectContaining({ message: 'invalid stored session' }));
  });
});
