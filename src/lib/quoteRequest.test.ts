import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildEmailHref, buildQuotePayload, submitQuoteRequest } from './quoteRequest';
import type { QuoteContact, QuoteItem } from '../types';

const contact: QuoteContact = {
  name: 'Ana Silva',
  company: 'Empresa Exemplo',
  email: 'ana@empresa.com.br',
  phone: '(11) 99999-9999',
  city: 'São Paulo / SP',
  deadline: '2026-12-01',
  notes: 'Evento de relacionamento',
  privacyAccepted: true,
};

const items: QuoteItem[] = [{
  key: '11111111-1111-4111-8111-111111111111::verde',
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'produto',
  name: 'Mochila Executiva',
  sku: 'MO-42',
  imageUrl: '/mochila.webp',
  quantity: 250,
  minQuantity: 50,
  colorName: 'Verde',
}];

describe('solicitação de orçamento', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('separa o consentimento do contato e registra versão e instante', () => {
    const payload = buildQuotePayload(contact, items, 'https://site.test/orcamento', '2026-09-08T12:00:00.000Z', 'request-quote-1');
    expect(payload.contact).not.toHaveProperty('privacyAccepted');
    expect(payload).toMatchObject({
      source: 'site-promo-brindes',
      items,
      pageUrl: 'https://site.test/orcamento',
      consent: { accepted: true, noticeVersion: '2026-09-08', acceptedAt: '2026-09-08T12:00:00.000Z' },
      clientRequestId: 'request-quote-1',
    });
  });

  it('gera um e-mail com produtos, quantidade, cor e contato', () => {
    const href = buildEmailHref(buildQuotePayload(contact, items), 'comercial@promo.test');
    expect(decodeURIComponent(href)).toContain('mailto:comercial@promo.test');
    expect(decodeURIComponent(href)).toContain('Mochila Executiva — cód. MO-42 — 250 un. — cor: Verde');
    expect(decodeURIComponent(href)).toContain('Empresa: Empresa Exemplo');
  });

  it('bloqueia endpoint sem HTTPS antes de transmitir dados pessoais', async () => {
    vi.stubEnv('VITE_QUOTE_REQUEST_ENDPOINT', 'http://inseguro.test/lead');
    await expect(submitQuoteRequest(buildQuotePayload(contact, items))).rejects.toThrow('HTTPS');
  });

  it('bloqueia uma URL HTTPS incompleta', async () => {
    vi.stubEnv('VITE_QUOTE_REQUEST_ENDPOINT', 'https://');
    await expect(submitQuoteRequest(buildQuotePayload(contact, items))).rejects.toThrow('URL HTTPS válida');
  });
});
