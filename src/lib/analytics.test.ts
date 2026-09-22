import { beforeEach, describe, expect, it, vi } from 'vitest';

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track: trackMock }));

import { redactAnalyticsUrl, trackFunnelEvent } from './analytics';

describe('instrumentação segura', () => {
  beforeEach(() => trackMock.mockClear());

  it('remove query string e fragmento antes de enviar pageview', () => {
    expect(redactAnalyticsUrl({ type: 'pageview', url: 'https://promo.test/catalogo?q=email%40empresa.com#filtro' })).toEqual({
      type: 'pageview',
      url: 'https://promo.test/catalogo',
    });
    expect(redactAnalyticsUrl({ type: 'event', url: 'http://[' })).toBeNull();
  });

  it('normaliza identificadores da área privada antes do pageview', () => {
    expect(redactAnalyticsUrl({ type: 'pageview', url: 'https://promo.test/minha-conta/orcamentos/11111111-1111-4111-8111-111111111111?utm=teste' })).toMatchObject({
      url: 'https://promo.test/minha-conta/orcamentos/:id',
    });
    expect(redactAnalyticsUrl({ type: 'pageview', url: 'https://promo.test/selecoes/compartilhada?s=segredo' })).toMatchObject({
      url: 'https://promo.test/selecoes/compartilhada',
    });
    expect(redactAnalyticsUrl({ type: 'pageview', url: 'https://promo.test/produto/bolsa-personalizada-123' })).toMatchObject({
      url: 'https://promo.test/produto/:identifier',
    });
    expect(redactAnalyticsUrl({ type: 'pageview', url: 'https://promo.test/interno/cliente@empresa.test' })).toMatchObject({
      url: 'https://promo.test/rota-nao-listada',
    });
  });

  it('emite somente propriedades agregadas do contrato fechado', () => {
    let observed: unknown;
    window.addEventListener('promo:analytics', (event) => { observed = (event as CustomEvent).detail; }, { once: true });
    trackFunnelEvent('search_started', { source: 'home', query_length: 18, suggestion: false, email: 'nao-enviar@empresa.com' } as never);
    expect(trackMock).toHaveBeenCalledWith('search_started', { source: 'home', query_length: 18, suggestion: false });
    expect(JSON.stringify(observed)).not.toMatch(/email|telefone|query_text|nome/i);
  });

  it('mede a biblioteca sem enviar o texto pesquisado', () => {
    trackFunnelEvent('catalog_library_filtered', {
      theme: 'events',
      has_query: true,
      result_count: 2,
      query: 'evento da Empresa Secreta',
    } as never);
    expect(trackMock).toHaveBeenCalledWith('catalog_library_filtered', {
      theme: 'events',
      has_query: true,
      result_count: 2,
    });
  });

  it('mede a área do cliente sem enviar identidade ou protocolo', () => {
    trackFunnelEvent('customer_history_viewed', { result_count: 3, has_filter: true, email: 'cliente@empresa.com' } as never);
    expect(trackMock).toHaveBeenCalledWith('customer_history_viewed', { result_count: 3, has_filter: true });
  });
});
