import { describe, expect, it } from 'vitest';
import { normalizeCampaignBrief } from './campaignBrief';
import { normalizeQuoteBriefing } from './quoteBriefing';
import { parseCustomerQuoteAdjustmentResult, parseCustomerQuoteDetail, parseCustomerQuotePage } from './customerQuoteContract';

const quoteId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const proposalId = '33333333-3333-4333-8333-333333333333';

function item(overrides: Record<string, unknown> = {}) {
  return {
    key: `${quoteId}::sem-cor`, productId: quoteId, slug: 'garrafa-termica', name: 'Garrafa térmica', sku: 'PB-100',
    imageUrl: '/images/garrafa.webp', quantity: 100, minQuantity: 50, decisionGroup: 'primary', ...overrides,
  };
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: quoteId, protocol: 'PB26000001-0', status: 'new', company: 'Marca Exemplo', actionName: 'Onboarding',
    createdAt: '2026-09-23T12:00:00.000Z', lastMovementAt: '2026-09-23T13:00:00.000Z', desiredDeadline: '2026-10-10',
    itemCount: 1, totalUnits: 100, productNames: ['Garrafa térmica'], productImages: ['/images/garrafa.webp'], ...overrides,
  };
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    ...summary(), submittedAt: '2026-09-23T12:00:00.000Z', contactName: 'Ana Silva', email: 'ana@example.test',
    phone: '(11) 99999-9999', city: 'São Paulo/SP', notes: 'Preferência por material reciclado.',
    campaign: { source: 'finder', moment: 'onboarding', audience: 'colaboradores' },
    briefing: { actionName: 'Onboarding', budgetRange: '26-50', budgetScope: 'por-pessoa' },
    items: [item()],
    events: [{ id: eventId, type: 'submitted', status: 'new', title: 'Solicitação recebida', description: null, createdAt: '2026-09-23T12:00:00.000Z' }],
    proposals: [{ id: proposalId, version: 1, title: 'Proposta inicial', validUntil: '2026-10-15', publishedAt: '2026-09-23T13:00:00.000Z', isCurrent: true }],
    ...overrides,
  };
}

describe('contrato runtime do histórico de orçamentos', () => {
  it('aceita o formato público da RPC e remove somente imagens opcionais inseguras', () => {
    const page = parseCustomerQuotePage({
      items: [summary({ productImages: ['/images/garrafa.webp', 'javascript:alert(1)', 'https://cdn.example.test/item.webp#tracker', 'https://cliente@rastreador.example/item.webp', '//rastreador.example/item.webp'] })],
      total: 1, limit: 20, offset: 0,
    });

    expect(page.items[0]).toMatchObject({ id: quoteId, status: 'new', productImages: ['/images/garrafa.webp', 'https://cdn.example.test/item.webp'] });
    expect(parseCustomerQuoteDetail(detail())).toMatchObject({ id: quoteId, items: [expect.objectContaining({ quantity: 100 })] });
    expect(parseCustomerQuoteDetail(detail({ items: [item({ decisionGroup: undefined })] }))?.items[0]?.decisionGroup).toBeUndefined();
    expect(parseCustomerQuoteAdjustmentResult({ id: eventId, createdAt: '2026-09-23T12:00:00.000Z' })).toEqual({ id: eventId, createdAt: '2026-09-23T12:00:00.000Z' });
  });

  it('rejeita status, identificadores e quantidades fora do contrato em vez de renderizar JSON arbitrário', () => {
    expect(() => parseCustomerQuotePage({ items: [summary({ status: 'spam' })], total: 1, limit: 20, offset: 0 })).toThrow('invalid_customer_quote_response');
    expect(() => parseCustomerQuoteDetail(detail({ items: [item({ quantity: 0 })] }))).toThrow('invalid_customer_quote_response');
    expect(() => parseCustomerQuoteDetail(detail({ events: [{ id: 'forged', type: 'submitted', status: 'new', title: 'x', description: null, createdAt: '2026-09-23T12:00:00.000Z' }] }))).toThrow('invalid_customer_quote_response');
  });

  it('mantém campanha e briefing legados opacos até a normalização de consumo, sem relaxar o snapshot de produtos', () => {
    const parsed = parseCustomerQuoteDetail(detail({ campaign: { source: 'desconhecido' }, briefing: { budgetRange: 'invalido' } }));

    expect(normalizeCampaignBrief(parsed?.campaign)).toBeUndefined();
    expect(normalizeQuoteBriefing(parsed?.briefing)).toBeUndefined();
    expect(parsed?.items[0]?.name).toBe('Garrafa térmica');
  });
});
