import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CampaignFinder } from './CampaignFinder';

function completeBriefing() {
  fireEvent.click(screen.getByText('Evento'));
  fireEvent.click(screen.getByText('Colaboradores'));
  fireEvent.click(screen.getByText('51–200'));
  fireEvent.click(screen.getByText('Útil'));
}

describe('resumo editável do briefing', () => {
  afterEach(cleanup);

  it('resume as quatro respostas antes de abrir a curadoria', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    completeBriefing();

    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
    expect(screen.getByText('Evento')).toBeVisible();
    expect(screen.getByText('Colaboradores')).toBeVisible();
    expect(screen.getByText('51–200')).toBeVisible();
    expect(screen.getByText('Útil')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver minha curadoria' })).toBeEnabled();
    expect(screen.getByText('Você continua no controle.')).toBeVisible();
  });

  it('remove só a escolha solicitada e volta à etapa correspondente', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);
    completeBriefing();

    fireEvent.click(screen.getByRole('button', { name: 'Remover Colaboradores e editar pessoas' }));

    expect(screen.getByRole('heading', { name: 'Quem precisa ser encantado?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para etapa 1: momento' }));
    expect(screen.getByRole('button', { name: /Evento/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('permite revisar todas as respostas sem apagar o que já foi escolhido', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);
    completeBriefing();

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar respostas' }));

    expect(screen.getByRole('heading', { name: 'O que está acontecendo?' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Evento/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('Onboarding'));
    expect(screen.getByRole('heading', { name: 'Quem precisa ser encantado?' })).toBeVisible();
    fireEvent.click(screen.getByText('Clientes'));
    expect(screen.getByRole('heading', { name: 'Quantas pessoas, aproximadamente?' })).toBeVisible();
    fireEvent.click(screen.getByText('Até 50'));
    expect(screen.getByRole('heading', { name: 'Que sensação a escolha deve passar?' })).toBeVisible();
    fireEvent.click(screen.getByText('Premium'));
    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
  });
});
