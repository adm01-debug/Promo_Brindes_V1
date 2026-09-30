import { describe, expect, it } from 'vitest';
import { catalogCollections, catalogFormatLabel, filterCatalogCollections, publicCatalogCollections } from './catalogLibrary';
import { catalogEditorialEntries, catalogEditorialIssues, isCatalogEditorialEntryPublic, resolveCatalogEditorialId } from '../../shared/catalogEditorial';

describe('biblioteca de catálogos', () => {
  it('combina tema e busca sem depender de acentos', () => {
    expect(filterCatalogCollections(catalogCollections, 'tecnologia mobilidade', 'products').map(({ id }) => id))
      .toEqual(['tech-que-resolve']);
    expect(filterCatalogCollections(catalogCollections, 'ecologicos', 'impact').map(({ id }) => id))
      .toEqual(['escolhas-de-menor-impacto']);
    expect(filterCatalogCollections(catalogCollections, 'sustentavel', 'all').map(({ id }) => id))
      .toEqual(['escolhas-de-menor-impacto']);
  });

  it('não inventa resultados quando os termos não aparecem juntos', () => {
    expect(filterCatalogCollections(catalogCollections, 'onboarding tecnologia', 'all')).toEqual([]);
  });

  it('usa o nome atual em links novos e mantém links antigos da coleção', () => {
    expect(catalogCollections.find(({ id }) => id === 'novas-tendencias')?.title).toBe('Tendências');
    expect(resolveCatalogEditorialId('novas-tendencias')).toBe('novas-tendencias');
    expect(resolveCatalogEditorialId('novos-drops')).toBe('novas-tendencias');
    expect(resolveCatalogEditorialId('colecao-inexistente')).toBeNull();
  });

  it('mantém os nomes anteriores somente como aliases internos de busca', () => {
    for (const query of ['novas tendências', 'novos drops']) {
      expect(filterCatalogCollections(catalogCollections, query, 'all').map(({ id }) => id))
        .toEqual(['novas-tendencias']);
    }
  });

  it('explica o formato antes de a pessoa abrir o material', () => {
    expect(catalogFormatLabel('online')).toBe('Coleção online');
    expect(catalogFormatLabel('pdf')).toBe('Catálogo em PDF');
    expect(catalogFormatLabel('digital')).toBe('Revista digital');
  });

  it('exige responsável, revisão vigente e janela de publicação para cada coleção', () => {
    expect(catalogEditorialIssues()).toEqual([]);
    expect(publicCatalogCollections()).toHaveLength(catalogCollections.length);
    expect(isCatalogEditorialEntryPublic({
      ...catalogEditorialEntries['novas-tendencias'],
      status: 'draft',
    }, new Date('2026-09-22T12:00:00.000Z'))).toBe(false);
    expect(isCatalogEditorialEntryPublic({
      ...catalogEditorialEntries['novas-tendencias'],
      expiresAt: '2026-09-01',
    }, new Date('2026-09-22T12:00:00.000Z'))).toBe(false);
  });

  it('publica e expira na data civil de São Paulo, sem antecipar a virada por UTC', () => {
    const future = { ...catalogEditorialEntries['novas-tendencias'], publishedAt: '2026-09-24' };
    expect(isCatalogEditorialEntryPublic(future, new Date('2026-09-24T00:30:00.000Z'))).toBe(false);
    expect(isCatalogEditorialEntryPublic(future, new Date('2026-09-24T03:00:00.000Z'))).toBe(true);
    const expiring = { ...catalogEditorialEntries['novas-tendencias'], expiresAt: '2026-09-24' };
    expect(isCatalogEditorialEntryPublic(expiring, new Date('2026-09-24T02:59:59.000Z'))).toBe(true);
    expect(isCatalogEditorialEntryPublic(expiring, new Date('2026-09-24T03:00:00.000Z'))).toBe(false);
  });

  it('denuncia datas editoriais malformadas em vez de deixar NaN ignorar a governança', () => {
    const original = catalogEditorialEntries['novas-tendencias'];
    catalogEditorialEntries['novas-tendencias'] = { ...original, reviewedAt: 'data-invalida', reviewDueAt: '2026-02-30' };
    try {
      expect(catalogEditorialIssues(new Date('2026-09-22T12:00:00-03:00'))).toEqual(expect.arrayContaining([
        'novas-tendencias: reviewedAt inválido',
        'novas-tendencias: reviewDueAt inválido',
      ]));
    } finally {
      catalogEditorialEntries['novas-tendencias'] = original;
    }
  });
});
