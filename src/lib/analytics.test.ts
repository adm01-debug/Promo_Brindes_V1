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
});
