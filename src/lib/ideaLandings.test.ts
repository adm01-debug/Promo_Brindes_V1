import { describe, expect, it } from 'vitest';
import { ideaLandings } from './ideaLandings';
import { buildCatalogSearchGroups } from './search';
import { resolveCampaignFilters } from './campaignPresets';

describe('curadoria das landings de ideias', () => {
  it('dá a cada tema uma consulta própria, senão a landing vira o catálogo inteiro', () => {
    // Sem termo de busca o fetchCatalog não recebe nenhum grupo de filtro e
    // devolve a primeira página do catálogo público ordenado — a página promete
    // curadoria e entrega lista genérica. Era o estado do tema onboarding.
    const semBusca = ideaLandings.filter((landing) => !landing.catalogQuery.search?.trim());
    expect(semBusca.map((landing) => landing.id)).toEqual([]);
  });

  it('resolve o termo de onboarding pelo grupo de sinônimos da intenção, sem exigir kit', () => {
    const onboarding = ideaLandings.find((landing) => landing.id === 'onboarding');
    expect(onboarding).toBeDefined();
    const grupos = buildCatalogSearchGroups(onboarding?.catalogQuery.search ?? '');
    // Um único grupo: o termo não pode arrastar o grupo de `kit`, que
    // transformaria a ocasião em exigência de conjunto montado.
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toEqual(expect.arrayContaining(['onboarding', 'boas vindas', 'boas-vindas']));
    expect(onboarding?.catalogQuery.profile).toBeUndefined();
  });

  it('leva o CTA ao catálogo com a mesma curadoria, não ao catálogo cru', () => {
    const onboarding = ideaLandings.find((landing) => landing.id === 'onboarding');
    const url = new URL(onboarding?.catalogUrl ?? '', 'https://site.test');
    // Os sinais editoriais de onboarding não aplicam filtro nenhum no catálogo,
    // por decisão documentada em campaignPresets.ts:117-128. Então o termo tem
    // de viajar na URL, senão "Ver curadoria completa" abre o catálogo inteiro.
    const filtros = resolveCampaignFilters({ moment: 'onboarding', audience: 'colaboradores' }, []);
    expect(filtros.profile).toBeUndefined();
    expect(filtros.materials).toEqual([]);
    expect(filtros.colors).toEqual([]);
    expect(filtros.categoryIds).toEqual([]);
    expect(url.searchParams.get('q')).toBe(onboarding?.catalogQuery.search);
  });
});
