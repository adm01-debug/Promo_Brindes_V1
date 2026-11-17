import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IdeaLandingPage from './IdeaLandingPage';
import type { CatalogQuery } from '../lib/catalog';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('../lib/analytics', () => ({ trackFunnelEvent: mocks.track }));
vi.mock('../components/Seo', () => ({ Seo: () => null }));
vi.mock('../components/ContextualFaq', () => ({ ContextualFaq: () => null }));
vi.mock('../components/ProductCard', () => ({ ProductCard: () => null }));

// Totais distintos por tópico: é o total do tópico ANTERIOR que vazava para o
// evento do tópico novo quando a instância da rota era reaproveitada.
vi.mock('../lib/catalog', () => ({
  fetchCatalog: (query: CatalogQuery) => Promise.resolve({
    products: [],
    total: query.search === 'copo' ? 42 : 7931,
    page: 1,
    pageSize: query.pageSize ?? 24,
  }),
}));

const harness = () => <MemoryRouter initialEntries={['/ideias/onboarding']}>
  <Link to="/ideias/eventos">ir para eventos</Link>
  <Link to="/ideias/onboarding">voltar para onboarding</Link>
  <Routes><Route path="/ideias/:topic" element={<IdeaLandingPage />} /></Routes>
</MemoryRouter>;

const totalsOf = (topic: string) => mocks.track.mock.calls
  .filter(([name, props]) => name === 'idea_landing_viewed' && (props as { topic: string }).topic === topic)
  .map(([, props]) => (props as { result_count: number }).result_count);

describe('telemetria da landing de ideias ao trocar de tópico', () => {
  beforeEach(() => { mocks.track.mockReset(); });
  afterEach(cleanup);

  it('emite uma única visualização por tópico, com o total do próprio tópico', async () => {
    render(harness());

    await waitFor(() => expect(totalsOf('onboarding')).toContain(7931));
    expect(totalsOf('onboarding')).toEqual([7931]);

    fireEvent.click(screen.getByRole('link', { name: 'ir para eventos' }));

    // Espera o evento correto chegar e então exige que ele seja o único: antes
    // da correção o tópico novo também recebia uma emissão com o total antigo.
    await waitFor(() => expect(totalsOf('eventos')).toContain(42));
    expect(totalsOf('eventos')).toEqual([42]);
  });

  it('não grava o tópico revisitado com o total do tópico que o visitante acabou de deixar', async () => {
    render(harness());
    await waitFor(() => expect(totalsOf('onboarding')).toContain(7931));

    fireEvent.click(screen.getByRole('link', { name: 'ir para eventos' }));
    await waitFor(() => expect(totalsOf('eventos')).toContain(42));

    fireEvent.click(screen.getByRole('link', { name: 'voltar para onboarding' }));
    // A instância da rota sobrevive à troca de tópico, então o Set de dedupe
    // acumula as chaves da sessão. O que não pode acontecer é a chave errada
    // (`onboarding|42`) entrar nele e passar a valer como a visita registrada.
    await waitFor(() => expect(totalsOf('eventos')).toEqual([42]));
    expect(totalsOf('onboarding')).toEqual([7931]);
  });
});
