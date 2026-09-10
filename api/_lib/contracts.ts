export type LeadKind = 'quote' | 'contact';

export interface NormalizedQuoteItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string;
  quantity: number;
  minQuantity: number;
  colorName?: string;
  colorHex?: string;
}

interface NormalizedConsent {
  accepted: true;
  noticeVersion: '2026-09-08';
  acceptedAt: string;
}

interface NormalizedCommon {
  submittedAt: string;
  pageUrl: string;
  clientRequestId: string;
  consent: NormalizedConsent;
}

interface NormalizedContactPayload extends NormalizedCommon {
  source: 'site-promo-brindes-contact';
  contact: { name: string; email: string; phone: string; message: string };
}

export interface NormalizedCampaignBrief {
  source: 'finder' | 'commemorative_date';
  moment?: 'onboarding' | 'evento' | 'relacionamento' | 'reconhecimento' | 'sazonal';
  audience?: 'clientes' | 'colaboradores' | 'lideranca' | 'parceiros' | 'publico-evento';
  scale?: 'ate-50' | '51-200' | '201-500' | '500-mais';
  mood?: 'util' | 'premium' | 'sustentavel' | 'tech' | 'afetivo' | 'divertido';
  occasion?: { id: string; name: string; date: string };
}

export interface NormalizedQuoteBriefing {
  actionName?: string;
  budgetRange?: 'ate-25' | '26-50' | '51-100' | '101-200' | 'acima-200' | 'a-definir';
  responseChannel?: 'whatsapp' | 'email' | 'telefone' | 'sem-preferencia';
  brandAssetStatus?: 'logo-pronto' | 'identidade-em-criacao' | 'preciso-de-ajuda';
}

export interface NormalizedQuotePayload extends NormalizedCommon {
  source: 'site-promo-brindes';
  contact: { name: string; company: string; email: string; phone: string; city: string; deadline: string; notes: string };
  items: NormalizedQuoteItem[];
  campaign?: NormalizedCampaignBrief;
  briefing?: NormalizedQuoteBriefing;
}

export type NormalizedLeadPayload = NormalizedQuotePayload | NormalizedContactPayload;

export class RequestValidationError extends Error {
  constructor(message: string, readonly status = 400, readonly code = 'invalid_request') {
    super(message);
  }
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(`O campo ${field} é inválido.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min: number, max: number, optional = false): string {
  if (value == null && optional) return '';
  if (typeof value !== 'string') throw new RequestValidationError(`O campo ${field} é inválido.`);
  const normalized = value.trim();
  if (optional && !normalized) return '';
  if (normalized.length < min || normalized.length > max) {
    throw new RequestValidationError(`O campo ${field} deve ter entre ${min} e ${max} caracteres.`);
  }
  return normalized;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new RequestValidationError(`O campo ${field} é inválido.`);
  return value;
}

function email(value: unknown): string {
  const normalized = text(value, 'e-mail', 5, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new RequestValidationError('Informe um e-mail válido.');
  }
  return normalized;
}

function phone(value: unknown, required: boolean): string {
  const normalized = text(value, 'telefone', required ? 10 : 0, 24, !required);
  if (normalized && !/^\+?[\d\s().-]+$/.test(normalized)) {
    throw new RequestValidationError('Informe um telefone válido.');
  }
  const digits = normalized.replace(/\D/g, '');
  if (normalized && (digits.length < 10 || digits.length > 15)) {
    throw new RequestValidationError('Informe um telefone com DDD válido.');
  }
  return normalized;
}

function isoInstant(value: unknown, field: string): string {
  const normalized = text(value, field, 20, 40);
  const instant = new Date(normalized);
  if (Number.isNaN(instant.getTime())) throw new RequestValidationError(`O campo ${field} é inválido.`);
  const difference = instant.getTime() - Date.now();
  if (difference > 10 * 60_000 || difference < -7 * 24 * 60 * 60_000) {
    throw new RequestValidationError(`O campo ${field} está fora da janela permitida.`);
  }
  return instant.toISOString();
}

function pageUrl(value: unknown): string {
  const normalized = text(value, 'pageUrl', 0, 500, true);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    const configuredOrigin = process.env.SITE_PUBLIC_ORIGIN?.trim();
    const allowedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : '';
    if (!allowedOrigin || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== allowedOrigin) throw new Error();
    parsed.username = '';
    parsed.password = '';
    parsed.hash = '';
    parsed.search = '';
    return parsed.href;
  } catch {
    throw new RequestValidationError('O campo pageUrl é inválido.');
  }
}

function deadline(value: unknown): string {
  const normalized = text(value, 'prazo', 0, 10, true);
  if (!normalized) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new RequestValidationError('O campo prazo é inválido.');
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new RequestValidationError('O campo prazo é inválido.');
  }
  if (normalized < new Date().toISOString().slice(0, 10)) {
    throw new RequestValidationError('O prazo não pode estar no passado.');
  }
  return normalized;
}

function validCalendarDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RequestValidationError(`O campo ${field} é inválido.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RequestValidationError(`O campo ${field} é inválido.`);
  }
  return value;
}

