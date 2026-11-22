import { describe, expect, it } from 'vitest';
import {
  isSiteOperatorError,
  parseSiteQuoteDetail,
  parseSiteQuoteListPage,
  parseSiteQuoteProposalPublication,
  parseSiteQuoteStatusChange,
  siteOperatorErrorMessage,
} from './commercialBackofficeContract';

const requestId = '11111111-1111-4111-8111-111111111111';

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    id: requestId,
    protocol: 'PB26123456-7',
    status: 'new',
    contactName: 'Ana Souza',
    company: 'Metalúrgica Alfa',
    email: 'ana@alfa.com.br',
    phone: '11999998888',
    city: 'São Paulo',
    desiredDeadline: '2026-12-01',
    createdAt: '2026-11-20T10:00:00.000Z',
    submittedAt: '2026-11-20T09:59:00.000Z',
    isClaimed: true,
    itemCount: 3,
    pendingAdjustments: 1,
    currentProposalVersion: null,
    ...overrides,
  };
}

function detailPayload(overrides: Record<string, unknown> = {}) {
  return {
    operator: 'Comercial PB',
    id: requestId,
    protocol: 'PB26123456-7',
    status: 'in_progress',
    allowedStatuses: ['quoted', 'closed', 'spam'],
    createdAt: '2026-11-20T10:00:00.000Z',
    submittedAt: '2026-11-20T09:59:00.000Z',
    contactName: 'Ana Souza',
    company: 'Metalúrgica Alfa',
    email: 'ana@alfa.com.br',
    phone: '11999998888',
    city: 'São Paulo',
    desiredDeadline: '2026-12-01',
    notes: 'Logo em uma cor',
    pageUrl: '/orcamento',
    isClaimed: true,
    campaign: null,
    briefing: null,
    items: [{
      key: `${requestId}::vermelho`, productId: requestId, slug: 'garrafa', name: 'Garrafa', sku: 'PB-100',
      imageUrl: null, quantity: 100, minQuantity: 50, variantId: null, colorName: 'Vermelho', colorHex: '#f00',
      decisionGroup: 'primary',
    }],
    events: [{
      id: 'ev-1', type: 'status_changed', status: 'in_progress', title: 'Curadoria em andamento',
      description: null, audience: 'internal', createdAt: '2026-11-20T11:00:00.000Z',
    }],
    proposals: [{
      id: 'prop-1', version: 2, title: 'Proposta PB26123456-7', validUntil: '2026-12-15',
      publishedAt: '2026-11-20T12:00:00.000Z', supersededAt: null, isCurrent: true,
    }],
    adjustments: [{
      id: 'adj-1', status: 'new', message: 'Trocar a cor', createdAt: '2026-11-20T13:00:00.000Z',
      updatedAt: '2026-11-20T13:00:00.000Z',
    }],
    audit: [{
      action: 'proposal_published', actorLabel: 'Comercial PB', detail: { version: 2 },
      createdAt: '2026-11-20T12:00:00.000Z',
    }],
    ...overrides,
  };
}

