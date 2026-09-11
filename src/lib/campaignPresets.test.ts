import { describe, expect, it } from 'vitest';
import {
  buildCampaignCatalogUrl,
  campaignLabels,
  campaignSelectionCount,
  parseCampaignSelection,
  resolveCampaignFilters,
} from './campaignPresets';

describe('ache pelo briefing', () => {
  it('gera URL compartilhável somente com escolhas válidas', () => {
    const url = buildCampaignCatalogUrl({ moment: 'onboarding', audience: 'colaboradores', scale: '51-200', mood: 'sustentavel' });
    expect(url).toBe('/catalogo?momento=onboarding&publico=colaboradores&escala=51-200&clima=sustentavel');
    const manipulated = new URLSearchParams(url.split('?')[1]);
    manipulated.set('momento', 'forjado');
    expect(parseCampaignSelection(manipulated)).toEqual({
      moment: undefined,
      audience: 'colaboradores',
      scale: '51-200',
      mood: 'sustentavel',
    });
  });

  it('expõe escolhas como contexto removível sem duplicar critérios ocultos', () => {
    const selection = { moment: 'evento' as const, scale: 'ate-50' as const };
    expect(campaignSelectionCount(selection)).toBe(2);
    expect(campaignLabels(selection)).toEqual([
      { key: 'moment', label: 'Momento: Evento' },
      { key: 'scale', label: 'Escala: Até 50 un.' },
    ]);
  });

  it('traduz apenas sinais confiáveis para o contrato público', () => {
    const categories = [
      { id: 'tech', name: 'Tecnologia', parentId: null },
      { id: 'other', name: 'Casa', parentId: null },
    ];
    expect(resolveCampaignFilters({ moment: 'onboarding', scale: '201-500', mood: 'sustentavel', audience: 'clientes' }, categories)).toEqual({
      profile: 'featured',
      materials: ['reciclado'],
      colors: [],
      maxMinQuantity: 500,
      categoryIds: [],
    });
    expect(resolveCampaignFilters({ mood: 'tech' }, categories).categoryIds).toEqual(['tech']);
    expect(resolveCampaignFilters({ mood: 'divertido' }, categories).colors).toEqual(['colorido']);
  });

  it('não converte onboarding ou colaboradores em kit sem uma escolha explícita de clima', () => {
    const categories = [{ id: 'tech', name: 'Tecnologia', parentId: null }];
    expect(resolveCampaignFilters({ moment: 'onboarding', audience: 'colaboradores' }, categories).profile).toBeUndefined();
    expect(resolveCampaignFilters({ moment: 'onboarding', mood: 'afetivo' }, categories).profile).toBe('kits');
  });

  it('não chama catálogo completo de curadoria quando momento ou público foram escolhidos', () => {
    const categories = [{ id: 'tech', name: 'Tecnologia', parentId: null }];
    expect(resolveCampaignFilters({ moment: 'evento', audience: 'publico-evento' }, categories)).toMatchObject({
      profile: 'featured',
      personalizable: true,
    });
    expect(resolveCampaignFilters({ moment: 'relacionamento', audience: 'clientes' }, categories)).toMatchObject({
      profile: 'featured',
    });
  });
});
