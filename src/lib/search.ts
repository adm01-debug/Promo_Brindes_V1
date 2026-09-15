import type { Category } from '../types';

const CONTEXT_WORDS = new Set([
  'a', 'acao', 'acoes', 'as', 'ate', 'brinde', 'brindes', 'campanha', 'cliente', 'clientes',
  'colaborador', 'colaboradores', 'com', 'corporativo', 'corporativos', 'da', 'das', 'de',
  'do', 'dos', 'e', 'empresa', 'empresas', 'equipe', 'equipes', 'evento', 'eventos',
  'lideranca', 'o', 'os', 'para', 'parceiro', 'parceiros', 'pessoa', 'pessoas',
  'personalizado', 'personalizados', 'publico', 'time', 'times', 'un', 'unidade', 'unidades',
]);

const PRICE_WORDS = new Set(['barato', 'barata', 'baratos', 'baratas', 'preco', 'precos', 'valor', 'valores']);

const SYNONYM_GROUPS: string[][] = [
  ['squeeze', 'garrafa', 'garrafinha'],
  ['sacochila', 'mochila saco'],
  ['powerbank', 'power bank', 'carregador portatil', 'carregador portátil'],
  ['stanley', 'termico', 'térmico'],
  // Onboarding é uma intenção de campanha, não sinônimo de qualquer kit.
  // "Kit" continua pesquisável separadamente e pode ser combinado com a intenção.
  ['onboarding', 'boas vindas', 'boas-vindas', 'kit de onboarding', 'kit onboarding'],
  ['kit', 'kits', 'kit corporativo'],
  ['ecologico', 'ecológico', 'sustentavel', 'sustentável', 'reciclado'],
  ['caderno', 'moleskine', 'bloco de notas'],
  ['cordao', 'cordão', 'lanyard'],
  ['camiseta', 't shirt', 't-shirt'],
  ['necessaire', 'nécessaire', 'estojo'],
];

const TYPO_CORRECTIONS = [
  'squeeze', 'garrafa', 'sacochila', 'mochila', 'powerbank', 'carregador',
  'termico', 'onboarding', 'reciclado', 'caderno', 'lanyard', 'camiseta', 'necessaire',
] as const;

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

function groupKey(group: string[]): string {
  return [...group].sort().join('\u0000');
}

function addUniqueGroup(groups: string[][], seen: Set<string>, group: string[]) {
  const normalizedGroup = [...new Set(group.map(normalizeSearchText).filter(Boolean))].slice(0, 5);
  const key = groupKey(normalizedGroup);
  if (!normalizedGroup.length || seen.has(key)) return;
  seen.add(key);
  groups.push(normalizedGroup);
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

  const groups: string[][] = [];
  const seen = new Set<string>();
  let remainder = ` ${normalized} `;

  // Reconhece expressões compostas dentro de frases completas. Sem isto,
  // "power bank para evento" viraria duas exigências independentes.
  SYNONYM_GROUPS.forEach((group) => {
    const phrases = group.map(normalizeSearchText).filter((value) => value.includes(' ') || value.includes('-'));
    const matches = phrases.filter((phrase) => remainder.includes(` ${phrase} `));
    if (!matches.length) return;
    addUniqueGroup(groups, seen, group);
    matches.forEach((phrase) => { remainder = remainder.replaceAll(` ${phrase} `, ' '); });
  });

  const tokens = remainder.trim().split(' ').filter(Boolean);
  const withoutPrice = tokens.filter((token) => !PRICE_WORDS.has(token));
  const objectTokens = withoutPrice.filter((token) => !CONTEXT_WORDS.has(token));
  const candidates = (objectTokens.length || groups.length ? objectTokens : withoutPrice).filter((token) => token.length >= 2);
  const nonNumeric = candidates.filter((token) => !/^\d+$/.test(token));
  // Números acompanham muitos briefings ("onboarding para 100 pessoas"),
  // mas não devem virar condição de produto quando uma intenção já foi entendida.
  const meaningful = (nonNumeric.length ? nonNumeric : groups.length ? [] : candidates).slice(0, 6);
  meaningful.forEach((token) => addUniqueGroup(groups, seen, synonymsFor(token)));
  return groups;
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const saved = previous[rightIndex] ?? 0;
      previous[rightIndex] = Math.min(
        (previous[rightIndex] ?? Number.POSITIVE_INFINITY) + 1,
        (previous[rightIndex - 1] ?? Number.POSITIVE_INFINITY) + 1,
        diagonal + ((left[leftIndex - 1] ?? '') === (right[rightIndex - 1] ?? '') ? 0 : 1),
      );
      diagonal = saved;
    }
  }
  return previous[right.length] ?? right.length;
}

/**
 * Sugere somente correções inequívocas de termos editoriais. Códigos e consultas
 * compostas permanecem intactos para não transformar uma busca precisa em outra.
 */
export function suggestSearchCorrection(input: string): string | null {
  const normalized = normalizeSearchText(input);
  if (!normalized || normalized.includes(' ') || /^\d+$/.test(normalized) || normalized.length < 4) return null;
  const candidates = TYPO_CORRECTIONS
    .map((candidate) => ({ candidate, distance: editDistance(normalized, candidate) }))
    .filter(({ candidate, distance }) => distance > 0 && distance <= (candidate.length >= 7 ? 2 : 1))
    .sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate, 'pt-BR'));
  if (!candidates.length) return null;
  const first = candidates[0];
  const second = candidates[1];
  if (!first || (second && first.distance === second.distance)) return null;
  return first.candidate;
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
