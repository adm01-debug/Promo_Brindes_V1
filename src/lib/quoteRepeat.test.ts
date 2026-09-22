import { describe, expect, it, vi } from 'vitest';
import { clearQuoteRepeat, loadQuoteRepeat, saveQuoteRepeat } from './quoteRepeat';
import { clearPersonalQuoteStorage } from './personalDataReset';

describe('repetição de orçamento', () => {
  it('preserva apenas contexto de campanha e briefing por uma janela curta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
    saveQuoteRepeat({ quoteId: 'quote-1', campaign: { source: 'finder', moment: 'onboarding' }, briefing: { actionName: 'Boas-vindas' } });
    expect(loadQuoteRepeat('quote-1')).toEqual({ quoteId: 'quote-1', campaign: { source: 'finder', moment: 'onboarding' }, briefing: { actionName: 'Boas-vindas' } });
    vi.advanceTimersByTime(30 * 60 * 1_000 + 1);
    expect(loadQuoteRepeat('quote-1')).toBeNull();
    clearQuoteRepeat();
    vi.useRealTimers();
  });

  it('não restaura briefing do titular anterior após a limpeza de sessão', () => {
    saveQuoteRepeat({ quoteId: 'quote-previous-account', briefing: { actionName: 'Campanha confidencial' } });
    expect(loadQuoteRepeat('quote-previous-account')?.briefing?.actionName).toBe('Campanha confidencial');

    clearPersonalQuoteStorage();

    expect(loadQuoteRepeat('quote-previous-account')).toBeNull();
  });
});
