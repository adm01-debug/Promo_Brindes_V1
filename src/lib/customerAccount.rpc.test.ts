import { afterEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./siteSupabase', () => ({ siteSupabase: { rpc } }));

import { ADJUSTMENT_PENDING_LIMIT_MESSAGE, claimMyQuoteRequests, fetchMyQuoteRequest, fetchMyQuoteRequests, requestMyQuoteAdjustment } from './customerAccount';

const quoteId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: quoteId, protocol: 'PB26000001-0', status: 'new', company: 'Marca Exemplo', actionName: null,
    createdAt: '2026-09-23T12:00:00.000Z', lastMovementAt: null, desiredDeadline: null,
    itemCount: 1, totalUnits: 100, productNames: ['Garrafa térmica'], productImages: [], ...overrides,
  };
}

function response(value: unknown) {
  return { abortSignal: vi.fn().mockResolvedValue(value) };
}

describe('RPCs da Área do Cliente', () => {
  afterEach(() => rpc.mockReset());

  it('aceita somente o contrato de leitura esperado para o histórico', async () => {
    rpc.mockReturnValue(response({ data: { items: [summary()], total: 1, limit: 20, offset: 0 }, error: null }));

    await expect(fetchMyQuoteRequests()).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: quoteId })] });
    expect(rpc).toHaveBeenCalledWith('get_my_quote_requests', expect.objectContaining({ p_limit: 20, p_offset: 0 }));
  });

  it('não mascara JSON malformado como um histórico vazio', async () => {
    rpc.mockReturnValue(response({ data: { items: [summary({ status: 'spam' })], total: 1, limit: 20, offset: 0 }, error: null }));

    await expect(fetchMyQuoteRequests()).rejects.toThrow('customer_area_unavailable');
  });

  it('rejeita detalhe e confirmação de ajuste com identificadores ou datas inválidas', async () => {
    rpc.mockReturnValueOnce(response({ data: { id: quoteId, protocol: 'PB26000001-0', status: 'new' }, error: null }))
      .mockReturnValueOnce(response({ data: { id: eventId, createdAt: 'ontem' }, error: null }));

    await expect(fetchMyQuoteRequest(quoteId)).rejects.toThrow('customer_area_unavailable');
    await expect(requestMyQuoteAdjustment(quoteId, 'Preciso rever a quantidade.', 'request-001')).rejects.toThrow('customer_area_unavailable');
  });

  it('traduz o limite de 3 ajustes pendentes em mensagem acionável', async () => {
    rpc.mockReturnValue(response({ data: null, error: { message: 'too_many_pending_adjustments' } }));

    await expect(requestMyQuoteAdjustment(quoteId, 'Preciso rever a quantidade.', 'request-001'))
      .rejects.toThrow(ADJUSTMENT_PENDING_LIMIT_MESSAGE);
  });

  it('mantém o erro original quando a recusa é outra', async () => {
    rpc.mockReturnValue(response({ data: null, error: { message: 'quote_not_found' } }));

    await expect(requestMyQuoteAdjustment(quoteId, 'Preciso rever a quantidade.', 'request-001')).rejects.toThrow('quote_not_found');
  });

  it('não transforma uma resposta de claim inesperada em sucesso', async () => {
    rpc.mockReturnValue(response({ data: { claimed: '1' }, error: null }));

    await expect(claimMyQuoteRequests()).rejects.toThrow('customer_area_unavailable');
  });
});
