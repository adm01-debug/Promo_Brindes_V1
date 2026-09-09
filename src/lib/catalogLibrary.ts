import { normalizeSearchText } from './search';

export type CatalogCollectionFormat = 'online' | 'pdf' | 'digital';
export type CatalogCollectionTheme = 'people' | 'events' | 'impact' | 'products';

export interface CatalogCollection {
  id: string;
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
    id: 'onboarding-com-cultura',
    title: 'Onboarding com cultura',
    eyebrow: 'People experience',
    description: 'Boas-vindas que apresentam a empresa antes mesmo da primeira reunião.',
    format: 'online',
    theme: 'people',
    href: '/catalogo?momento=onboarding&publico=colaboradores&perfil=kits',
    tags: ['Onboarding', 'Colaboradores', 'Kits'],
    palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' },
    featured: true,
    edition: 'Seleção viva',
  },
  {
    id: 'eventos-que-continuam',
    title: 'Eventos que continuam',
    eyebrow: 'Live marketing',
    description: 'Produtos úteis e compartilháveis para a experiência continuar depois do credenciamento.',
    format: 'online',
    theme: 'events',
    href: '/catalogo?momento=evento&publico=publico-evento',
    tags: ['Eventos', 'Ativações', 'Experiência'],
    palette: { background: '#ff6b5f', accent: '#d9ff3f', ink: '#121511' },
    edition: 'Seleção viva',
  },
  {
    id: 'reconhecimento-com-desejo',
    title: 'Reconhecimento com desejo',
    eyebrow: 'Employer branding',
    description: 'Presentes à altura de metas, marcos de carreira e conquistas que merecem memória.',
    format: 'online',
    theme: 'people',
    href: '/catalogo?momento=reconhecimento&publico=colaboradores&clima=premium',
    tags: ['Reconhecimento', 'Premium', 'Tempo de casa'],
    palette: { background: '#111411', accent: '#d9ff3f', ink: '#f7f4ea' },
    edition: 'Seleção viva',
  },
  {
    id: 'relacionamento-que-fica',
    title: 'Relacionamento que fica',
    eyebrow: 'Brand love',
    description: 'Ideias para clientes e parceiros levarem a sua marca para a rotina.',
    format: 'online',
    theme: 'impact',
    href: '/catalogo?momento=relacionamento&publico=clientes',
    tags: ['Clientes', 'Parceiros', 'Relacionamento'],
    palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' },
    edition: 'Seleção viva',
  },
  {
    id: 'novos-drops',
    title: 'Novos drops',
    eyebrow: 'Radar de novidades',
    description: 'Lançamentos e achados recentes para quem quer fugir do briefing previsível.',
    format: 'online',
    theme: 'products',
    href: '/catalogo?perfil=novos',
    tags: ['Novidades', 'Tendências', 'Lançamentos'],
    palette: { background: '#f6f1e7', accent: '#4844ff', ink: '#121511' },
    edition: 'Atualização contínua',
  },
  {
    id: 'escolhas-de-menor-impacto',
    title: 'Escolhas de menor impacto',
    eyebrow: 'Sustentabilidade',
    description: 'Materiais e ideias para alinhar utilidade, mensagem e escolhas mais conscientes.',
    format: 'online',
    theme: 'impact',
    href: '/catalogo?clima=sustentavel',
    tags: ['Reciclados', 'Ecológicos', 'Uso real'],
    searchAliases: ['sustentável', 'sustentavel', 'ecológico', 'ecologico', 'reciclado', 'consciente'],
    palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' },
    edition: 'Seleção viva',
  },
  {
    id: 'tech-que-resolve',
    title: 'Tech que resolve',
    eyebrow: 'Utilidade primeiro',
    description: 'Tecnologia para mesa, mobilidade e rotina — com função antes do efeito.',
    format: 'online',
    theme: 'products',
    href: '/catalogo?clima=tech',
    tags: ['Tecnologia', 'Home office', 'Mobilidade'],
    palette: { background: '#dbe4ff', accent: '#4844ff', ink: '#121511' },
    edition: 'Seleção viva',
  },
  {
    id: 'celebracoes-com-significado',
    title: 'Celebrações com significado',
    eyebrow: 'Calendário afetivo',
    description: 'Datas especiais, encerramentos de ciclo e encontros que pedem algo além do protocolo.',
    format: 'online',
    theme: 'events',
    href: '/catalogo?momento=sazonal&clima=afetivo',
    tags: ['Datas especiais', 'Celebração', 'Final de ano'],
    palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' },
    edition: 'Seleção viva',
  },
  {
    id: 'kits-prontos-para-combinar',
    title: 'Kits prontos para combinar',
    eyebrow: 'Mix & match',
    description: 'Pontos de partida para compor experiências com diferentes produtos e embalagens.',
    format: 'online',
    theme: 'products',
    href: '/catalogo?perfil=kits',
    tags: ['Kits', 'Embalagem', 'Composições'],
    palette: { background: '#f4e4bf', accent: '#ff6b5f', ink: '#121511' },
    edition: 'Seleção viva',
  },
  {
    id: 'sua-marca-em-cena',
    title: 'Sua marca em cena',
    eyebrow: 'Personalização',
    description: 'Produtos com potencial para receber a identidade da campanha e circular de verdade.',
    format: 'online',
    theme: 'impact',
    href: '/catalogo?personalizavel=1',
    tags: ['Personalizáveis', 'Marca', 'Campanhas'],
    palette: { background: '#e6dcff', accent: '#d9ff3f', ink: '#121511' },
    edition: 'Seleção viva',
  },
];

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
