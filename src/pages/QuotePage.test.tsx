import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localDateInputValue } from '../lib/quoteCalendar';

const mocks = vi.hoisted(() => ({
  setCampaign: vi.fn(),
  setSelectionTitle: vi.fn(),
  user: null as { id: string } | null,
}));

vi.mock('../context/quoteCart', () => ({
  useQuoteCart: () => ({
    items: [{
      key: '11111111-1111-4111-8111-111111111111::sem-cor', productId: '11111111-1111-4111-8111-111111111111',
      slug: 'mochila', name: 'Mochila', sku: 'MO-42', imageUrl: '/images/product-placeholder.svg',
      minQuantity: 50, quantity: 100, productUnavailable: false, variantUnavailable: false,
    }],
    itemCount: 1,
    selectionTitle: 'Feira de outubro',
    campaign: { source: 'finder', moment: 'evento', audience: 'clientes', scale: '51-200', mood: 'util' } as const,
    setCampaign: mocks.setCampaign,
    setSelectionTitle: mocks.setSelectionTitle,
    totalUnits: 0,
    setDrawerOpen: vi.fn(),
    clear: vi.fn(),
  }),
}));
vi.mock('../context/customerAuth', () => ({ useCustomerAuth: () => ({ user: mocks.user }) }));
vi.mock('../components/Seo', () => ({ Seo: () => null }));
vi.mock('../components/ContextualFaq', () => ({ ContextualFaq: () => null }));
vi.mock('../components/BriefingAssetUploader', () => ({ BriefingAssetUploader: () => null }));
vi.mock('../lib/quoteRequest', () => ({ buildQuotePayload: vi.fn(), submitQuoteRequest: vi.fn(), sanitizeLeadPageUrl: vi.fn() }));
vi.mock('../lib/quoteSubmission', () => ({
  sameQuoteSelectionContext: vi.fn(() => true), sameQuoteSelection: vi.fn(() => true), remainingItemsAfterSubmission: vi.fn(),
}));
vi.mock('../lib/briefingAssets', () => ({ attachMyBriefingAssetsToQuote: vi.fn() }));
vi.mock('../lib/http', () => ({
  ClientRequestError: class extends Error {}, getOrCreateSubmissionAttempt: () => ({ submittedAt: new Date(0).toISOString(), id: 'a1b2c3' }), clearSubmissionAttempt: vi.fn(),
}));
vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));
vi.mock('../lib/quoteDraft', () => ({
  EMPTY_QUOTE_CONTACT: { name: '', company: '', email: '', phone: '', city: '', deadline: '', notes: '', privacyAccepted: false, whatsappCopyAccepted: false },
  QUOTE_DRAFT_RETENTION_LABEL: '24 horas nesta aba do navegador',
  loadQuoteDraft: () => ({ contact: { name: '', company: '', email: '', phone: '', city: '', deadline: '', notes: '', privacyAccepted: false, whatsappCopyAccepted: false }, briefing: { actionName: '', budgetRange: '', budgetScope: '', eventDate: '', deadlineFlexibility: '', responseChannel: '', brandAssetStatus: '' } }),
  saveQuoteDraft: vi.fn(), clearQuoteDraft: vi.fn(),
}));
vi.mock('../lib/quoteRepeat', () => ({ loadQuoteRepeat: () => undefined, clearQuoteRepeat: vi.fn() }));
vi.mock('../lib/personalDataReset', () => ({ clearPersonalQuoteStorage: vi.fn() }));
vi.mock('../lib/quoteConfirmation', () => ({
  confirmationDeliveryLabel: () => '', quoteConfirmationTitle: () => '',
}));
vi.mock('../lib/useInitialSuccessScroll', () => ({ useInitialSuccessScroll: vi.fn() }));
import QuotePage from './QuotePage';

const renderPage = () => render(<MemoryRouter initialEntries={['/orcamento']}><QuotePage /></MemoryRouter>);

describe('data mínima do briefing', () => {
  it('usa o calendário comercial brasileiro em vez de converter o instante para UTC', () => {
    expect(localDateInputValue(new Date('2026-09-09T02:45:00.000Z'))).toBe('2026-09-08');
    expect(localDateInputValue(new Date('2026-01-02T03:05:00.000Z'))).toBe('2026-01-02');
  });

  it('permanece no dia de São Paulo durante a virada UTC', () => {
    expect(localDateInputValue(new Date('2026-09-13T01:30:00.000Z'))).toBe('2026-09-12');
  });
});

describe('editor do contexto da campanha no orçamento (PF-41)', () => {
  beforeEach(() => mocks.setCampaign.mockReset());
  afterEach(() => { cleanup(); mocks.setCampaign.mockClear(); });

  it('deixa ajustar uma dimensão do contexto e salva no carrinho', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar contexto' }));
    fireEvent.change(screen.getByLabelText('Clima'), { target: { value: 'premium' } });
    expect(mocks.setCampaign).toHaveBeenCalledWith(expect.objectContaining({ mood: 'premium', moment: 'evento', source: 'finder' }));
  });

  it('permite remover o contexto recuperado do carrinho', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar contexto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover contexto' }));
    expect(mocks.setCampaign).toHaveBeenCalledWith(undefined);
  });
});
