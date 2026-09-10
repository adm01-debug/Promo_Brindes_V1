import { afterEach, describe, expect, it } from 'vitest';
import { clearQuoteDraft, EMPTY_QUOTE_CONTACT, loadQuoteDraft, saveQuoteDraft } from './quoteDraft';
import { EMPTY_QUOTE_BRIEFING } from './quoteBriefing';

const contact = {
  name: 'Ana', company: 'Marca', email: 'ana@marca.test', phone: '(11) 99999-9999', city: 'São Paulo / SP', deadline: '2026-10-10', notes: 'Onboarding para 150 pessoas.', privacyAccepted: true,
};

describe('rascunho do briefing', () => {
  afterEach(() => clearQuoteDraft());

  it('mantém o briefing na sessão para a pessoa voltar ao catálogo', () => {
    const briefing = { actionName: 'Boas-vindas 2026', budgetRange: '51-100' as const, responseChannel: 'whatsapp' as const, brandAssetStatus: 'logo-pronto' as const };
    saveQuoteDraft({ contact, briefing }, new Date('2026-09-10T12:00:00.000Z'));
    expect(loadQuoteDraft(Date.parse('2026-09-10T12:30:00.000Z'))).toEqual({ contact, briefing });
  });

  it('remove o rascunho vencido em vez de reapresentar dados pessoais antigos', () => {
    saveQuoteDraft({ contact, briefing: EMPTY_QUOTE_BRIEFING }, new Date('2026-09-08T11:00:00.000Z'));
    expect(loadQuoteDraft(Date.parse('2026-09-10T12:00:00.000Z'))).toEqual({ contact: EMPTY_QUOTE_CONTACT, briefing: EMPTY_QUOTE_BRIEFING });
  });
});
