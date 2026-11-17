import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IdeaLandingPage from './IdeaLandingPage';
import type { CatalogQuery } from '../lib/catalog';

const mocks = vi.hoisted(() => ({ track: vi.fn(), falhar: false }));

vi.mock('../lib/analytics', () => ({ trackFunnelEvent: mocks.track }));
vi.mock('../components/Seo', () => ({ Seo: () => null }));
vi.mock('../components/ContextualFaq', () => ({ ContextualFaq: () => null }));
vi.mock('../components/ProductCard', () => ({ ProductCard: () => null }));

const produtos = (quantidade: number) =>
  Array.from({ length: quantidade }, (_, index) => ({ id: `p${index}` }));

// Quantidades distintas por tópico: era o conteúdo do tópico ANTERIOR que
// vazava para o evento do tópico novo quando a instância da rota era reusada.
vi.mock('../lib/catalog', () => ({
  fetchCatalog: (query: CatalogQuery) => {
    if (mocks.falhar) return Promise.reject(new Error('catálogo fora do ar'));
    const total = query.search === 'copo' ? 42 : 7931;
    return Promise.resolve({
      products: produtos(query.search === 'copo' ? 3 : 8),
      total,
      page: 1,
      pageSize: query.pageSize ?? 24,
    });
  },
}));

const harness = (entrada = '/ideias/onboarding') => <MemoryRouter initialEntries={[entrada]}>
  <Link to="/ideias/eventos">ir para eventos</Link>
  <Link to="/ideias/onboarding">voltar para onboarding</Link>
  <Routes><Route path="/ideias/:topic" element={<IdeaLandingPage />} /></Routes>
</MemoryRouter>;

const contagensDe = (topic: string) => mocks.track.mock.calls
  .filter(([name, props]) => name === 'idea_landing_viewed' && (props as { topic: string }).topic === topic)
  .map(([, props]) => (props as { result_count: number }).result_count);

describe('telemetria da landing de ideias', () => {
  beforeEach(() => { mocks.track.mockReset(); mocks.falhar = false; });
  afterEach(cleanup);

  it('conta as referências que a própria página mostrou, não o total do catalogQuery', async () => {
    render(harness());
    // onboarding não tem filtro: o total do catalogQuery é o catálogo público
    // inteiro (7931), mas a página mostra 8 cards — é isso que vai ao painel.
    await waitFor(() => expect(contagensDe('onboarding')).toContain(8));
    expect(contagensDe('onboarding')).toEqual([8]);
  });

  it('emite uma única visualização por tópico, com a contagem do próprio tópico', async () => {
    render(harness());
    await waitFor(() => expect(contagensDe('onboarding')).toContain(8));

    fireEvent.click(screen.getByRole('link', { name: 'ir para eventos' }));

    // Espera o evento correto e então exige que ele seja o único: antes da
    // correção o tópico novo também recebia uma emissão com o conteúdo antigo.
    await waitFor(() => expect(contagensDe('eventos')).toContain(3));
    expect(contagensDe('eventos')).toEqual([3]);
  });

  it('não grava o tópico revisitado com a contagem do tópico que o visitante deixou', async () => {
    render(harness());
    await waitFor(() => expect(contagensDe('onboarding')).toContain(8));

    fireEvent.click(screen.getByRole('link', { name: 'ir para eventos' }));
    await waitFor(() => expect(contagensDe('eventos')).toContain(3));

    fireEvent.click(screen.getByRole('link', { name: 'voltar para onboarding' }));
    // A instância sobrevive à troca de tópico, então o Set acumula as chaves da
    // sessão. O que não pode é a chave errada entrar nele e virar a visita.
    await waitFor(() => expect(contagensDe('eventos')).toEqual([3]));
    expect(contagensDe('onboarding')).toEqual([8]);
  });

  it('conta a visita mesmo quando a curadoria falha, para o funil não passar de 100%', async () => {
    mocks.falhar = true;
    render(harness());
    // A página renderiza o estado de erro: zero referências vistas. Sem este
    // evento os cliques no CTA ficariam sem a visita correspondente.
    await waitFor(() => expect(contagensDe('onboarding')).toEqual([0]));
  });
});
