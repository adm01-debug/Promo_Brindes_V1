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
      { key: 'scale', label: 'Escala: Até 50 pessoas' },
    ]);
  });

  it('traduz apenas sinais confiáveis para o contrato público', () => {
    const categories = [
      { id: 'tech', name: 'Tecnologia', parentId: null },
      { id: 'other', name: 'Casa', parentId: null },
    ];
    expect(resolveCampaignFilters({ moment: 'onboarding', scale: '201-500', mood: 'sustentavel', audience: 'clientes' }, categories)).toEqual({
      search: 'onboarding',
      profile: 'featured',
      materials: ['reciclado'],
      colors: [],
      maxMinQuantity: 500,
      categoryIds: [],
    });
    expect(resolveCampaignFilters({ mood: 'tech' }, categories).categoryIds).toEqual(['tech']);
    expect(resolveCampaignFilters({ mood: 'divertido' }, categories).colors).toEqual(['colorido']);
  });

  it('dá ao momento onboarding um termo de curadoria, já que não há sinal estrutural', () => {
    const categories: { id: string; name: string; parentId: null }[] = [];
    // Sem o termo, a porta editorial de onboarding abria o catálogo público
    // inteiro: profile, materials, colors e categoryIds saem todos vazios.
    const onboarding = resolveCampaignFilters({ moment: 'onboarding', audience: 'colaboradores' }, categories);
    expect(onboarding.search).toBe('onboarding');
    expect(onboarding.profile).toBeUndefined();
    expect(onboarding.materials).toEqual([]);
    expect(onboarding.colors).toEqual([]);
    expect(onboarding.categoryIds).toEqual([]);
    // O termo é do momento, não do público: trocar o público não o remove.
    expect(resolveCampaignFilters({ moment: 'onboarding' }, categories).search).toBe('onboarding');
    // E não contamina os outros momentos, que já têm sinal próprio.
    expect(resolveCampaignFilters({ moment: 'evento' }, categories).search).toBeUndefined();
    expect(resolveCampaignFilters({ moment: 'relacionamento' }, categories).search).toBeUndefined();
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