function optionalEnum<Value extends string>(value: unknown, field: string, values: readonly Value[]): Value | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || !values.includes(value as Value)) {
    throw new RequestValidationError(`O campo ${field} é inválido.`);
  }
  return value as Value;
}

function campaignBrief(value: unknown): NormalizedCampaignBrief | undefined {
  if (value == null) return undefined;
  const raw = object(value, 'campaign');
  const source = optionalEnum(raw.source, 'campaign.source', ['finder', 'commemorative_date'] as const);
  if (!source) throw new RequestValidationError('O campo campaign.source é inválido.');
  const moment = optionalEnum(raw.moment, 'campaign.moment', ['onboarding', 'evento', 'relacionamento', 'reconhecimento', 'sazonal'] as const);
  const audience = optionalEnum(raw.audience, 'campaign.audience', ['clientes', 'colaboradores', 'lideranca', 'parceiros', 'publico-evento'] as const);
  const scale = optionalEnum(raw.scale, 'campaign.scale', ['ate-50', '51-200', '201-500', '500-mais'] as const);
  const mood = optionalEnum(raw.mood, 'campaign.mood', ['util', 'premium', 'sustentavel', 'tech', 'afetivo', 'divertido'] as const);
  let occasion: NormalizedCampaignBrief['occasion'];
  if (raw.occasion != null) {
    const rawOccasion = object(raw.occasion, 'campaign.occasion');
    const id = text(rawOccasion.id, 'campaign.occasion.id', 2, 80);
    if (!/^[a-z0-9-]+$/i.test(id)) throw new RequestValidationError('O campo campaign.occasion.id é inválido.');
    occasion = {
      id,
      name: text(rawOccasion.name, 'campaign.occasion.name', 1, 120),
      date: validCalendarDate(text(rawOccasion.date, 'campaign.occasion.date', 10, 10), 'campaign.occasion.date'),
    };
  }
  if (!moment && !audience && !scale && !mood && !occasion) {
    throw new RequestValidationError('O contexto da campanha está vazio.');
  }
  return { source, moment, audience, scale, mood, occasion };
}

function quoteBriefing(value: unknown): NormalizedQuoteBriefing | undefined {
  if (value == null) return undefined;
  const raw = object(value, 'briefing');
  const actionName = text(raw.actionName, 'briefing.actionName', 0, 100, true) || undefined;
  const budgetRange = optionalEnum(raw.budgetRange, 'briefing.budgetRange', ['ate-25', '26-50', '51-100', '101-200', 'acima-200', 'a-definir'] as const);
  const responseChannel = optionalEnum(raw.responseChannel, 'briefing.responseChannel', ['whatsapp', 'email', 'telefone', 'sem-preferencia'] as const);
  const brandAssetStatus = optionalEnum(raw.brandAssetStatus, 'briefing.brandAssetStatus', ['logo-pronto', 'identidade-em-criacao', 'preciso-de-ajuda'] as const);
  if (!actionName && !budgetRange && !responseChannel && !brandAssetStatus) {
    throw new RequestValidationError('O complemento do briefing está vazio.');
  }
  return { actionName, budgetRange, responseChannel, brandAssetStatus };
}

function imageUrl(value: unknown, field: string): string {
  const normalized = text(value, field, 0, 1000, true);
  if (!normalized || normalized.startsWith('/')) return normalized;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
    parsed.hash = '';
    return parsed.href;
  } catch {
    throw new RequestValidationError(`O campo ${field} é inválido.`);
  }
}

function colorHex(value: unknown, field: string): string {
  const normalized = text(value, field, 0, 32, true);
  if (normalized && !/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(normalized)) {
    throw new RequestValidationError(`O campo ${field} é inválido.`);
  }
  return normalized;
}

