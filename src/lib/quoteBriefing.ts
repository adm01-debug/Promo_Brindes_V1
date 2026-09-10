import type { QuoteBriefingDetails, QuoteBriefingForm } from '../types';

const budgetRanges = new Set<NonNullable<QuoteBriefingDetails['budgetRange']>>([
  'ate-25', '26-50', '51-100', '101-200', 'acima-200', 'a-definir',
]);
const responseChannels = new Set<NonNullable<QuoteBriefingDetails['responseChannel']>>([
  'whatsapp', 'email', 'telefone', 'sem-preferencia',
]);
const brandAssetStatuses = new Set<NonNullable<QuoteBriefingDetails['brandAssetStatus']>>([
  'logo-pronto', 'identidade-em-criacao', 'preciso-de-ajuda',
]);

export const EMPTY_QUOTE_BRIEFING: QuoteBriefingForm = {
  actionName: '',
  budgetRange: '',
  responseChannel: '',
  brandAssetStatus: '',
};

export const quoteBriefingLabels = {
  budgetRange: {
    'ate-25': 'Até R$ 25 por pessoa',
    '26-50': 'De R$ 26 a R$ 50 por pessoa',
    '51-100': 'De R$ 51 a R$ 100 por pessoa',
    '101-200': 'De R$ 101 a R$ 200 por pessoa',
    'acima-200': 'Acima de R$ 200 por pessoa',
    'a-definir': 'Verba a definir',
  },
  responseChannel: {
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    telefone: 'Telefone',
    'sem-preferencia': 'Sem preferência',
  },
  brandAssetStatus: {
    'logo-pronto': 'Logo pronto para compartilhar',
    'identidade-em-criacao': 'Identidade visual em criação',
    'preciso-de-ajuda': 'Preciso de ajuda com o direcionamento visual',
  },
} as const;

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().slice(0, max);
  return normalized || undefined;
}

function optionalValue<Value extends string>(value: unknown, values: Set<Value>): Value | undefined {
  return typeof value === 'string' && values.has(value as Value) ? value as Value : undefined;
}

/** Sanitiza o contexto opcional antes de ele sair do navegador. */
export function normalizeQuoteBriefing(value: unknown): QuoteBriefingDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const result: QuoteBriefingDetails = {
    actionName: optionalText(raw.actionName, 100),
    budgetRange: optionalValue(raw.budgetRange, budgetRanges),
    responseChannel: optionalValue(raw.responseChannel, responseChannels),
    brandAssetStatus: optionalValue(raw.brandAssetStatus, brandAssetStatuses),
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

export function quoteBriefingForm(value: unknown): QuoteBriefingForm {
  const normalized = normalizeQuoteBriefing(value);
  return {
    actionName: normalized?.actionName || '',
    budgetRange: normalized?.budgetRange || '',
    responseChannel: normalized?.responseChannel || '',
    brandAssetStatus: normalized?.brandAssetStatus || '',
  };
}

export function quoteBriefingSummary(briefing?: QuoteBriefingDetails): string[] {
  if (!briefing) return [];
  return [
    briefing.actionName ? `Ação: ${briefing.actionName}` : '',
    briefing.budgetRange ? quoteBriefingLabels.budgetRange[briefing.budgetRange] : '',
    briefing.responseChannel ? `Contato por ${quoteBriefingLabels.responseChannel[briefing.responseChannel]}` : '',
    briefing.brandAssetStatus ? quoteBriefingLabels.brandAssetStatus[briefing.brandAssetStatus] : '',
  ].filter(Boolean);
}
