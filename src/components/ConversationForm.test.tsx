import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationForm } from './ConversationForm';

const mocks = vi.hoisted(() => ({ submit: vi.fn(), build: vi.fn(() => ({})), track: vi.fn() }));

vi.mock('../lib/contactRequest', () => ({
  buildContactPayload: mocks.build,
  submitContactRequest: mocks.submit,
}));

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/analytics')>()),
  trackFunnelEvent: mocks.track,
}));

describe('formulário de conversa', () => {
  beforeEach(() => {
    mocks.submit.mockReset().mockImplementation(() => new Promise(() => undefined));
    mocks.build.mockClear();
    mocks.track.mockClear();
  });

  it('congela os dados enquanto o envio está em andamento para não apagar edições tardias', async () => {
    render(<MemoryRouter><ConversationForm /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Seu nome *'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('E-mail *'), { target: { value: 'ana@example.test' } });
    fireEvent.click(screen.getByLabelText(/Li o aviso de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /Falar com a Promo/ }));

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Seu nome *')).toBeDisabled();
    expect(screen.getByLabelText('E-mail *')).toBeDisabled();
    expect(screen.getByLabelText(/Li o aviso de privacidade/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });

  it('registra contact_submitted no canal do formulário quando a API aceita', async () => {
    mocks.submit.mockResolvedValue({ mode: 'api', requestId: 'ORC-1' });
    render(<MemoryRouter><ConversationForm /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Seu nome *'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('E-mail *'), { target: { value: 'ana@example.test' } });
    fireEvent.click(screen.getByLabelText(/Li o aviso de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /Falar com a Promo/ }));

    await waitFor(() => expect(mocks.track).toHaveBeenCalledWith('contact_submitted', { channel: 'form', has_message: false }));
    expect(mocks.track).toHaveBeenCalledTimes(1);
  });

  it('registra contact_submitted com canal de e-mail quando o envio cai no fallback', async () => {
    mocks.submit.mockResolvedValue({ mode: 'email', href: 'mailto:contato@promo.test' });
    render(<MemoryRouter><ConversationForm /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Seu nome *'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('E-mail *'), { target: { value: 'ana@example.test' } });
    fireEvent.click(screen.getByLabelText(/Li o aviso de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /Falar com a Promo/ }));

    await waitFor(() => expect(mocks.track).toHaveBeenCalledWith('contact_submitted', { channel: 'email', has_message: false }));
  });

  it('não registra contact_submitted quando o envio falha', async () => {
    mocks.submit.mockRejectedValue(new Error('falhou'));
    render(<MemoryRouter><ConversationForm /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Seu nome *'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('E-mail *'), { target: { value: 'ana@example.test' } });
    fireEvent.click(screen.getByLabelText(/Li o aviso de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /Falar com a Promo/ }));

    await waitFor(() => expect(screen.getByText('falhou')).toBeInTheDocument());
    expect(mocks.track).not.toHaveBeenCalled();
  });
});