describe('contrato do back-office comercial', () => {
  it('lê a fila paginada com totais e itens', () => {
    const page = parseSiteQuoteListPage({
      operator: 'Comercial PB', total: 42, limit: 25, offset: 25, requests: [listItem()],
    });
    expect(page).toMatchObject({ operator: 'Comercial PB', total: 42, limit: 25, offset: 25 });
    expect(page.requests).toHaveLength(1);
    expect(page.requests).toMatchObject([{ protocol: 'PB26123456-7', status: 'new', itemCount: 3, pendingAdjustments: 1 }]);
  });

  it('trata payload que não é objeto como indisponibilidade, não como fila vazia', () => {
    expect(() => parseSiteQuoteListPage(null)).toThrow('commercial_backoffice_unavailable');
    expect(() => parseSiteQuoteListPage('erro')).toThrow('commercial_backoffice_unavailable');
  });

  it('rejeita item de fila que não é objeto', () => {
    expect(() => parseSiteQuoteListPage({ requests: ['quebrado'] })).toThrow('commercial_backoffice_invalid_item');
  });

  it('normaliza status desconhecido para new em vez de propagar string crua para a UI', () => {
    const page = parseSiteQuoteListPage({ requests: [listItem({ status: 'estado-inventado' })] });
    expect(page.requests).toMatchObject([{ status: 'new' }]);
  });

  it('lê o detalhe completo, incluindo audiência interna e auditoria', () => {
    const detail = parseSiteQuoteDetail(detailPayload());
    expect(detail).toMatchObject({ protocol: 'PB26123456-7', status: 'in_progress', isClaimed: true });
    expect(detail.allowedStatuses).toEqual(['quoted', 'closed', 'spam']);
    expect(detail.items).toMatchObject([{ colorName: 'Vermelho', quantity: 100 }]);
    expect(detail.events).toMatchObject([{ audience: 'internal' }]);
    expect(detail.proposals).toMatchObject([{ version: 2, isCurrent: true }]);
    expect(detail.adjustments).toMatchObject([{ message: 'Trocar a cor' }]);
    expect(detail.audit).toMatchObject([{ action: 'proposal_published', actorLabel: 'Comercial PB' }]);
  });

  it('filtra status inválido em allowedStatuses, preservando os válidos', () => {
    const detail = parseSiteQuoteDetail(detailPayload({ allowedStatuses: ['quoted', 'inexistente', 'closed'] }));
    expect(detail.allowedStatuses).toEqual(['quoted', 'closed']);
  });

  it('trata listas ausentes como vazias para não quebrar a renderização', () => {
    const detail = parseSiteQuoteDetail(detailPayload({ items: undefined, events: null, proposals: {}, audit: 'x' }));
    expect(detail.items).toEqual([]);
    expect(detail.events).toEqual([]);
    expect(detail.proposals).toEqual([]);
    expect(detail.audit).toEqual([]);
  });

  it('lê a publicação de proposta com a nova versão e o status quoted', () => {
    expect(parseSiteQuoteProposalPublication({ proposalId: 'prop-2', version: 3, status: 'quoted' }))
      .toEqual({ proposalId: 'prop-2', version: 3, status: 'quoted' });
  });

  it('lê a mudança de status com o estágio anterior', () => {
    expect(parseSiteQuoteStatusChange({ id: requestId, previousStatus: 'new', status: 'triaged' }))
      .toEqual({ id: requestId, previousStatus: 'new', status: 'triaged' });
  });

  it('reconhece o 42501 de operador não cadastrado', () => {
    expect(isSiteOperatorError({ code: '42501', message: 'not_a_site_operator' })).toBe(true);
    expect(isSiteOperatorError({ code: '42501', message: 'authentication_required' })).toBe(true);
    expect(isSiteOperatorError({ code: '42501', message: '' })).toBe(true);
    expect(isSiteOperatorError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isSiteOperatorError(null)).toBe(false);
  });

  it('traduz cada erro conhecido do banco para uma mensagem acionável', () => {
    expect(siteOperatorErrorMessage({ message: 'not_a_site_operator' })).toContain('não tem acesso');
    expect(siteOperatorErrorMessage({ message: 'authentication_required' })).toContain('Entre com uma conta');
    expect(siteOperatorErrorMessage({ message: 'invalid_status_transition: new -> closed' })).toContain('máquina de estados');
    expect(siteOperatorErrorMessage({ message: 'proposal_requires_in_progress: status atual new' })).toContain('curadoria');
    expect(siteOperatorErrorMessage({ message: 'quote_request_changed_concurrently' })).toContain('Recarregue');
    expect(siteOperatorErrorMessage({ message: 'algo novo' })).toBe('Não foi possível concluir a operação.');
  });
});