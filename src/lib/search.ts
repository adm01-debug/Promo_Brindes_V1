import type { Category } from '../types';

const CONTEXT_WORDS = new Set([
  'acao', 'acoes', 'brinde', 'brindes', 'campanha', 'corporativo', 'corporativos',
  'empresa', 'evento', 'eventos', 'para', 'personalizado', 'personalizados',
]);

const PRICE_WORDS = new Set(['barato', 'barata', 'baratos', 'baratas', 'preco', 'precos', 'valor', 'valores']);

const SYNONYM_GROUPS: string[][] = [
  ['squeeze', 'garrafa', 'garrafinha'],
  ['sacochila', 'mochila saco'],
  ['powerbank', 'power bank', 'carregador portatil', 'carregador portátil'],
  ['stanley', 'termico', 'térmico'],
  ['onboarding', 'boas vindas', 'boas-vindas', 'kit'],
  ['ecologico', 'ecológico', 'sustentavel', 'sustentável', 'reciclado'],
  ['caderno', 'moleskine', 'bloco de notas'],
  ['cordao', 'cordão', 'lanyard'],
  ['camiseta', 't shirt', 't-shirt'],
  ['necessaire', 'nécessaire', 'estojo'],
];

const CURATED_SUGGESTIONS = [
  { label: 'Kits de onboarding', value: 'kit boas-vindas', keywords: 'onboarding boas vindas colaboradores kit' },
  { label: 'Copos e garrafas térmicas', value: 'copo térmico', keywords: 'stanley copo squeeze garrafa termica' },
  { label: 'Tech útil', value: 'carregador portátil', keywords: 'tech tecnologia powerbank power bank carregador' },
  { label: 'Mochilas e sacochilas', value: 'mochila', keywords: 'mochila sacochila bolsa viagem' },
  { label: 'Cadernos e papelaria', value: 'caderno', keywords: 'caderno moleskine bloco papelaria escritorio' },
  { label: 'Escolhas sustentáveis', value: 'reciclado', keywords: 'sustentavel ecologico reciclado menor impacto' },
  { label: 'Camisetas e wearables', value: 'camiseta', keywords: 'camiseta roupa wearable uniforme' },
  { label: 'Kits para eventos', value: 'kit evento', keywords: 'evento feira congresso campanha kit' },
] as const;

export interface SearchSuggestion {
  id: string;
  label: string;
  value: string;
  kind: 'idea' | 'category';
  categoryId?: string;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function synonymsFor(term: string): string[] {
  const normalizedTerm = normalizeSearchText(term);
  const group = SYNONYM_GROUPS.find((values) => values.some((value) => normalizeSearchText(value) === normalizedTerm));
  return [...new Set((group ?? [term]).map(normalizeSearchText).filter(Boolean))].slice(0, 5);
}

/**
 * Devolve dimensões AND, cada uma com alternativas OR. Palavras de preço são
 * descartadas porque o catálogo não publica preço; contexto genérico só é usado
 * quando é a única intenção disponível.
 */
export function buildCatalogSearchGroups(input: string): string[][] {
  const normalized = normalizeSearchText(input).slice(0, 80);
  if (!normalized) return [];

  const exactGroup = SYNONYM_GROUPS.find((values) => values.some((value) => normalizeSearchText(value) === normalized));
  if (exactGroup) return [[...new Set(exactGroup.map(normalizeSearchText))].slice(0, 5)];

  const tokens = normalized.split(' ').filter(Boolean);
  const withoutPrice = tokens.filter((token) => !PRICE_WORDS.has(token));
  const objectTokens = withoutPrice.filter((token) => !CONTEXT_WORDS.has(token));
  const meaningful = (objectTokens.length ? objectTokens : withoutPrice).filter((token) => token.length >= 2).slice(0, 6);
  return meaningful.map(synonymsFor);
}

export function buildSearchSuggestions(input: string, categories: Category[], limit = 6): SearchSuggestion[] {
  const query = normalizeSearchText(input);
  if (query.length < 2) return [];

  const ideas: SearchSuggestion[] = CURATED_SUGGESTIONS
    .filter((item) => normalizeSearchText(`${item.label} ${item.value} ${item.keywords}`).includes(query))
    .map((item) => ({ id: `idea-${item.value}`, label: item.label, value: item.value, kind: 'idea' as const }));
  const categorySuggestions: SearchSuggestion[] = categories
    .filter((category) => normalizeSearchText(category.name).includes(query))
    .slice(0, limit)
    .map((category) => ({
      id: `category-${category.id}`,
      label: category.name.replaceAll(' | ', ' & '),
      value: category.name,
      kind: 'category' as const,
      categoryId: category.id,
    }));

  return [...ideas, ...categorySuggestions]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, limit);
}
