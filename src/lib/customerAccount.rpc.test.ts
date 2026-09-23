import { afterEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./siteSupabase', () => ({ siteSupabase: { rpc } }));

import { claimMyQuoteRequests, fetchMyQuoteRequest, fetchMyQuoteRequests, requestMyQuoteAdjustment } from './customerAccount';

const quoteId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: quoteId, protocol: 'PB26000001-0', status: 'new', company: 'Marca Exemplo', actionName: null,
    createdAt: '2026-09-23T12:00:00.000Z', lastMovementAt: null, desiredDeadline: null,
    itemCount: 1, totalUnits: 100, productNames: ['Garrafa térmica'], productImages: [], ...overrides,
  };
}

describe('RPCs da Área do Cliente', () => {
  afterEach(() => rpc.mockReset());

  it('aceita somente o contrato de leitura esperado para o histórico', async () => {
    rpc.mockResolvedValue({ data: { items: [summary()], total: 1, limit: 20, offset: 0 }, error: null });

    await expect(fetchMyQuoteRequests()).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: quoteId })] });
    expect(rpc).toHaveBeenCalledWith('get_my_quote_requests', expect.objectContaining({ p_limit: 20, p_offset: 0 }));
  });

  it('não mascara JSON malformado como um histórico vazio', async () => {
    rpc.mockResolvedValue({ data: { items: [summary({ status: 'spam' })], total: 1, limit: 20, offset: 0 }, error: null });

    await expect(fetchMyQuoteRequests()).rejects.toThrow('customer_area_unavailable');
  });

  it('rejeita detalhe e confirmação de ajuste com identificadores ou datas inválidas', async () => {
    rpc.mockResolvedValueOnce({ data: { id: quoteId, protocol: 'PB26000001-0', status: 'new' }, error: null })
      .mockResolvedValueOnce({ data: { id: eventId, createdAt: 'ontem' }, error: null });

    await expect(fetchMyQuoteRequest(quoteId)).rejects.toThrow('customer_area_unavailable');
    await expect(requestMyQuoteAdjustment(quoteId, 'Preciso rever a quantidade.', 'request-001')).rejects.toThrow('customer_area_unavailable');
  });

  it('não transforma uma resposta de claim inesperada em sucesso', async () => {
    rpc.mockResolvedValue({ data: { claimed: '1' }, error: null });

    await expect(claimMyQuoteRequests()).rejects.toThrow('customer_area_unavailable');
  });
});
