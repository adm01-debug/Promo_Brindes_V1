import type { CampaignBrief, CampaignAudience, CampaignMoment, CampaignMood, CampaignScale } from '../types';

const momentValues = new Set<CampaignMoment>(['onboarding', 'evento', 'relacionamento', 'reconhecimento', 'sazonal']);
const audienceValues = new Set<CampaignAudience>(['clientes', 'colaboradores', 'lideranca', 'parceiros', 'publico-evento']);
const scaleValues = new Set<CampaignScale>(['ate-50', '51-200', '201-500', '500-mais']);
const moodValues = new Set<CampaignMood>(['util', 'premium', 'sustentavel', 'tech', 'afetivo', 'divertido']);
const sourceValues = new Set<CampaignBrief['source']>(['finder', 'commemorative_date']);

const labels = {
  moment: { onboarding: 'Onboarding', evento: 'Evento', relacionamento: 'Relacionamento', reconhecimento: 'Reconhecimento', sazonal: 'Data especial' },
  audience: { clientes: 'Clientes', colaboradores: 'Colaboradores', lideranca: 'Liderança', parceiros: 'Parceiros', 'publico-evento': 'Público de evento' },
  scale: { 'ate-50': 'Até 50 pessoas', '51-200': '51–200 pessoas', '201-500': '201–500 pessoas', '500-mais': '500+ pessoas' },
  mood: { util: 'Útil', premium: 'Premium', sustentavel: 'Sustentável', tech: 'Tech', afetivo: 'Afetivo', divertido: 'Divertido' },
} as const;

function optionalValue<Value extends string>(value: unknown, allowed: Set<Value>): Value | undefined {
  return typeof value === 'string' && allowed.has(value as Value) ? value as Value : undefined;
}

function occasion(value: unknown): CampaignBrief['occasion'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  if (!/^[a-z0-9-]{2,80}$/i.test(id) || !name || name.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return { id, name, date };
}

export function normalizeCampaignBrief(value: unknown): CampaignBrief | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const source = optionalValue(raw.source, sourceValues);
  if (!source) return undefined;
  const result: CampaignBrief = {
    source,
    moment: optionalValue(raw.moment, momentValues),
    audience: optionalValue(raw.audience, audienceValues),
    scale: optionalValue(raw.scale, scaleValues),
    mood: optionalValue(raw.mood, moodValues),
    occasion: occasion(raw.occasion),
  };
  if (!result.moment && !result.audience && !result.scale && !result.mood && !result.occasion) return undefined;
  return result;
}

export function campaignBriefLabels(brief?: CampaignBrief): string[] {
  if (!brief) return [];
  return [
    brief.occasion?.name,
    brief.moment && labels.moment[brief.moment],
    brief.audience && labels.audience[brief.audience],
    brief.scale && labels.scale[brief.scale],
    brief.mood && labels.mood[brief.mood],
  ].filter((value): value is string => Boolean(value));
}

export function occasionCatalogUrl(occasion: NonNullable<CampaignBrief['occasion']>, query = ''): string {
  const params = new URLSearchParams({ ocasiao: occasion.id, ocasiao_nome: occasion.name, ocasiao_data: occasion.date });
  if (query.trim()) params.set('q', query.trim());
  return `/catalogo?${params.toString()}`;
}
