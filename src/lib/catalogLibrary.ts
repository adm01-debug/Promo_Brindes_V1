import { normalizeSearchText } from './search';
import type { CatalogQuery } from './catalog';
import { catalogEditorialEntries, isCatalogEditorialEntryPublic, type CatalogEditorialId } from '../../shared/catalogEditorial';

export type CatalogCollectionFormat = 'online' | 'pdf' | 'digital';
export type CatalogCollectionTheme = 'people' | 'events' | 'impact' | 'products';

export interface CatalogCollection {
  id: CatalogEditorialId;
  title: string;
  eyebrow: string;
  description: string;
  format: CatalogCollectionFormat;
  theme: CatalogCollectionTheme;
  href: string;
  tags: string[];
  searchAliases?: string[];
  palette: { background: string; accent: string; ink: string };
  featured?: boolean;
  edition?: string;
  pageCount?: number;
  /** Consulta pública usada para uma prévia real, carregada somente quando a capa aparece. */
  coverQuery: CatalogQuery;
}

function editorial(id: CatalogEditorialId) {
  return { id, title: catalogEditorialEntries[id].title, description: catalogEditorialEntries[id].description };
}

export const catalogThemeOptions: Array<{ id: 'all' | CatalogCollectionTheme; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'people', label: 'Pessoas & cultura' },
  { id: 'events', label: 'Datas & eventos' },
  { id: 'impact', label: 'Impacto & estilo' },
  { id: 'products', label: 'Linhas de produto' },
];

export const catalogCollections: CatalogCollection[] = [
  {
    ...editorial('onboarding-com-cultura'),
    eyebrow: 'People experience',
    format: 'online',
    theme: 'people',
    href: '/catalogo?momento=onboarding&publico=colaboradores',
    tags: ['Onboarding', 'Colaboradores', 'Cultura'],
    palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' },
    featured: true,
    edition: 'Seleção viva',
    coverQuery: { pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('eventos-que-continuam'),
    eyebrow: 'Live marketing',
    format: 'online',
    theme: 'events',
    href: '/catalogo?momento=evento&publico=publico-evento',
    tags: ['Eventos', 'Ativações', 'Experiência'],
    palette: { background: '#ff6b5f', accent: '#d9ff3f', ink: '#121511' },
    edition: 'Seleção viva',
    coverQuery: { search: 'copo', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('reconhecimento-com-desejo'),
    eyebrow: 'Employer branding',
    format: 'online',
    theme: 'people',
    href: '/catalogo?momento=reconhecimento&publico=colaboradores&clima=premium',
    tags: ['Reconhecimento', 'Premium', 'Tempo de casa'],
    palette: { background: '#111411', accent: '#d9ff3f', ink: '#f7f4ea' },
    edition: 'Seleção viva',
    coverQuery: { search: 'mochila', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('relacionamento-que-fica'),
    eyebrow: 'Brand love',
    format: 'online',
    theme: 'impact',
    href: '/catalogo?momento=relacionamento&publico=clientes',
    tags: ['Clientes', 'Parceiros', 'Relacionamento'],
    palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' },
    edition: 'Seleção viva',
    coverQuery: { search: 'garrafa', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('novos-drops'),
    eyebrow: 'Radar de novidades',
    format: 'online',
    theme: 'products',
    href: '/catalogo?perfil=novos',
    tags: ['Novidades', 'Tendências', 'Lançamentos'],
    palette: { background: '#f6f1e7', accent: '#4844ff', ink: '#121511' },
    edition: 'Atualização contínua',
    coverQuery: { profile: 'new', pageSize: 1, sort: 'newest' },
  },
  {
    ...editorial('escolhas-de-menor-impacto'),
    eyebrow: 'Sustentabilidade',
    format: 'online',
    theme: 'impact',
    href: '/catalogo?clima=sustentavel',
    tags: ['Reciclados', 'Ecológicos', 'Uso real'],
    searchAliases: ['sustentável', 'sustentavel', 'ecológico', 'ecologico', 'reciclado', 'consciente'],
    palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' },
    edition: 'Seleção viva',
    coverQuery: { search: 'reciclado', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('tech-que-resolve'),
    eyebrow: 'Utilidade primeiro',
    format: 'online',
    theme: 'products',
    href: '/catalogo?clima=tech',
    tags: ['Tecnologia', 'Home office', 'Mobilidade'],
    palette: { background: '#dbe4ff', accent: '#4844ff', ink: '#121511' },
    edition: 'Seleção viva',
    coverQuery: { search: 'carregador', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('celebracoes-com-significado'),
    eyebrow: 'Calendário afetivo',
    format: 'online',
    theme: 'events',
    href: '/catalogo?momento=sazonal&clima=afetivo',
    tags: ['Datas especiais', 'Celebração', 'Final de ano'],
    palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' },
    edition: 'Seleção viva',
    coverQuery: { search: 'caneca', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('kits-prontos-para-combinar'),
    eyebrow: 'Mix & match',
    format: 'online',
    theme: 'products',
    href: '/montar-kit',
    tags: ['Kits', 'Embalagem', 'Composições'],
    palette: { background: '#f4e4bf', accent: '#ff6b5f', ink: '#121511' },
    edition: 'Seleção viva',
    coverQuery: { profile: 'kits', pageSize: 1, sort: 'curated' },
  },
  {
    ...editorial('sua-marca-em-cena'),
    eyebrow: 'Personalização',
    format: 'online',
    theme: 'impact',
    href: '/catalogo?personalizavel=1',
    tags: ['Personalizáveis', 'Marca', 'Campanhas'],
    palette: { background: '#e6dcff', accent: '#d9ff3f', ink: '#121511' },
    edition: 'Seleção viva',
    coverQuery: { personalizable: true, pageSize: 1, sort: 'curated' },
  },
];

export function publicCatalogCollections(now = new Date()): CatalogCollection[] {
  return catalogCollections.filter((collection) => isCatalogEditorialEntryPublic(catalogEditorialEntries[collection.id], now));
}

export function filterCatalogCollections(
  collections: CatalogCollection[],
  query: string,
  theme: 'all' | CatalogCollectionTheme,
): CatalogCollection[] {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  return collections.filter((collection) => {
    if (theme !== 'all' && collection.theme !== theme) return false;
    if (!terms.length) return true;
    const haystack = normalizeSearchText([
      collection.title,
      collection.eyebrow,
      collection.description,
      ...collection.tags,
      ...(collection.searchAliases ?? []),
    ].join(' '));
    return terms.every((term) => haystack.includes(term));
  });
}

export function catalogFormatLabel(format: CatalogCollectionFormat): string {
  if (format === 'pdf') return 'Catálogo em PDF';
  if (format === 'digital') return 'Revista digital';
  return 'Coleção online';
}
