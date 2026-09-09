import type { Category } from '../types';
import { normalizeSearchText } from './search';

export type CampaignMoment = 'onboarding' | 'evento' | 'relacionamento' | 'reconhecimento' | 'sazonal';
export type CampaignAudience = 'clientes' | 'colaboradores' | 'lideranca' | 'parceiros' | 'publico-evento';
export type CampaignScale = 'ate-50' | '51-200' | '201-500' | '500-mais';
export type CampaignMood = 'util' | 'premium' | 'sustentavel' | 'tech' | 'afetivo' | 'divertido';

export interface CampaignSelection {
  moment?: CampaignMoment;
  audience?: CampaignAudience;
  scale?: CampaignScale;
  mood?: CampaignMood;
}

interface CampaignOption<Value extends string> {
  value: Value;
  label: string;
  description: string;
}

export const CAMPAIGN_MOMENTS: CampaignOption<CampaignMoment>[] = [
  { value: 'onboarding', label: 'Onboarding', description: 'Boas-vindas com cultura desde o primeiro dia.' },
  { value: 'evento', label: 'Evento', description: 'Presença que continua depois do credenciamento.' },
  { value: 'relacionamento', label: 'Relacionamento', description: 'Um ponto de contato que vale ser lembrado.' },
  { value: 'reconhecimento', label: 'Reconhecimento', description: 'Presentes à altura de quem fez acontecer.' },
  { value: 'sazonal', label: 'Data especial', description: 'Campanhas sazonais sem cair no genérico.' },
];

export const CAMPAIGN_AUDIENCES: CampaignOption<CampaignAudience>[] = [
  { value: 'clientes', label: 'Clientes', description: 'Relacionamento e fidelização.' },
  { value: 'colaboradores', label: 'Colaboradores', description: 'Cultura, cuidado e pertencimento.' },
  { value: 'lideranca', label: 'Liderança', description: 'Acabamento e presença premium.' },
  { value: 'parceiros', label: 'Parceiros', description: 'Valor para relações estratégicas.' },
  { value: 'publico-evento', label: 'Público de evento', description: 'Utilidade com alcance e memória.' },
];

export const CAMPAIGN_SCALES: CampaignOption<CampaignScale>[] = [
  { value: 'ate-50', label: 'Até 50', description: 'Seleções menores e mais pessoais.' },
  { value: '51-200', label: '51–200', description: 'Times, encontros e ações direcionadas.' },
  { value: '201-500', label: '201–500', description: 'Campanhas de médio alcance.' },
  { value: '500-mais', label: '500+', description: 'Escala para grandes ativações.' },
];

export const CAMPAIGN_MOODS: CampaignOption<CampaignMood>[] = [
  { value: 'util', label: 'Útil', description: 'Fica por perto porque resolve.' },
  { value: 'premium', label: 'Premium', description: 'Mais presença em cada detalhe.' },
  { value: 'sustentavel', label: 'Sustentável', description: 'Materiais de menor impacto.' },
  { value: 'tech', label: 'Tech', description: 'Tecnologia que entra na rotina.' },
  { value: 'afetivo', label: 'Afetivo', description: 'Kits com sensação de cuidado.' },
  { value: 'divertido', label: 'Divertido', description: 'Cor, conversa e energia.' },
];

const values = {
  moment: new Set(CAMPAIGN_MOMENTS.map((option) => option.value)),
  audience: new Set(CAMPAIGN_AUDIENCES.map((option) => option.value)),
  scale: new Set(CAMPAIGN_SCALES.map((option) => option.value)),
  mood: new Set(CAMPAIGN_MOODS.map((option) => option.value)),
};

function valid<Value extends string>(candidate: string | null, allowed: Set<Value>): Value | undefined {
  return candidate && allowed.has(candidate as Value) ? candidate as Value : undefined;
}

export function parseCampaignSelection(params: URLSearchParams): CampaignSelection {
  return {
    moment: valid(params.get('momento'), values.moment),
    audience: valid(params.get('publico'), values.audience),
    scale: valid(params.get('escala'), values.scale),
    mood: valid(params.get('clima'), values.mood),
  };
}

export function campaignSelectionCount(selection: CampaignSelection): number {
  return Object.values(selection).filter(Boolean).length;
}

export function buildCampaignCatalogUrl(selection: CampaignSelection): string {
  const params = new URLSearchParams();
  if (selection.moment) params.set('momento', selection.moment);
  if (selection.audience) params.set('publico', selection.audience);
  if (selection.scale) params.set('escala', selection.scale);
  if (selection.mood) params.set('clima', selection.mood);
  const query = params.toString();
  return query ? `/catalogo?${query}` : '/catalogo';
}

function optionLabel<Value extends string>(options: CampaignOption<Value>[], value?: Value): string | undefined {
  return options.find((option) => option.value === value)?.label;
}

export function campaignLabels(selection: CampaignSelection): Array<{ key: keyof CampaignSelection; label: string }> {
  return [
    selection.moment && { key: 'moment' as const, label: `Momento: ${optionLabel(CAMPAIGN_MOMENTS, selection.moment)}` },
    selection.audience && { key: 'audience' as const, label: `Público: ${optionLabel(CAMPAIGN_AUDIENCES, selection.audience)}` },
    selection.scale && { key: 'scale' as const, label: `Escala: ${optionLabel(CAMPAIGN_SCALES, selection.scale)} un.` },
    selection.mood && { key: 'mood' as const, label: `Clima: ${optionLabel(CAMPAIGN_MOODS, selection.mood)}` },
  ].filter((item): item is { key: keyof CampaignSelection; label: string } => Boolean(item));
}

export interface ResolvedCampaignFilters {
  profile?: 'featured' | 'new' | 'kits';
  materials: string[];
  colors: string[];
  maxMinQuantity?: number;
  categoryIds: string[];
}

export function resolveCampaignFilters(selection: CampaignSelection, categories: Category[]): ResolvedCampaignFilters {
  const categoryPattern = selection.mood === 'tech' ? /tecnologia|eletronico|eletrônico/i : null;
  const categoryIds = categoryPattern
    ? categories.filter((category) => categoryPattern.test(normalizeSearchText(category.name))).map((category) => category.id)
    : [];
  const profile = selection.moment === 'onboarding' || selection.moment === 'reconhecimento' || selection.mood === 'afetivo'
    ? 'kits'
    : selection.moment === 'sazonal' || selection.mood === 'premium'
      ? 'featured'
      : undefined;
  const maxMinQuantity = selection.scale === 'ate-50'
    ? 50
    : selection.scale === '51-200'
      ? 200
      : selection.scale === '201-500'
        ? 500
        : undefined;

  return {
    profile,
    materials: selection.mood === 'sustentavel' ? ['reciclado'] : [],
    colors: selection.mood === 'divertido' ? ['colorido'] : [],
    maxMinQuantity,
    categoryIds,
  };
}
