import type { Category } from '../types';

const CATEGORY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CATALOG_PAGE = 10_000;

export type ProfileParam = 'todos' | 'destaques' | 'novos' | 'kits';

export const PROFILE_OPTIONS: Array<{ value: ProfileParam; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'destaques', label: 'Em alta' },
  { value: 'novos', label: 'Novos drops' },
  { value: 'kits', label: 'Kits & combos' },
];

export interface ColorFilterOption {
  id: string;
  label: string;
  hex: string;
  values: string[];
}

export interface MaterialFilterOption {
  id: string;
  label: string;
  values: string[];
}

// IDs estáveis mantêm URLs compartilháveis mesmo se a grafia do catálogo mudar.
// `values` absorve as variações de caixa já existentes no banco canônico.
export const COLOR_FILTERS: ColorFilterOption[] = [
  { id: 'preto', label: 'Preto', hex: '#171a18', values: ['PRETO', 'Preto', 'preto', 'PRETA #333B3B', 'PRETO (LEGACY)', 'PRETO/CROMADO SATINADO'] },
  { id: 'azul', label: 'Azul', hex: '#1664e8', values: ['AZUL', 'Azul', 'azul', 'AZUL ROYAL', 'Azul Royal', 'AZUL CLARO', 'AZUL MARINHO', 'AZUL AQUA', 'AZUL PASTEL', 'AZUL CIANO', 'AZUL ESCURO', 'AZUL ACINZENTADO', 'TURQUESA', 'VERDE TURQUESA', '#180DF3'] },
  { id: 'branco', label: 'Branco', hex: '#ffffff', values: ['BRANCO', 'Branco', 'branco', 'Branco Off White', 'OFF WHITE', 'BRANCO PASTEL', 'BRANCO MESCLADO', 'CREME', '#FDFDFD'] },
  { id: 'vermelho', label: 'Vermelho', hex: '#ee3b45', values: ['VERMELHO', 'Vermelho', 'vermelho', 'VINHO', 'BORDÔ', 'CEREJA', '#FB0000'] },
  { id: 'verde', label: 'Verde', hex: '#24ad61', values: ['VERDE', 'Verde', 'verde', 'VERDE CLARO', 'VERDE ESCURO', 'VERDE TROPA', 'VERDE ÁGUA', 'VERDE MUSGO', 'Verde Floresta', 'OLIVA', 'KIWI'] },
  { id: 'colorido', label: 'Colorido', hex: 'conic-gradient(#e94987, #f7c843, #42d982, #367cf6, #e94987)', values: ['COLORIDO', 'Colorido', 'colorido', 'ESTAMPA', 'SORTIDO'] },
  { id: 'cinza', label: 'Cinza', hex: '#929996', values: ['CINZA', 'Cinza', 'cinza', 'CHUMBO', 'CINZA ESCURO', 'CINZA CLARO', 'Cinza Grafite', 'CINZA CLARO MESCLADO', 'GRAFITE', 'FUME', 'FUMÊ'] },
  { id: 'rosa', label: 'Rosa', hex: '#f07aae', values: ['ROSA', 'Rosa', 'rosa', 'ROSA CLARO', 'Rosa Bebê', 'ROSA FLAMINGO', 'SALMÃO', 'PÊSSEGO'] },
  { id: 'roxo', label: 'Roxo', hex: '#7c45bd', values: ['ROXO', 'Roxo', 'Roxo Púrpura', 'LILAS', 'LAVANDA'] },
  { id: 'laranja', label: 'Laranja', hex: '#f47a28', values: ['LARANJA', 'Laranja', 'laranja'] },
  { id: 'prata', label: 'Prata', hex: '#c3c8ca', values: ['PRATA', 'Prata', 'prata', 'INOX', 'CROMADO', 'CROMADO SATINADO', 'Prata Cromado', 'Prata Acetinado (Fosco)', 'Prata Inox'] },
  { id: 'dourado', label: 'Dourado', hex: '#c89b2c', values: ['DOURADO', 'DOURADO SATINADO', 'Dourado Brilhante', 'CHAMPANHE', 'BRONZE', 'COBRE'] },
  { id: 'amarelo', label: 'Amarelo', hex: '#f3cc35', values: ['AMARELO', 'Amarelo', 'amarelo', 'AMARELO LIMÃO', 'AMARELO ESCURO', 'AMARELO QUEIMADO', 'MILHO'] },
  { id: 'transparente', label: 'Transparente', hex: 'linear-gradient(135deg, #fff 0 44%, #b7dff5 45% 55%, #fff 56%)', values: ['TRANSPARENTE', 'Transparente'] },
  { id: 'natural', label: 'Natural', hex: '#c99d63', values: ['BAMBU', 'Bambu', 'bambu', 'MADEIRA', 'Madeira', 'madeira', 'BEGE', 'Bege Nude', 'NATURAL', 'Natural', 'NATURAL CLARO', 'NATURAL ESCURO', 'KRAFT', 'Kraft', 'CRU', 'MARROM', 'Marrom', 'MARRON', 'MARROM CLARO', 'MARRON CLARO', 'MARRON ESCURO', 'Marrom Chocolate', 'CAFÉ', 'CAFE', 'CAMEL', 'CHÁ'] },
];

