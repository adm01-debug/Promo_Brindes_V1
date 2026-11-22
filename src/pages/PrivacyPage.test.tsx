import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacyPage from './PrivacyPage';
import { confirmationDeliveryLabel } from '../lib/quoteConfirmation';

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );
}

describe('PrivacyPage', () => {
  it('declara que a entrega pode estar indisponível em vez de prometer envio', () => {
    renderPage();
    const section = screen.getByRole('heading', { name: /confirmações por e-mail e whatsapp/i }).closest('section');
    expect(section).not.toBeNull();
    const text = section?.textContent ?? '';
    // Os três estados que a tela de confirmação realmente mostra precisam estar
    // nomeados na política — senão ela volta a prometer entrega incondicional.
    expect(text).toContain(confirmationDeliveryLabel('sent'));
    expect(text).toContain(confirmationDeliveryLabel('pending'));
    expect(text).toContain(confirmationDeliveryLabel('unavailable'));
  });

  it('não promete que a cópia por WhatsApp sempre será entregue', () => {
    renderPage();
    const section = screen.getByRole('heading', { name: /confirmações por e-mail e whatsapp/i }).closest('section');
    const text = section?.textContent ?? '';
    expect(text).not.toMatch(/sempre (?:será|sera) entr/i);
    expect(text).toContain('Indisponível no momento');
  });
});
