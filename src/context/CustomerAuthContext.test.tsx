import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAuthProvider } from './CustomerAuthContext';
import { useCustomerAuth } from './customerAuth';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  reportClientError: vi.fn(),
}));

let emitAuthState: ((event: string, session: Session | null) => void) | undefined;

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
  return <><span>{auth.loading ? 'loading' : auth.initializationFailed ? 'failed' : 'ready'}</span><span>{auth.user?.id || 'anonymous'}</span><button type="button" onClick={auth.retryInitialization}>retry</button></>;
}

function sessionFor(id: string): Session {
  return { user: { id } } as Session;
}

describe('inicialização da autenticação do cliente', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.getSession.mockReset();
    emitAuthState = undefined;
    mocks.onAuthStateChange.mockReset().mockImplementation((listener: (event: string, session: Session | null) => void) => {
      emitAuthState = listener;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
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

  it('não apaga a falha quando INITIAL_SESSION chega vazio após getSession falhar', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error('invalid stored session') });

    render(<CustomerAuthProvider><Probe /></CustomerAuthProvider>);
    expect(await screen.findByText('failed')).toBeVisible();

    act(() => emitAuthState?.('INITIAL_SESSION', null));
    expect(screen.getByText('failed')).toBeVisible();
  });

  it('não deixa getSession atrasado sobrescrever um evento de autenticação mais novo', async () => {
    let resolveSession!: (value: { data: { session: Session }; error: null }) => void;
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));

    render(<CustomerAuthProvider><Probe /></CustomerAuthProvider>);
    await waitFor(() => expect(emitAuthState).toBeTypeOf('function'));

    act(() => emitAuthState?.('SIGNED_IN', sessionFor('sessao-mais-nova')));
    expect(await screen.findByText('sessao-mais-nova')).toBeVisible();

    await act(async () => resolveSession({ data: { session: sessionFor('sessao-antiga') }, error: null }));
    expect(screen.getByText('sessao-mais-nova')).toBeVisible();
    expect(screen.queryByText('sessao-antiga')).not.toBeInTheDocument();
  });

  it('limpa dados pessoais de visitante anônimo antes de aceitar um login posterior', async () => {
    sessionStorage.setItem('promo-brindes:quote-draft:v1', JSON.stringify({ contact: { email: 'visitante@exemplo.test' } }));
    sessionStorage.setItem('promo-brindes:quote-attempt', JSON.stringify({ key: 'attempt-visitante' }));
    sessionStorage.setItem('promo-brindes:quote-repeat:v1', JSON.stringify({ quoteId: 'repeat-visitante' }));
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<CustomerAuthProvider><Probe /></CustomerAuthProvider>);
    expect(await screen.findByText('ready')).toBeVisible();

    act(() => emitAuthState?.('SIGNED_IN', sessionFor('novo-titular')));
    expect(await screen.findByText('novo-titular')).toBeVisible();
    await waitFor(() => {
      expect(sessionStorage.getItem('promo-brindes:quote-draft:v1')).toBeNull();
      expect(sessionStorage.getItem('promo-brindes:quote-attempt')).toBeNull();
      expect(sessionStorage.getItem('promo-brindes:quote-repeat:v1')).toBeNull();
    });
  });
});
