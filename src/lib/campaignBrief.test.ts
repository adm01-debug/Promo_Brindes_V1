import { describe, expect, it } from 'vitest';
import { campaignBriefLabels, normalizeCampaignBrief, occasionCatalogUrl } from './campaignBrief';

describe('contexto de campanha', () => {
  it('transforma uma data comemorativa em URL de catálogo sem perder o contexto', () => {
    const href = occasionCatalogUrl({ id: 'dia-do-cliente', name: 'Dia do Cliente', date: '2026-09-15' }, 'ecobag');
    expect(href).toBe('/catalogo?ocasiao=dia-do-cliente&ocasiao_nome=Dia+do+Cliente&ocasiao_data=2026-09-15&q=ecobag');
  });

  it('recusa dados de ocasião manipulados antes de gravá-los na seleção', () => {
    expect(normalizeCampaignBrief({ source: 'commemorative_date', occasion: { id: '../segredo', name: 'Forjado', date: '2026-09-15' } })).toBeUndefined();
    const brief = normalizeCampaignBrief({ source: 'finder', moment: 'evento', audience: 'publico-evento' });
    expect(campaignBriefLabels(brief)).toEqual(['Evento', 'Público de evento']);
  });
});
