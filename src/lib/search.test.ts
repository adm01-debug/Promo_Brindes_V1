import { describe, expect, it } from 'vitest';
import { buildCatalogSearchGroups, buildSearchSuggestions, normalizeSearchText } from './search';

describe('busca assistida', () => {
  it('normaliza acentos, caixa e espaços sem transportar operadores', () => {
    expect(normalizeSearchText('  NÉCESSAIRE, Tech!  ')).toBe('necessaire tech');
  });

  it('expande sinônimos como alternativas da mesma dimensão', () => {
    expect(buildCatalogSearchGroups('power bank')).toEqual([expect.arrayContaining(['powerbank', 'power bank', 'carregador portatil'])]);
    expect(buildCatalogSearchGroups('sacochila')).toEqual([expect.arrayContaining(['sacochila', 'mochila saco'])]);
  });

  it('descarta linguagem de preço e contexto quando há um objeto pesquisável', () => {
    expect(buildCatalogSearchGroups('copo barato para evento')).toEqual([['copo']]);
  });

  it('ainda encontra uma intenção quando ela é o único termo informado', () => {
    expect(buildCatalogSearchGroups('onboarding')[0]).toEqual(expect.arrayContaining(['onboarding', 'boas vindas', 'kit']));
  });

  it('combina ideias editoriais e categorias reais sem sugerir com uma letra', () => {
    const categories = [{ id: 'cat-1', name: 'Tecnologia | Áudio', parentId: null }];
    expect(buildSearchSuggestions('t', categories)).toEqual([]);
    const suggestions = buildSearchSuggestions('tec', categories);
    expect(suggestions.some((item) => item.kind === 'idea' && item.label === 'Tech útil')).toBe(true);
    expect(suggestions.some((item) => item.kind === 'category' && item.label === 'Tecnologia & Áudio')).toBe(true);
  });
});
