import { beforeEach, describe, expect, it, vi } from 'vitest';

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track: trackMock }));

import { briefingAssetSizeBand, redactAnalyticsUrl, redactTelemetryUrl, trackFunnelEvent } from './analytics';

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

  it('aplica a mesma minimização de URL aos eventos de desempenho', () => {
    expect(redactTelemetryUrl({ name: 'LCP', value: 1800, url: 'https://promo.test/minha-conta/orcamentos/11111111-1111-4111-8111-111111111111?email=cliente%40teste' }))
      .toMatchObject({ name: 'LCP', value: 1800, url: 'https://promo.test/minha-conta/orcamentos/:id' });
  });

  it('emite somente propriedades agregadas do contrato fechado', () => {
    let observed: unknown;
    window.addEventListener('promo:analytics', (event) => { observed = (event as CustomEvent).detail; }, { once: true });
    trackFunnelEvent('search_started', { source: 'home', query_length: 18, suggestion: false, email: 'nao-enviar@empresa.com' } as never);
    expect(trackMock).toHaveBeenCalledWith('search_started', { source: 'home', query_length: 18, suggestion: false });
    expect(JSON.stringify(observed)).not.toMatch(/email|telefone|query_text|nome/i);
  });

  it('mede o conteudo editorial sem vazar a URL da curadoria', () => {
    trackFunnelEvent('idea_landing_viewed', { topic: 'onboarding', result_count: 7931 });
    expect(trackMock).toHaveBeenCalledWith('idea_landing_viewed', { topic: 'onboarding', result_count: 7931 });
    trackFunnelEvent('idea_catalog_opened', { topic: 'eventos', placement: 'hero', catalog_url: '/catalogo?momento=evento' } as never);
    expect(trackMock).toHaveBeenCalledWith('idea_catalog_opened', { topic: 'eventos', placement: 'hero' });
  });

  it('registra clareza, resumo editado e conflito sem aceitar texto livre', () => {
    trackFunnelEvent('feedback_answered', { scope: 'envio', answer: 'parcial', has_campaign: true, comment: 'achei confuso' } as never);
    expect(trackMock).toHaveBeenCalledWith('feedback_answered', { scope: 'envio', answer: 'parcial', has_campaign: true });
    trackFunnelEvent('feedback_declined', { scope: 'envio', has_campaign: false, comment: 'prefiro nao' } as never);
    expect(trackMock).toHaveBeenCalledWith('feedback_declined', { scope: 'envio', has_campaign: false });
    trackFunnelEvent('summary_edited', { field: 'actionName', filled: true, value: 'Kit Confidencial 2027' } as never);
    expect(trackMock).toHaveBeenCalledWith('summary_edited', { field: 'actionName', filled: true });
    trackFunnelEvent('campaign_conflict', { resolution: 'removida', fields: 3, moment: 'evento' } as never);
    expect(trackMock).toHaveBeenCalledWith('campaign_conflict', { resolution: 'removida', fields: 3 });
    expect(JSON.stringify(trackMock.mock.calls)).not.toMatch(/Kit Confidencial|achei confuso|prefiro nao/);
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

describe('eventos de selecao e link compartilhado', () => {
  it('nao deixa passar propriedade fora da allowlist nos eventos novos', () => {
    trackFunnelEvent('selection_item_removed', { item_count: 2, via: 'clear', product_id: 'segredo' } as never);
    expect(trackMock).toHaveBeenCalledWith('selection_item_removed', { item_count: 2, via: 'clear' });
    trackMock.mockClear();
    trackFunnelEvent('shared_selection_opened', { item_count: 3, persistent: true, token: 'abc' } as never);
    expect(trackMock).toHaveBeenCalledWith('shared_selection_opened', { item_count: 3, persistent: true });
  });
});

describe('faixa de tamanho do anexo', () => {
  it('agrupa o byte em faixas para nao virar identificador do arquivo', () => {
    expect(briefingAssetSizeBand(1024 * 1024)).toBe('ate-1mb');
    expect(briefingAssetSizeBand(1024 * 1024 + 1)).toBe('ate-5mb');
    expect(briefingAssetSizeBand(5 * 1024 * 1024)).toBe('ate-5mb');
    expect(briefingAssetSizeBand(5 * 1024 * 1024 + 1)).toBe('acima-5mb');
  });
});
