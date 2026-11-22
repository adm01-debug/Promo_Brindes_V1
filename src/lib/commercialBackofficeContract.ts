/**
 * Contrato do back-office comercial (F-03).
 *
 * As RPCs novas (`list_site_quote_requests`, `get_site_quote_request`,
 * `update_site_quote_status`, `reply_site_quote_adjustment`,
 * `publish_site_quote_proposal`) devolvem jsonb livre do PostgREST. Estes parsers
 * são a fronteira: nada do que vem da rede entra na UI sem passar por aqui, mesma
 * convenção de `customerQuoteContract.ts`.
 *
 * Os estados vêm da máquina de estados do banco
 * (`site_private.status_transitions`), não de uma lista duplicada no front. O
 * `allowedStatuses` devolvido por `get_site_quote_request` é a única fonte de
 * verdade para quais botões podem aparecer.
 */

export const SITE_QUOTE_STATUSES = ['new', 'triaged', 'in_progress', 'quoted', 'closed', 'spam'] as const;
export type SiteQuoteStatus = (typeof SITE_QUOTE_STATUSES)[number];

export const SITE_QUOTE_STATUS_LABELS: Record<SiteQuoteStatus, string> = {
  new: 'Nova',
  triaged: 'Triada',
  in_progress: 'Em curadoria',
  quoted: 'Proposta enviada',
  closed: 'Encerrada',
  spam: 'Spam',
};

export interface SiteQuoteListItem {
  id: string;
  protocol: string;
  status: SiteQuoteStatus;
  contactName: string;
  company: string;
  email: string;
  phone: string;
  city: string | null;
  desiredDeadline: string | null;
  createdAt: string;
  clientSubmittedAt: string;
  isClaimed: boolean;
  itemCount: number;
  pendingAdjustments: number;
  currentProposalVersion: number | null;
}

export interface SiteQuoteListPage {
  operator: string;
  total: number;
  limit: number;
  offset: number;
  requests: SiteQuoteListItem[];
}

export interface SiteQuoteItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  minQuantity: number | null;
  variantId: string | null;
  colorName: string | null;
  colorHex: string | null;
  decisionGroup: string | null;
}

export interface SiteQuoteEvent {
  id: string;
  type: string;
  status: SiteQuoteStatus | null;
  title: string;
  description: string | null;
  audience: 'customer' | 'internal';
  createdAt: string;
}

export interface SiteQuoteProposal {
  id: string;
  version: number;
  title: string;
  validUntil: string | null;
  publishedAt: string | null;
  supersededAt: string | null;
  isCurrent: boolean;
}

