import { describe, expect, it } from 'vitest';
import { EMPTY_QUOTE_BRIEFING, normalizeQuoteBriefing, quoteBriefingForm, quoteBriefingSummary, validateQuoteBriefing } from './quoteBriefing';

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
    expect(validateQuoteBriefing({ ...EMPTY_QUOTE_BRIEFING, budgetRange: '51-100' })).toMatch(/por pessoa/i);
    expect(validateQuoteBriefing({ ...EMPTY_QUOTE_BRIEFING, budgetScope: 'total' })).toMatch(/faixa/i);
    expect(validateQuoteBriefing({ ...EMPTY_QUOTE_BRIEFING, eventDate: '2026-12-10' }, '2026-12-11')).toMatch(/depois/i);
    expect(validateQuoteBriefing({ ...EMPTY_QUOTE_BRIEFING, budgetRange: '51-100', budgetScope: 'por-pessoa', eventDate: '2026-12-10' }, '2026-12-09')).toBeNull();
  });
});
