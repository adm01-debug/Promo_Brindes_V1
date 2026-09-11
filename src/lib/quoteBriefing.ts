import type { QuoteBriefingDetails, QuoteBriefingForm } from '../types';

const budgetRanges = new Set<NonNullable<QuoteBriefingDetails['budgetRange']>>([
  'ate-25', '26-50', '51-100', '101-200', 'acima-200', 'a-definir',
]);
const budgetScopes = new Set<NonNullable<QuoteBriefingDetails['budgetScope']>>(['por-pessoa', 'total']);
const deadlineFlexibilities = new Set<NonNullable<QuoteBriefingDetails['deadlineFlexibility']>>(['flexivel', 'data-fixa']);
const responseChannels = new Set<NonNullable<QuoteBriefingDetails['responseChannel']>>([
  'whatsapp', 'email', 'telefone', 'sem-preferencia',
]);
const brandAssetStatuses = new Set<NonNullable<QuoteBriefingDetails['brandAssetStatus']>>([
  'logo-pronto', 'identidade-em-criacao', 'preciso-de-ajuda',
]);

export const EMPTY_QUOTE_BRIEFING: QuoteBriefingForm = {
  actionName: '',
  budgetRange: '',
  budgetScope: '',
  eventDate: '',
  deadlineFlexibility: '',
  responseChannel: '',
  brandAssetStatus: '',
};

export const quoteBriefingLabels = {
  budgetRange: {
    'ate-25': 'Até R$ 25',
    '26-50': 'De R$ 26 a R$ 50',
    '51-100': 'De R$ 51 a R$ 100',
    '101-200': 'De R$ 101 a R$ 200',
    'acima-200': 'Acima de R$ 200',
    'a-definir': 'Verba a definir',
  },
  budgetScope: {
    'por-pessoa': 'por pessoa',
    total: 'no total da ação',
  },
  deadlineFlexibility: {
    flexivel: 'Recebimento com data flexível',
    'data-fixa': 'Recebimento em data fixa',
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

function optionalDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

function localizedDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'long' }).format(new Date(`${value}T12:00:00.000Z`));
}

/** Sanitiza o contexto opcional antes de ele sair do navegador. */
export function normalizeQuoteBriefing(value: unknown): QuoteBriefingDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const result: QuoteBriefingDetails = {
    actionName: optionalText(raw.actionName, 100),
    budgetRange: optionalValue(raw.budgetRange, budgetRanges),
    budgetScope: optionalValue(raw.budgetScope, budgetScopes),
    eventDate: optionalDate(raw.eventDate),
    deadlineFlexibility: optionalValue(raw.deadlineFlexibility, deadlineFlexibilities),
    responseChannel: optionalValue(raw.responseChannel, responseChannels),
    brandAssetStatus: optionalValue(raw.brandAssetStatus, brandAssetStatuses),
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

/** Mantém o contexto útil sem transformar faixas de investimento em preço final. */
export function validateQuoteBriefing(value: QuoteBriefingForm, desiredDeadline?: string): string | null {
  const normalized = normalizeQuoteBriefing(value);
  if (!normalized) return null;
  if (normalized.budgetRange && normalized.budgetRange !== 'a-definir' && !normalized.budgetScope) {
    return 'Informe se a faixa de investimento é por pessoa ou para o total da ação.';
  }
  if (normalized.budgetScope && !normalized.budgetRange) {
    return 'Escolha também uma faixa de investimento ou deixe os dois campos para conversar com nosso time de especialistas.';
  }
  if (normalized.eventDate && desiredDeadline && desiredDeadline > normalized.eventDate) {
    return 'A data de recebimento não pode ficar depois da data do evento.';
  }
  return null;
}

export function quoteBriefingForm(value: unknown): QuoteBriefingForm {
  const normalized = normalizeQuoteBriefing(value);
  return {
    actionName: normalized?.actionName || '',
    budgetRange: normalized?.budgetRange || '',
    budgetScope: normalized?.budgetScope || '',
    eventDate: normalized?.eventDate || '',
    deadlineFlexibility: normalized?.deadlineFlexibility || '',
    responseChannel: normalized?.responseChannel || '',
    brandAssetStatus: normalized?.brandAssetStatus || '',
  };
}

export function quoteBriefingSummary(briefing?: QuoteBriefingDetails): string[] {
  if (!briefing) return [];
  return [
    briefing.actionName ? `Ação: ${briefing.actionName}` : '',
    briefing.budgetRange ? `${quoteBriefingLabels.budgetRange[briefing.budgetRange]}${briefing.budgetScope ? ` ${quoteBriefingLabels.budgetScope[briefing.budgetScope]}` : ''}` : '',
    briefing.eventDate ? `Evento em ${localizedDate(briefing.eventDate)}` : '',
    briefing.deadlineFlexibility ? quoteBriefingLabels.deadlineFlexibility[briefing.deadlineFlexibility] : '',
    briefing.responseChannel ? `Contato por ${quoteBriefingLabels.responseChannel[briefing.responseChannel]}` : '',
    briefing.brandAssetStatus ? quoteBriefingLabels.brandAssetStatus[briefing.brandAssetStatus] : '',
  ].filter(Boolean);
}