function clientRequestId(value: unknown): string {
  const normalized = text(value, 'clientRequestId', 8, 100);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:._-]*$/.test(normalized)) {
    throw new RequestValidationError('O campo clientRequestId é inválido.');
  }
  return normalized;
}

function consent(value: unknown, submittedAt: string) {
  const receipt = object(value, 'consent');
  if (!boolean(receipt.accepted, 'consent.accepted')) {
    throw new RequestValidationError('O consentimento de privacidade é obrigatório.', 422, 'consent_required');
  }
  if (receipt.noticeVersion !== '2026-09-08') {
    throw new RequestValidationError('A versão do aviso de privacidade é inválida.');
  }
  const acceptedAt = isoInstant(receipt.acceptedAt, 'consent.acceptedAt');
  const submittedTime = new Date(submittedAt).getTime();
  if (Math.abs(new Date(acceptedAt).getTime() - submittedTime) > 5 * 60_000) {
    throw new RequestValidationError('O instante do consentimento não corresponde ao envio.');
  }
  return { accepted: true as const, noticeVersion: '2026-09-08' as const, acceptedAt };
}

function integer(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new RequestValidationError(`O campo ${field} é inválido.`);
  }
  return value;
}

function quoteItem(value: unknown, index: number): NormalizedQuoteItem {
  const item = object(value, `items[${index}]`);
  const productId = text(item.productId, `items[${index}].productId`, 8, 100);
  if (!/^[a-zA-Z0-9-]+$/.test(productId)) throw new RequestValidationError(`O produto ${index + 1} é inválido.`);
  const quantity = integer(item.quantity, `items[${index}].quantity`, 1, 999_999);
  const minQuantity = integer(item.minQuantity, `items[${index}].minQuantity`, 1, 999_999);
  if (quantity < minQuantity) throw new RequestValidationError(`A quantidade do produto ${index + 1} está abaixo do mínimo.`);
  return {
    key: text(item.key, `items[${index}].key`, 1, 220),
    productId,
    slug: text(item.slug, `items[${index}].slug`, 1, 180),
    name: text(item.name, `items[${index}].name`, 1, 240),
    sku: text(item.sku, `items[${index}].sku`, 1, 120),
    imageUrl: imageUrl(item.imageUrl, `items[${index}].imageUrl`),
    quantity,
    minQuantity,
    colorName: text(item.colorName, `items[${index}].colorName`, 0, 120, true) || undefined,
    colorHex: colorHex(item.colorHex, `items[${index}].colorHex`) || undefined,
  };
}

export function normalizeLeadPayload(kind: LeadKind, body: unknown): NormalizedLeadPayload {
  const payload = object(body, 'payload');
  const contact = object(payload.contact, 'contact');
  const submittedAt = isoInstant(payload.submittedAt, 'submittedAt');
  const common = {
    submittedAt,
    pageUrl: pageUrl(payload.pageUrl),
    clientRequestId: clientRequestId(payload.clientRequestId),
    consent: consent(payload.consent, submittedAt),
  };

  if (kind === 'contact') {
    if (payload.source !== 'site-promo-brindes-contact') throw new RequestValidationError('A origem da solicitação é inválida.');
    return {
      ...common,
      source: 'site-promo-brindes-contact',
      contact: {
        name: text(contact.name, 'nome', 2, 100),
        email: email(contact.email),
        phone: phone(contact.phone, false),
        message: text(contact.message, 'mensagem', 0, 800, true),
      },
    };
  }

  if (payload.source !== 'site-promo-brindes') throw new RequestValidationError('A origem da solicitação é inválida.');
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50) {
    throw new RequestValidationError('O orçamento deve conter entre 1 e 50 produtos.');
  }
  return {
    ...common,
    source: 'site-promo-brindes',
    contact: {
      name: text(contact.name, 'nome', 2, 100),
      company: text(contact.company, 'empresa', 2, 150),
      email: email(contact.email),
      phone: phone(contact.phone, true),
      city: text(contact.city, 'cidade', 0, 100, true),
      deadline: deadline(contact.deadline),
      notes: text(contact.notes, 'observações', 0, 800, true),
    },
    items: payload.items.map(quoteItem),
    campaign: campaignBrief(payload.campaign),
    briefing: quoteBriefing(payload.briefing),
  };
}
