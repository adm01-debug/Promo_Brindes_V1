import { describe, expect, it } from 'vitest';
import {
  buildCampaignCatalogUrl,
  campaignLabels,
  campaignSelectionCount,
  campaignSignalExplanations,
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

  it('liga cada resposta do briefing ao filtro efetivo que ela gerou', () => {
    const categories = [{ id: 'tech', name: 'Tecnologia', parentId: null }];
    expect(campaignSignalExplanations({ mood: 'sustentavel' }, categories)).toEqual([
      { source: 'Clima: Sustentável', target: 'Material reciclado' },
    ]);
    expect(campaignSignalExplanations({ mood: 'tech' }, categories)).toEqual([
      { source: 'Clima: Tech', target: 'Categoria Tecnologia' },
    ]);
    expect(campaignSignalExplanations({ mood: 'divertido' }, categories)).toEqual([
      { source: 'Clima: Divertido', target: 'Cor colorido' },
    ]);
    expect(campaignSignalExplanations({ audience: 'publico-evento' }, categories)).toEqual([
      { source: 'Público: Público de evento', target: 'Personalizável' },
    ]);
  });

  it('não inventa sinais para uma escolha sem filtro estrutural', () => {
    const categories: { id: string; name: string; parentId: null }[] = [];
    expect(campaignSignalExplanations({ moment: 'onboarding', audience: 'colaboradores' }, categories)).toEqual([
      { source: 'Momento: Onboarding', target: 'Curadoria de boas-vindas' },
    ]);
    expect(campaignSignalExplanations({ moment: 'evento' }, categories)).toEqual([
      { source: 'Momento: Evento', target: 'Coleção Em alta' },
    ]);
  });

  it('atribui a coleção Em alta à resposta do briefing que a ativou (PF-40)', () => {
    const categories: { id: string; name: string; parentId: null }[] = [];
    // Público isolado ativa Em alta -> origem Público, nunca "Clima/Momento: undefined".
    expect(campaignSignalExplanations({ audience: 'clientes' }, categories)).toEqual([
      { source: 'Público: Clientes', target: 'Coleção Em alta' },
    ]);
    // Clima premium ativa Em alta -> origem Clima.
    expect(campaignSignalExplanations({ mood: 'premium' }, categories)).toEqual([
      { source: 'Clima: Premium', target: 'Coleção Em alta' },
    ]);
  });

  it('suprime sinais do briefing substituídos por uma escolha explícita no catálogo (PF-40)', () => {
    const categories = [{ id: 'tech', name: 'Tecnologia', parentId: null }];
    // Coleção escolhida explicitamente (novos) substitui o perfil derivado do briefing.
    expect(campaignSignalExplanations({ moment: 'evento' }, categories, { effectiveProfile: 'new' })).toEqual([]);
    // Busca digitada substitui o termo editorial do briefing.
    expect(campaignSignalExplanations({ moment: 'onboarding' }, categories, { query: 'camiseta' })).toEqual([]);
    // Categoria escolhida explicitamente substitui a categoria derivada do briefing.
    expect(campaignSignalExplanations({ mood: 'tech' }, categories, { selectedCategoryIds: ['presentes'] })).toEqual([]);
    // SKU exato substitui categoria, cor, material e a busca editorial do
    // briefing: a consulta só emite `sku.eq.<codigo>` nesse modo.
    expect(campaignSignalExplanations({ mood: 'sustentavel', moment: 'onboarding' }, categories, { exactSku: 'BR-001' })).toEqual([]);
  });

  it('mantem os sinais de cor e material do briefing porque a consulta soma as escolhas (PF-40)', () => {
    const categories = [{ id: 'tech', name: 'Tecnologia', parentId: null }];
    const signals = campaignSignalExplanations({ mood: 'divertido' }, categories);
    // buildCatalogParams aceita qualquer valor do grupo (OR), então escolher
    // uma cor ou material no painel não desativa os derivados do briefing.
    expect(signals).toContainEqual({ source: 'Clima: Divertido', target: 'Cor colorido' });
    expect(campaignSignalExplanations({ mood: 'divertido' }, categories, {})).toEqual(signals);
  });

  it('suprime a curadoria de boas-vindas quando a busca por SKU exato assume (PF-40)', () => {
    const categories = [{ id: 'tech', name: 'Tecnologia', parentId: null }];
    const withoutSku = campaignSignalExplanations({ moment: 'onboarding' }, categories);
    expect(withoutSku).toContainEqual({ source: 'Momento: Onboarding', target: 'Curadoria de boas-vindas' });
    expect(campaignSignalExplanations({ moment: 'onboarding' }, categories, { exactSku: 'PB-100' })).toEqual([]);
  });
});
