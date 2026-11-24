// Metadados de /catalogos em uma unica fonte: o shell pre-renderizado
// (api/site-page.ts) e a hidratacao (src/pages/CatalogsPage.tsx via Seo)
// precisam entregar o mesmo par titulo/descricao para a mesma URL.
export const CATALOGS_INDEX_TITLE = 'Catálogos de brindes';
export const CATALOGS_INDEX_DESCRIPTION =
  'Explore catálogos e coleções de brindes corporativos por campanha, público e objetivo. Encontre referências e monte seu briefing.';

/** Titulo de uma colecao compartilhada, ainda sem o sufixo da marca. */
export function catalogCollectionTitle(collectionTitle: string): string {
  return `${collectionTitle} | Catálogos`;
}
