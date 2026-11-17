import { describe, expect, it } from 'vitest';
import { EMPTY_QUOTE_BRIEFING, getQuoteBriefingValidationError, normalizeQuoteBriefing, quoteBriefingForm, quoteBriefingSummary } from './quoteBriefing';

describe('contexto opcional do briefing', () => {
  it('preserva apenas escolhas reconhecidas e texto limitado', () => {
    const result = normalizeQuoteBriefing({
      actionName: '  Kit de boas-vindas  ',
      budgetRange: '51-100',
      budgetScope: 'por-pessoa',
      eventDate: '2026-12-20',
      deadlineFlexibility: 'data-fixa',
      responseChannel: 'whatsapp',
      brandAssetStatus: 'logo-pronto',
      injected: '<script>',
    });
    expect(result).toEqual({
      actionName: 'Kit de boas-vindas',
      budgetRange: '51-100',
      budgetScope: 'por-pessoa',
      eventDate: '2026-12-20',
      deadlineFlexibility: 'data-fixa',
      responseChannel: 'whatsapp',
      brandAssetStatus: 'logo-pronto',
    });
  });

  it('descarta briefing vazio ou valores manipulados', () => {
    expect(normalizeQuoteBriefing({})).toBeUndefined();
    expect(normalizeQuoteBriefing({ budgetRange: 'valor-forjado' })).toBeUndefined();
    expect(quoteBriefingForm({ budgetRange: 'valor-forjado' })).toEqual(EMPTY_QUOTE_BRIEFING);
  });

  it('gera um resumo humano para e-mail e área do cliente', () => {
    expect(quoteBriefingSummary({ actionName: 'Evento anual', budgetRange: 'ate-25', budgetScope: 'total', eventDate: '2026-12-20', responseChannel: 'email' })).toEqual([
      'Ação: Evento anual',
      'Até R$ 25 no total da ação',
      'Evento em 20 de dezembro de 2026',
      'Contato por E-mail',
    ]);
  });

  it('exige contexto para a faixa e evita receber depois do evento', () => {
    // O campo importa tanto quanto a mensagem: QuotePage.tsx:242-245 usa `field`
    // para focar o input errado. Antes nenhum teste afirmava o campo, porque
    // todos passavam por um wrapper que descartava essa metade do retorno.
    expect(getQuoteBriefingValidationError({ ...EMPTY_QUOTE_BRIEFING, budgetRange: '51-100' })).toEqual({ field: 'budgetScope', message: expect.stringMatching(/por pessoa/i) });
    expect(getQuoteBriefingValidationError({ ...EMPTY_QUOTE_BRIEFING, budgetScope: 'total' })).toEqual({ field: 'budgetRange', message: expect.stringMatching(/faixa/i) });
    expect(getQuoteBriefingValidationError({ ...EMPTY_QUOTE_BRIEFING, eventDate: '2026-12-10' }, '2026-12-11')).toEqual({ field: 'eventDate', message: expect.stringMatching(/depois/i) });
    expect(getQuoteBriefingValidationError({ ...EMPTY_QUOTE_BRIEFING, budgetRange: '51-100', budgetScope: 'por-pessoa', eventDate: '2026-12-10' }, '2026-12-09')).toBeNull();
  });

  it('impede evento passado antes de transmitir dados ao servidor', () => {
    expect(getQuoteBriefingValidationError({ ...EMPTY_QUOTE_BRIEFING, eventDate: '2026-09-11' }, '', '2026-09-12')).toEqual({ field: 'eventDate', message: expect.stringMatching(/a partir de hoje/i) });
    expect(getQuoteBriefingValidationError({ ...EMPTY_QUOTE_BRIEFING, eventDate: '2026-09-12' }, '', '2026-09-12')).toBeNull();
  });
});