export const MATERIAL_FILTERS: MaterialFilterOption[] = [
  { id: 'aco-inox', label: 'Aço inox', values: ['Aço Inox'] },
  { id: 'plastico', label: 'Plástico', values: ['Plástico Genérico', 'Polipropileno (PP)', 'ABS (Acrilonitrila Butadieno Estireno)', 'Poliestireno - PS', 'PVC (Policloreto de Vinila)', 'PVC Rígido', 'PVC Flocado (Veludo)', 'PVC Flexível', 'Plástico - PET', 'Policarbonato', 'Polipropileno Homopolímero (PP Homo)', 'Polietileno de Alta Densidade (PEAD) / PE', 'Polietileno Tereftalato (PET)', 'Acrílico', 'POE (Poliolefina Elastomérica)', 'Melanina'] },
  { id: 'metal', label: 'Metal', values: ['Metal Genérico', 'Zinco', 'Bronze', 'Cobre', 'Esmaltado'] },
  { id: 'bambu', label: 'Bambu', values: ['Bambu'] },
  { id: 'poliester', label: 'Poliéster e tecidos', values: ['Poliéster', 'Pongee', 'Oxford', 'Ripstop', 'Microfibra', 'Neoprene', 'Polar', 'Jacquard', 'Poliamida', 'Tecido Genérico', 'Lona não resinada', 'Indigo (desengomado)', 'Lycra'] },
  { id: 'couro-sintetico', label: 'Couro sintético', values: ['Couro Sintético (Ecológico)'] },
  { id: 'aluminio', label: 'Alumínio', values: ['Alumínio'] },
  { id: 'nylon', label: 'Nylon', values: ['Nylon'] },
  { id: 'couro-legitimo', label: 'Couro legítimo', values: ['Couro Legítimo'] },
  { id: 'borracha', label: 'Borracha', values: ['Borracha'] },
  { id: 'madeira', label: 'Madeira', values: ['Madeira', 'MDF'] },
  { id: 'algodao', label: 'Algodão e fibras', values: ['Algodão', 'Fibras Naturais', 'TNT (Nowen)', 'TNT (Nowen) Laminado', 'Feltro'] },
  { id: 'eva', label: 'EVA e espuma', values: ['EVA (Acetato de Vinila)', 'Espuma'] },
  { id: 'cortica', label: 'Cortiça', values: ['Cortiça'] },
  { id: 'papel', label: 'Papel e cartão', values: ['Papel Genérico', 'Cartão', 'Kraft', 'Papelão'] },
  { id: 'vidro', label: 'Vidro', values: ['Vidro', 'Vidro Borossilicado'] },
  { id: 'ceramica', label: 'Cerâmica', values: ['Cerâmica', 'Porcelana'] },
  { id: 'silicone', label: 'Silicone', values: ['Silicone'] },
  { id: 'reciclado', label: 'Material reciclado', values: ['Plástico - rPET', 'Reciclado', 'Aço Inox Reciclado', 'Plásticos Ecológicos'] },
];

const colorById = new Map(COLOR_FILTERS.map((option) => [option.id, option]));
const materialById = new Map(MATERIAL_FILTERS.map((option) => [option.id, option]));

export function parseFilterIds(value: string | null, allowed: ReadonlySet<string>, max = 12): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((item) => item.trim()).filter((item) => allowed.has(item)))].slice(0, max);
}

export function isCatalogCategoryId(value: string): boolean {
  return CATEGORY_ID_PATTERN.test(value);
}

export function parseCategoryIds(value: string | null, max = 12): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((id) => id.trim()).filter(isCatalogCategoryId))].slice(0, max);
}

export function parseCatalogPage(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_CATALOG_PAGE, Math.max(1, Math.trunc(parsed)));
}

export function serializeFilterIds(values: string[]): string | null {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.length ? unique.join(',') : null;
}

export function resolveColorValues(ids: string[]): string[] {
  return [...new Set(ids.flatMap((id) => colorById.get(id)?.values ?? []))];
}

export function resolveMaterialValues(ids: string[]): string[] {
  return [...new Set(ids.flatMap((id) => materialById.get(id)?.values ?? []))];
}

export function filterLabel(kind: 'color' | 'material', id: string): string {
  const option = kind === 'color' ? colorById.get(id) : materialById.get(id);
  return option?.label ?? id;
}

export function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function categoryDescendantIds(categories: Category[], selectedIds: string[]): string[] {
  const childrenByParent = new Map<string, string[]>();
  categories.forEach((category) => {
    if (!category.parentId) return;
    const children = childrenByParent.get(category.parentId) ?? [];
    children.push(category.id);
    childrenByParent.set(category.parentId, children);
  });

  const result = new Set<string>();
  const queue = [...selectedIds];
  while (queue.length) {
    const id = queue.shift();
    if (!id || result.has(id)) continue;
    result.add(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  return [...result];
}

export function categoryQueryIds(categories: Category[], selectedIds: string[]): string[] {
  // A origem não preenche `main_category_id` de forma consistente. Expandir também
  // categorias-raiz impede que produtos válidos dos seus ramos desapareçam do filtro.
  return categoryDescendantIds(categories, selectedIds);
}

export const colorFilterIds = new Set(COLOR_FILTERS.map((option) => option.id));
export const materialFilterIds = new Set(MATERIAL_FILTERS.map((option) => option.id));
