import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationForm } from './ConversationForm';

const mocks = vi.hoisted(() => ({ submit: vi.fn(), build: vi.fn(() => ({})) }));

vi.mock('../lib/contactRequest', () => ({
  buildContactPayload: mocks.build,
  submitContactRequest: mocks.submit,
}));

describe('formulário de conversa', () => {
  beforeEach(() => {
    mocks.submit.mockReset().mockImplementation(() => new Promise(() => undefined));
    mocks.build.mockClear();
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
});
