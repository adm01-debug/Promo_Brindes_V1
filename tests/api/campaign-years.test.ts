import { describe, expect, it } from 'vitest';
import { currentCampaignYear, normalizeCampaignYear, supportedCampaignYears } from '../../shared/campaignYears.js';

describe('anos editoriais da agenda', () => {
  const endOfYearInSaoPaulo = new Date('2026-12-31T23:30:00-03:00');

  it('usa o calendário de São Paulo mesmo quando UTC já virou o ano', () => {
    expect(currentCampaignYear(endOfYearInSaoPaulo)).toBe(2026);
    expect(supportedCampaignYears(endOfYearInSaoPaulo)).toEqual([2026, 2027]);
  });

  it('aceita somente o ano corrente e o próximo, normalizando os demais', () => {
    expect(normalizeCampaignYear('2027', endOfYearInSaoPaulo)).toBe(2027);
    expect(normalizeCampaignYear('2030', endOfYearInSaoPaulo)).toBe(2026);
    expect(normalizeCampaignYear('inválido', endOfYearInSaoPaulo)).toBe(2026);
  });
});
