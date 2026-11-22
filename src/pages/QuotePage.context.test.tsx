import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeCampaignBrief } from '../lib/campaignBrief';
import { localDateInputValue } from '../lib/quoteCalendar';

const mocks = vi.hoisted(() => {
  const items = [{
    key: '11111111-1111-4111-8111-111111111111::sem-cor', productId: '11111111-1111-4111-8111-111111111111',
    slug: 'mochila', name: 'Mochila', sku: 'MO-42', imageUrl: '/images/product-placeholder.svg',
    minQuantity: 50, quantity: 100, productUnavailable: false, variantUnavailable: false,
  }];
  let listeners: Array<() => void> = [];
  let campaign: ReturnType<typeof normalizeCampaignBrief> = { source: 'finder', moment: 'evento', audience: 'clientes', scale: '51-200', mood: 'util' };
  const emit = () => { for (const listener of [...listeners]) listener(); };
  return {
    items,
    subscribe: (listener: () => void) => { listeners.push(listener); return () => { listeners = listeners.filter((candidate: () => void) => candidate !== listener); }; },
    getCampaign: () => campaign,
    setCampaign: vi.fn((next: ReturnType<typeof normalizeCampaignBrief>) => { campaign = normalizeCampaignBrief(next); emit(); }),
    resetCampaign: () => { campaign = { source: 'finder', moment: 'evento', audience: 'clientes', scale: '51-200', mood: 'util' }; emit(); },
    clearSubmissionAttempt: vi.fn(),
    setSelectionTitle: vi.fn(),
    user: null as { id: string } | null,
    track: vi.fn(),
    submitQuoteRequest: vi.fn(),
  };
});

vi.mock('../context/quoteCart', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useQuoteCart: () => {
      const campaign = useSyncExternalStore(mocks.subscribe, mocks.getCampaign, mocks.getCampaign);
      return {
        items: mocks.items,
        itemCount: 1,
        selectionTitle: 'Feira de outubro',
        campaign,
        setCampaign: mocks.setCampaign,
        setSelectionTitle: mocks.setSelectionTitle,
        totalUnits: 0,
        setDrawerOpen: vi.fn(),
        clear: vi.fn(),
        reset: vi.fn(),
        replaceItems: vi.fn(),
      };
    },
  };
});
vi.mock('../context/customerAuth', () => ({ useCustomerAuth: () => ({ user: mocks.user }) }));
vi.mock('../components/Seo', () => ({ Seo: () => null }));
vi.mock('../components/ContextualFaq', () => ({ ContextualFaq: () => null }));
vi.mock('../components/BriefingAssetUploader', () => ({ BriefingAssetUploader: () => null }));
vi.mock('../lib/quoteRequest', () => ({ buildQuotePayload: vi.fn(() => ({})), submitQuoteRequest: mocks.submitQuoteRequest, sanitizeLeadPageUrl: vi.fn() }));
vi.mock('../lib/quoteSubmission', () => ({
  sameQuoteSelectionContext: vi.fn(() => true), sameQuoteSelection: vi.fn(() => true), remainingItemsAfterSubmission: vi.fn(),
}));
vi.mock('../lib/briefingAssets', () => ({ attachMyBriefingAssetsToQuote: vi.fn() }));
vi.mock('../lib/http', () => ({
  ClientRequestError: class extends Error {}, getOrCreateSubmissionAttempt: () => ({ submittedAt: new Date(0).toISOString(), id: 'a1b2c3' }), clearSubmissionAttempt: mocks.clearSubmissionAttempt,
}));
vi.mock('../lib/analytics', () => ({ trackFunnelEvent: mocks.track }));
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
  beforeEach(() => {
    mocks.resetCampaign();
    mocks.setCampaign.mockClear();
  });
  afterEach(() => {
    cleanup();
    mocks.setCampaign.mockClear();
    mocks.clearSubmissionAttempt.mockClear();
  });

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

  it('invalida a tentativa de envio ao editar o contexto (reenvio sem 409)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar contexto' }));
    fireEvent.change(screen.getByLabelText('Clima'), { target: { value: 'premium' } });
    expect(mocks.clearSubmissionAttempt).toHaveBeenCalledWith('promo-brindes:quote-attempt');
  });

  it('invalida a tentativa de envio ao remover o contexto', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar contexto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover contexto' }));
    expect(mocks.clearSubmissionAttempt).toHaveBeenCalledWith('promo-brindes:quote-attempt');
  });

  it('mantém o editor visível ao limpar o último campo do contexto', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar contexto' }));
    fireEvent.change(screen.getByLabelText('Momento'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Público'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Escala'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Clima'), { target: { value: '' } });
    expect(screen.getByLabelText('Clima')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument();
  });
});

describe('feedback de clareza do envio (PF-54)', () => {
  const fillContact = () => {
    fireEvent.change(screen.getByLabelText('Seu nome *'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('Empresa *'), { target: { value: 'Empresa Teste' } });
    fireEvent.change(screen.getByLabelText('Seu e-mail *'), { target: { value: 'ana@empresa.test' } });
    fireEvent.change(screen.getByLabelText('Telefone / WhatsApp *'), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByLabelText(/Li o aviso de privacidade/));
  };

  beforeEach(() => {
    mocks.resetCampaign();
    mocks.track.mockClear();
    mocks.submitQuoteRequest.mockReset();
    mocks.submitQuoteRequest.mockResolvedValue({
      mode: 'endpoint',
      requestId: 'e2e-1',
      confirmations: { email: 'sent', whatsapp: 'unavailable' },
    });
  });
  afterEach(() => {
    cleanup();
    mocks.track.mockClear();
  });

  it('oferece uma resposta opcional e envia so a escolha, nunca texto livre', async () => {
    renderPage();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /Enviar briefing/ }));

    const choice = await screen.findByRole('button', { name: 'Ficou claro' });
    mocks.track.mockClear();
    fireEvent.click(choice);

    expect(mocks.track).toHaveBeenCalledWith('feedback_answered', {
      scope: 'envio',
      answer: 'sim',
      has_campaign: true,
    });
    const thanks = await screen.findByText(/Obrigado/);
    expect(thanks.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Ficou claro' })).not.toBeInTheDocument();
  });

  it('permite recusar sem alterar o atendimento ja confirmado', async () => {
    renderPage();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /Enviar briefing/ }));

    const decline = await screen.findByRole('button', { name: /Prefiro n.o responder/ });
    mocks.track.mockClear();
    fireEvent.click(decline);

    expect(mocks.track).toHaveBeenCalledWith('feedback_declined', { scope: 'envio', has_campaign: true });
    const thanks = await screen.findByText(/nada muda no seu atendimento/);
    expect(thanks.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Acompanhar meus or/ })).toBeInTheDocument();
  });

  it('registra qual dimensao do resumo foi editada e se ficou preenchida', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Como voc\u00ea chama esta a\u00e7\u00e3o/), { target: { value: 'Kit 2027' } });
    expect(mocks.track).toHaveBeenCalledWith('summary_edited', { field: 'actionName', filled: true });
  });

  it('mede o conflito ao ajustar e ao remover o contexto recuperado', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar contexto' }));
    fireEvent.change(screen.getByLabelText('Clima'), { target: { value: 'premium' } });
    expect(mocks.track).toHaveBeenCalledWith('campaign_conflict', { resolution: 'editada', fields: 4 });
    mocks.track.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Remover contexto' }));
    expect(mocks.track).toHaveBeenCalledWith('campaign_conflict', { resolution: 'removida', fields: 4 });
  });
});
