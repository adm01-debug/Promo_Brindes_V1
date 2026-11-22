import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

describe('resumo antes das quatro respostas e cancelamento da edicao', () => {
  afterEach(cleanup);

  it('abre o resumo parcial com o que ja foi escolhido', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    fireEvent.click(screen.getByText('Evento'));
    fireEvent.click(screen.getByText('Colaboradores'));

    expect(screen.queryByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar 2 escolhas' }));

    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
    expect(screen.getByText('Evento')).toBeVisible();
    expect(screen.getByText('Colaboradores')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver minha curadoria' })).toBeEnabled();
  });

  it('oferece o resumo parcial a partir de uma unica escolha', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    fireEvent.click(screen.getByText('Evento'));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar 1 escolha' }));

    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
  });

  it('cancela a edicao devolvendo o resumo com as escolhas originais', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);
    completeBriefing();

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar respostas' }));
    fireEvent.click(screen.getByText('Onboarding'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
    expect(screen.getByText('Evento')).toBeVisible();
    expect(screen.getByText('Colaboradores')).toBeVisible();
    expect(screen.getByText('51–200')).toBeVisible();
    expect(screen.getByText('Útil')).toBeVisible();
  });

  it('nao oferece cancelar edicao em quem nunca viu o resumo', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: 'Cancelar edição' })).toBeNull();
  });

  it('devolve o foco ao titulo do resumo ao cancelar a edicao', async () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);
    completeBriefing();

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar respostas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));
    await new Promise<void>((resolve) => { window.requestAnimationFrame(() => resolve()); });

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' }));
  });

  it('desfaz a remocao feita no resumo quando a edicao e cancelada', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);
    completeBriefing();

    fireEvent.click(screen.getByRole('button', { name: 'Remover Colaboradores e editar pessoas' }));
    expect(screen.getByRole('heading', { name: 'Quem precisa ser encantado?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
    expect(screen.getByText('Colaboradores')).toBeVisible();
    expect(screen.getByText('Evento')).toBeVisible();
  });

  it('mantem a remocao quando o resumo e reaberto por Revisar escolhas', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);
    completeBriefing();

    fireEvent.click(screen.getByRole('button', { name: 'Remover Colaboradores e editar pessoas' }));
    fireEvent.click(screen.getByText('Clientes'));

    // Com a quarta resposta a etapa fecha sozinha e o resumo ja mostra a troca.
    expect(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' })).toBeVisible();
    expect(screen.queryByText('Colaboradores')).toBeNull();
    expect(screen.getByText('Clientes')).toBeVisible();
  });

  it('nao restaura escolha desfeita fora do resumo', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    fireEvent.click(screen.getByText('Evento'));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar 1 escolha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar respostas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByText('Evento')).toBeVisible();
  });
});

describe('foco do teclado entre as etapas', () => {
  afterEach(cleanup);

  const nextFrame = () => new Promise<void>((resolve) => { window.requestAnimationFrame(() => resolve()); });

  it('devolve o foco ao titulo da etapa seguinte em vez de perde-lo no body', async () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    fireEvent.click(screen.getByText('Evento'));
    await nextFrame();

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Quem precisa ser encantado?' }));
  });

  it('devolve o foco ao titulo do resumo quando o briefing fecha', async () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    completeBriefing();
    await nextFrame();

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'O que entendemos da sua campanha' }));
  });

  it('devolve o foco a etapa aberta pelo resumo', async () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    completeBriefing();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar respostas' }));
    await nextFrame();

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'O que está acontecendo?' }));
  });
});

describe('caminho sem briefing ("ainda não sei")', () => {
  afterEach(cleanup);

  it('oferece a saída para o catálogo quando nenhuma resposta foi dada', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    const explore = screen.getByRole('button', { name: 'Ainda não sei o que escolher' });
    expect(explore).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver minha curadoria' })).toBeDisabled();
  });

  it('esconde a saída assim que o briefing começa a ser respondido', () => {
    render(<MemoryRouter><CampaignFinder /></MemoryRouter>);

    fireEvent.click(screen.getByText('Evento'));

    expect(screen.queryByRole('button', { name: 'Ainda não sei o que escolher' })).not.toBeInTheDocument();
  });

  it('navega ao catálogo sem exigir briefing', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<CampaignFinder />} />
          <Route path="/catalogo" element={<div>Catálogo desbloqueado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ainda não sei o que escolher' }));

    expect(screen.getByText('Catálogo desbloqueado')).toBeInTheDocument();
  });
});
