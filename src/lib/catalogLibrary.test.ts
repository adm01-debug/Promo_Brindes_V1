import { describe, expect, it } from 'vitest';
import { catalogCollections, catalogFormatLabel, filterCatalogCollections } from './catalogLibrary';

describe('biblioteca de catálogos', () => {
  it('combina tema e busca sem depender de acentos', () => {
    expect(filterCatalogCollections(catalogCollections, 'tecnologia mobilidade', 'products').map(({ id }) => id))
      .toEqual(['tech-que-resolve']);
    expect(filterCatalogCollections(catalogCollections, 'ecologicos', 'impact').map(({ id }) => id))
      .toEqual(['escolhas-de-menor-impacto']);
  });

  it('não inventa resultados quando os termos não aparecem juntos', () => {
    expect(filterCatalogCollections(catalogCollections, 'onboarding tecnologia', 'all')).toEqual([]);
  });

  it('explica o formato antes de a pessoa abrir o material', () => {
    expect(catalogFormatLabel('online')).toBe('Coleção online');
    expect(catalogFormatLabel('pdf')).toBe('Catálogo em PDF');
    expect(catalogFormatLabel('digital')).toBe('Revista digital');
  });
});
