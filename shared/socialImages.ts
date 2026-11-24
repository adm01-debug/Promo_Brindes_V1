import type { CatalogEditorialId } from './catalogEditorial.js';

// Capa social (1200x630) de cada coleção de /catalogos. O Record é exaustivo
// por tipo de propósito: uma coleção nova quebra o typecheck até ganhar card,
// em vez de cair em silêncio na capa genérica. Os arquivos são gerados por
// scripts/generate-social-cards.mjs a partir da paleta de src/lib/catalogLibrary.ts.
export const catalogSocialImages: Record<CatalogEditorialId, string> = {
  'onboarding-com-cultura': '/images/og/colecao-onboarding-com-cultura.png',
  'eventos-que-continuam': '/images/og/colecao-eventos-que-continuam.png',
  'reconhecimento-com-desejo': '/images/og/colecao-reconhecimento-com-desejo.png',
  'relacionamento-que-fica': '/images/og/colecao-relacionamento-que-fica.png',
  'novas-tendencias': '/images/og/colecao-novas-tendencias.png',
  'escolhas-de-menor-impacto': '/images/og/colecao-escolhas-de-menor-impacto.png',
  'tech-que-resolve': '/images/og/colecao-tech-que-resolve.png',
  'celebracoes-com-significado': '/images/og/colecao-celebracoes-com-significado.png',
  'kits-prontos-para-combinar': '/images/og/colecao-kits-prontos-para-combinar.png',
  'sua-marca-em-cena': '/images/og/colecao-sua-marca-em-cena.png',
};

export function catalogSocialImage(id: CatalogEditorialId | null | undefined): string | undefined {
  return id ? catalogSocialImages[id] : undefined;
}
// Capa social (1200x630) de cada data da agenda aberta em
// /datas-comemorativas?data=<id>. O caminho e derivado do id: a fonte dos ids e
// api/_lib/curatedPagePreviews.ts, que tambem alimenta o HTML inicial de
// api/site-page.ts. O teste tests/api/site-page.test.ts percorre essa lista e
// falha se um id publicado ficar sem arquivo. Os arquivos saem de
// scripts/generate-social-cards.mjs.
export function occasionSocialImage(id: string | null | undefined): string | undefined {
  return id ? `/images/og/data-${id}.png` : undefined;
}