export interface SiteQuoteAdjustment {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteQuoteAuditEntry {
  action: string;
  actorLabel: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface SiteQuoteDetail {
  operator: string;
  id: string;
  protocol: string;
  status: SiteQuoteStatus;
  allowedStatuses: SiteQuoteStatus[];
  createdAt: string;
  submittedAt: string;
  contactName: string;
  company: string;
  email: string;
  phone: string;
  city: string | null;
  desiredDeadline: string | null;
  notes: string | null;
  pageUrl: string | null;
  isClaimed: boolean;
  campaign: unknown;
  briefing: unknown;
  items: SiteQuoteItem[];
  events: SiteQuoteEvent[];
  proposals: SiteQuoteProposal[];
  adjustments: SiteQuoteAdjustment[];
  audit: SiteQuoteAuditEntry[];
}

export interface SiteQuoteStatusChange {
  id: string;
  previousStatus: SiteQuoteStatus;
  status: SiteQuoteStatus;
}

export interface SiteQuoteProposalPublication {
  proposalId: string;
  version: number;
  status: SiteQuoteStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function readNullableCount(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function readStatus(value: unknown): SiteQuoteStatus {
  return readNullableStatus(value) ?? 'new';
}

/**
 * `allowedStatuses` alimenta os botões de mudança de estágio. Um valor fora da
 * máquina de estados não pode virar 'new' aqui: isso ofereceria ao operador um
 * botão que o servidor recusaria. Retorna null para o chamador filtrar.
 */
function readNullableStatus(value: unknown): SiteQuoteStatus | null {
  return typeof value === 'string' && (SITE_QUOTE_STATUSES as readonly string[]).includes(value)
    ? (value as SiteQuoteStatus)
    : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseListItem(value: unknown): SiteQuoteListItem {
  if (!isRecord(value)) throw new Error('commercial_backoffice_invalid_item');
  return {
    id: readString(value.id),
    protocol: readString(value.protocol),
    status: readStatus(value.status),
    contactName: readString(value.contactName),
    company: readString(value.company),
    email: readString(value.email),
    phone: readString(value.phone),
    city: readNullableString(value.city),
    desiredDeadline: readNullableString(value.desiredDeadline),
    createdAt: readString(value.createdAt),
    clientSubmittedAt: readString(value.submittedAt),
    isClaimed: value.isClaimed === true,
    itemCount: readCount(value.itemCount),
    pendingAdjustments: readCount(value.pendingAdjustments),
    currentProposalVersion: readNullableCount(value.currentProposalVersion),
  };
}

export function parseSiteQuoteListPage(data: unknown): SiteQuoteListPage {
  if (!isRecord(data)) throw new Error('commercial_backoffice_unavailable');
  return {
    operator: readString(data.operator),
    total: readCount(data.total),
    limit: readCount(data.limit),
    offset: readCount(data.offset),
    requests: readArray(data.requests).map(parseListItem),
  };
}

function parseItem(value: unknown): SiteQuoteItem {
  if (!isRecord(value)) throw new Error('commercial_backoffice_invalid_item_line');
  return {
    key: readString(value.key),
    productId: readString(value.productId),
    slug: readString(value.slug),
    name: readString(value.name),
    sku: readString(value.sku),
    imageUrl: readNullableString(value.imageUrl),
    quantity: readCount(value.quantity),
    minQuantity: readNullableCount(value.minQuantity),
    variantId: readNullableString(value.variantId),
    colorName: readNullableString(value.colorName),
    colorHex: readNullableString(value.colorHex),
    decisionGroup: readNullableString(value.decisionGroup),
  };
}

function parseEvent(value: unknown): SiteQuoteEvent {
  if (!isRecord(value)) throw new Error('commercial_backoffice_invalid_event');
  return {
    id: readString(value.id),
    type: readString(value.type),
    status: readNullableStatus(value.status),
    title: readString(value.title),
    description: readNullableString(value.description),
    audience: value.audience === 'internal' ? 'internal' : 'customer',
    createdAt: readString(value.createdAt),
  };
}

function parseProposal(value: unknown): SiteQuoteProposal {
  if (!isRecord(value)) throw new Error('commercial_backoffice_invalid_proposal');
  return {
    id: readString(value.id),
    version: readCount(value.version),
    title: readString(value.title),
    validUntil: readNullableString(value.validUntil),
    publishedAt: readNullableString(value.publishedAt),
    supersededAt: readNullableString(value.supersededAt),
    isCurrent: value.isCurrent === true,
  };
}

function parseAdjustment(value: unknown): SiteQuoteAdjustment {
  if (!isRecord(value)) throw new Error('commercial_backoffice_invalid_adjustment');
  return {
    id: readString(value.id),
    status: readString(value.status, 'new'),
    message: readString(value.message),
    createdAt: readString(value.createdAt),
    updatedAt: readString(value.updatedAt),
  };
}

function parseAuditEntry(value: unknown): SiteQuoteAuditEntry {
  if (!isRecord(value)) throw new Error('commercial_backoffice_invalid_audit');
  return {
    action: readString(value.action),
    actorLabel: readString(value.actorLabel),
    detail: isRecord(value.detail) ? value.detail : {},
    createdAt: readString(value.createdAt),
  };
}

export function parseSiteQuoteDetail(data: unknown): SiteQuoteDetail {
  if (!isRecord(data)) throw new Error('commercial_backoffice_unavailable');
  return {
    operator: readString(data.operator),
    id: readString(data.id),
    protocol: readString(data.protocol),
    status: readStatus(data.status),
    allowedStatuses: readArray(data.allowedStatuses)
      .map(readNullableStatus)
      .filter((value): value is SiteQuoteStatus => value !== null),
    createdAt: readString(data.createdAt),
    submittedAt: readString(data.submittedAt),
    contactName: readString(data.contactName),
    company: readString(data.company),
    email: readString(data.email),
    phone: readString(data.phone),
    city: readNullableString(data.city),
    desiredDeadline: readNullableString(data.desiredDeadline),
    notes: readNullableString(data.notes),
    pageUrl: readNullableString(data.pageUrl),
    isClaimed: data.isClaimed === true,
    campaign: data.campaign,
    briefing: data.briefing,
    items: readArray(data.items).map(parseItem),
    events: readArray(data.events).map(parseEvent),
    proposals: readArray(data.proposals).map(parseProposal),
    adjustments: readArray(data.adjustments).map(parseAdjustment),
    audit: readArray(data.audit).map(parseAuditEntry),
  };
}

export function parseSiteQuoteStatusChange(data: unknown): SiteQuoteStatusChange {
  if (!isRecord(data)) throw new Error('commercial_backoffice_invalid_status_change');
  return {
    id: readString(data.id),
    previousStatus: readStatus(data.previousStatus),
    status: readStatus(data.status),
  };
}

export function parseSiteQuoteProposalPublication(data: unknown): SiteQuoteProposalPublication {
  if (!isRecord(data)) throw new Error('commercial_backoffice_invalid_proposal_publication');
  return {
    proposalId: readString(data.proposalId),
    version: readCount(data.version),
    status: readStatus(data.status),
  };
}

/**
 * As RPCs recusam quem não está na allowlist com 42501. A UI precisa distinguir
 * "você não é operador" de "o banco caiu", senão o operador legítimo fica vendo
 * erro genérico quando o problema é só falta de cadastro.
 */
export function isSiteOperatorError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = readString(error.code);
  const message = readString(error.message);
  return code === '42501' || message.includes('not_a_site_operator') || message.includes('authentication_required');
}

/** O pedido mudou em outra aba: a UI recarrega o detalhe em vez de só exibir erro. */
export function isSiteQuoteConflict(error: unknown): boolean {
  return isRecord(error) && readString(error.message).includes('quote_request_changed_concurrently');
}

export function siteOperatorErrorMessage(error: unknown): string {
  if (!isRecord(error)) return 'Não foi possível falar com o servidor.';
  const message = readString(error.message);
  if (message.includes('not_a_site_operator')) return 'Sua conta não tem acesso ao back-office comercial.';
  if (message.includes('authentication_required')) return 'Entre com uma conta de operador para abrir o back-office.';
  if (message.includes('invalid_status_transition')) return 'Essa mudança de status não é permitida pela máquina de estados.';
  if (message.includes('proposal_requires_in_progress')) return 'Só é possível publicar proposta com o pedido em curadoria.';
  if (message.includes('quoted_requires_proposal_publication')) return 'Para marcar como "Proposta enviada", publique a proposta pelo formulário.';
  if (message.includes('invalid_storage_path')) return 'O caminho do PDF precisa ser pasta/arquivo.pdf dentro do bucket customer-proposals.';
  if (message.includes('quote_request_changed_concurrently')) return 'Outra pessoa alterou este pedido. Recarregue antes de continuar.';
  if (message.includes('quote_request_not_found')) return 'Pedido não encontrado.';
  if (message.includes('adjustment_not_found')) return 'Ajuste não encontrado.';
  return 'Não foi possível concluir a operação.';
}