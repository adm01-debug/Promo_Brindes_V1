import { describe, expect, it } from 'vitest';
import {
  describeSiteNotificationSkipReasons,
  isSiteOperatorError,
  isSiteProposalRejected,
  isSiteQuoteConflict,
  parseSiteNotificationDeliveryReport,
  parseSiteNotificationReprocessingResult,
  parseSiteQuoteDetail,
  parseSiteQuoteListPage,
  parseSiteNotificationBacklogCut,
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

  it('lê o resultado do corte de backlog com motivo e totais', () => {
    expect(parseSiteNotificationBacklogCut({
      cancelled: 7, scanned: 9, cancelledIds: ['a', 'b'], reason: 'limpeza de backlog',
    })).toEqual({ cancelled: 7, scanned: 9, reason: 'limpeza de backlog' });
  });

  it('zera o corte de backlog quando o banco devolve contagem inválida', () => {
    expect(parseSiteNotificationBacklogCut({ cancelled: -1, scanned: 'muitas' }))
      .toEqual({ cancelled: 0, scanned: 0, reason: '' });
  });

  it('trata payload de corte que não é objeto como erro de contrato', () => {
    expect(() => parseSiteNotificationBacklogCut(null)).toThrow('commercial_backoffice_invalid_backlog_cut');
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
    expect(siteOperatorErrorMessage({ message: 'quoted_requires_proposal_publication' })).toContain('publique a proposta');
    expect(siteOperatorErrorMessage({ message: 'invalid_storage_path' })).toContain('arquivo.pdf');
    expect(siteOperatorErrorMessage({ message: 'algo novo' })).toBe('Não foi possível concluir a operação.');
  });

  it('separa recusa de formulario de falha de carregamento', () => {
    expect(isSiteProposalRejected({ message: 'invalid_storage_path' })).toBe(true);
    expect(isSiteProposalRejected({ message: 'storage_path_required' })).toBe(true);
    expect(isSiteProposalRejected({ message: 'title_required' })).toBe(true);
    expect(isSiteProposalRejected({ message: 'proposal_requires_in_progress' })).toBe(false);
    expect(isSiteProposalRejected({ message: 'quote_request_not_found' })).toBe(false);
    expect(isSiteProposalRejected(null)).toBe(false);
  });

  it('separa o conflito de concorrência para a tela recarregar o pedido', () => {
    expect(isSiteQuoteConflict({ message: 'quote_request_changed_concurrently' })).toBe(true);
    expect(isSiteQuoteConflict({ message: 'quote_request_not_found' })).toBe(false);
    expect(isSiteQuoteConflict(null)).toBe(false);
  });

  it('lê o relatório da fila e descarta linha sem deliveryId', () => {
    expect(parseSiteNotificationDeliveryReport({
      exhausted: [
        {
          deliveryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          requestKind: 'quote',
          requestId,
          protocol: 'PB26123456-7',
          channel: 'email',
          attempts: 5,
          lastErrorCode: 'resend_500',
          lastErrorAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
          emailHashPrefix: '0123456789ab',
          suppressed: true,
        },
        { requestKind: 'quote', protocol: 'PB26000000-0' },
      ],
      orphanEventCount: 7,
      reconcilableOrphanCount: 3,
      orphanEventOldestAt: '2026-01-02T00:00:00.000Z',
    })).toEqual({
      exhausted: [{
        deliveryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requestKind: 'quote',
        requestId,
        protocol: 'PB26123456-7',
        channel: 'email',
        attempts: 5,
        lastErrorCode: 'resend_500',
        lastErrorAt: '2026-11-20T10:00:00.000Z',
        updatedAt: '2026-11-20T10:00:00.000Z',
        emailHashPrefix: '0123456789ab',
        suppressed: true,
        erased: false,
      }],
      orphanEventCount: 7,
      reconcilableOrphanCount: 3,
      orphanEventOldestAt: '2026-01-02T00:00:00.000Z',
    });
    expect(parseSiteNotificationDeliveryReport({}).exhausted).toEqual([]);
    expect(() => parseSiteNotificationDeliveryReport(null)).toThrow('commercial_backoffice_invalid_delivery_report');
  });

  it('lê o resultado do reprocessamento normalizando o motivo de skip', () => {
    expect(parseSiteNotificationReprocessingResult({
      reopened: 2,
      skipped: [
        { deliveryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'exhausted', reason: 'locked' },
        { deliveryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', status: 'sent', reason: 'not_exhausted' },
        { deliveryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', status: 'pending', reason: 'desconhecido' },
      ],
    })).toEqual({
      reopened: 2,
      skipped: [
        { deliveryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'exhausted', reason: 'locked' },
        { deliveryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', status: 'sent', reason: 'not_exhausted' },
        { deliveryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', status: 'pending', reason: 'not_exhausted' },
      ],
    });
    expect(() => parseSiteNotificationReprocessingResult([])).toThrow('commercial_backoffice_invalid_reprocessing_result');
  });

  it('preserva os motivos específicos de recusa do banco', () => {
    // O banco passou a dizer por que recusou (spam, anonimização, bounce, janela):
    // achatar tudo em "not_exhausted" esconderia do operador que a entrega nunca
    // mais pode sair.
    const parsed = parseSiteNotificationReprocessingResult({
      reopened: 0,
      skipped: ['erased', 'out_of_window', 'ineligible'].map((reason, index) => ({
        deliveryId: `${index}${index}${index}${index}${index}${index}${index}${index}-1111-4111-8111-111111111111`,
        status: 'exhausted',
        reason,
      })),
    });
    expect(parsed.skipped.map((item) => item.reason)).toEqual(['erased', 'out_of_window', 'ineligible']);
    expect(describeSiteNotificationSkipReasons(parsed.skipped)).toBe(
      'são de pedidos apagados pelo titular; passaram da janela de 30 dias; são de pedidos marcados como spam',
    );
  });

  it('traduz a recusa por lote ou motivo inválido no reprocessamento', () => {
    expect(siteOperatorErrorMessage({ message: 'invalid_notification_reprocessing_input' })).toContain('motivo de 3 a 200 caracteres');
  });
});