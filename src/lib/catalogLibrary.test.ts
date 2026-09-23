import { describe, expect, it } from 'vitest';
import { catalogCollections, catalogFormatLabel, filterCatalogCollections, publicCatalogCollections } from './catalogLibrary';
import { catalogEditorialEntries, catalogEditorialIssues, isCatalogEditorialEntryPublic } from '../../shared/catalogEditorial';

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

  it('explica o formato antes de a pessoa abrir o material', () => {
    expect(catalogFormatLabel('online')).toBe('Coleção online');
    expect(catalogFormatLabel('pdf')).toBe('Catálogo em PDF');
    expect(catalogFormatLabel('digital')).toBe('Revista digital');
  });

  it('exige responsável, revisão vigente e janela de publicação para cada coleção', () => {
    expect(catalogEditorialIssues()).toEqual([]);
    expect(publicCatalogCollections()).toHaveLength(catalogCollections.length);
    expect(isCatalogEditorialEntryPublic({
      ...catalogEditorialEntries['novos-drops'],
      status: 'draft',
    }, new Date('2026-09-22T12:00:00.000Z'))).toBe(false);
    expect(isCatalogEditorialEntryPublic({
      ...catalogEditorialEntries['novos-drops'],
      expiresAt: '2026-09-01',
    }, new Date('2026-09-22T12:00:00.000Z'))).toBe(false);
  });

  it('publica e expira na data civil de São Paulo, sem antecipar a virada por UTC', () => {
    const future = { ...catalogEditorialEntries['novos-drops'], publishedAt: '2026-09-24' };
    expect(isCatalogEditorialEntryPublic(future, new Date('2026-09-24T00:30:00.000Z'))).toBe(false);
    expect(isCatalogEditorialEntryPublic(future, new Date('2026-09-24T03:00:00.000Z'))).toBe(true);
    const expiring = { ...catalogEditorialEntries['novos-drops'], expiresAt: '2026-09-24' };
    expect(isCatalogEditorialEntryPublic(expiring, new Date('2026-09-24T02:59:59.000Z'))).toBe(true);
    expect(isCatalogEditorialEntryPublic(expiring, new Date('2026-09-24T03:00:00.000Z'))).toBe(false);
  });

  it('denuncia datas editoriais malformadas em vez de deixar NaN ignorar a governança', () => {
    const original = catalogEditorialEntries['novos-drops'];
    catalogEditorialEntries['novos-drops'] = { ...original, reviewedAt: 'data-invalida', reviewDueAt: '2026-02-30' };
    try {
      expect(catalogEditorialIssues(new Date('2026-09-22T12:00:00-03:00'))).toEqual(expect.arrayContaining([
        'novos-drops: reviewedAt inválido',
        'novos-drops: reviewDueAt inválido',
      ]));
    } finally {
      catalogEditorialEntries['novos-drops'] = original;
    }
  });
});
