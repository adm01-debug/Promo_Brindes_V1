import { siteSupabase } from './siteSupabase';
import {
  parseCustomerQuoteDetail,
  parseCustomerQuoteAdjustmentResult,
  parseCustomerQuotePage,
  isCustomerQuoteId,
  type CustomerProposal,
  type CustomerQuoteDetail,
  type CustomerQuotePage,
  type CustomerQuoteStatus,
} from './customerQuoteContract';
import { runSiteRpc } from './siteRpc';

export type { CustomerProposal, CustomerQuoteDetail, CustomerQuotePage, CustomerQuoteStatus } from './customerQuoteContract';

export interface CustomerAccessReport {
  profile: { displayName: string | null; company: string | null };
  counts: { quotes: number; selections: number; favorites: number; contacts: number };
}

export interface CustomerDataExport {
  exportedAt: string;
  email: string;
  profile: { displayName: string | null; company: string | null };
  quotes: CustomerQuoteDetail[];
  selections: unknown[];
  favorites: string[];
  contacts: unknown[];
  adjustments: unknown[];
  rights: Array<{ rightType: string; requestedAt: string }>;
}

export interface CustomerProfileCorrection {
  updated: boolean;
  displayName: string | null;
  company: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function customerPayloadIsObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000 ? Number(value) : Number.NaN;
}

function parseCustomerPayload<T>(data: unknown): T {
  if (!customerPayloadIsObject(data)) throw new Error('customer_area_unavailable');
  return data as unknown as T;
}

function localCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isProposalExpired(proposal: Pick<CustomerProposal, 'validUntil'>, today = localCalendarDate(new Date())): boolean {
  return Boolean(proposal.validUntil && proposal.validUntil < today);
}

export const customerStatusOptions: Array<{ value: '' | CustomerQuoteStatus; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'new', label: 'Recebida' },
  { value: 'triaged', label: 'Briefing em análise' },
  { value: 'in_progress', label: 'Curadoria em andamento' },
  { value: 'quoted', label: 'Proposta disponível' },
  { value: 'closed', label: 'Encerrada' },
];

export function customerStatusLabel(status: CustomerQuoteStatus): string {
  return customerStatusOptions.find((option) => option.value === status)?.label || 'Em acompanhamento';
}

export function customerStatusTone(status: CustomerQuoteStatus): 'new' | 'progress' | 'ready' | 'closed' {
  if (status === 'quoted') return 'ready';
  if (status === 'closed') return 'closed';
  if (status === 'triaged' || status === 'in_progress') return 'progress';
  return 'new';
}

function requireClient() {
  if (!siteSupabase) throw new Error('customer_area_not_configured');
  return siteSupabase;
}

function rpcError(error: { message?: string } | null): never {
  throw new Error(error?.message || 'customer_area_unavailable');
}

/** Mensagem devolvida quando a RPC recusa um 4º pedido de ajuste pendente. */
export const ADJUSTMENT_PENDING_LIMIT_MESSAGE =
  'Você já tem 3 pedidos de ajuste em análise neste orçamento. Assim que a nossa equipe responder um deles, você pode enviar outro. Se for urgente, fale com a gente pelo contato.';

export async function claimMyQuoteRequests(): Promise<number> {
  const { data, error } = await runSiteRpc(requireClient().rpc('claim_my_quote_requests'));
  if (error) rpcError(error);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('customer_area_unavailable');
  const claimed = (data as Record<string, unknown>).claimed;
  if (!Number.isInteger(claimed) || Number(claimed) < 0 || Number(claimed) > 1_000_000) throw new Error('customer_area_unavailable');
  return Number(claimed);
}

export async function fetchMyQuoteRequests(options: {
  limit?: number;
  offset?: number;
  status?: CustomerQuoteStatus | '';
  search?: string;
} = {}): Promise<CustomerQuotePage> {
  const { data, error } = await runSiteRpc(requireClient().rpc('get_my_quote_requests', {
    p_limit: options.limit ?? 20,
    p_offset: options.offset ?? 0,
    p_status: options.status || undefined,
    p_search: options.search?.trim().slice(0, 80) || undefined,
  }));
  if (error) rpcError(error);
  try {
    return parseCustomerQuotePage(data);
  } catch {
    throw new Error('customer_area_unavailable');
  }
}

export async function fetchMyQuoteRequest(id: string): Promise<CustomerQuoteDetail | null> {
  if (!isCustomerQuoteId(id)) return null;
  const { data, error } = await runSiteRpc(requireClient().rpc('get_my_quote_request', { p_request_id: id }));
  if (error) rpcError(error);
  try {
    return parseCustomerQuoteDetail(data);
  } catch {
    throw new Error('customer_area_unavailable');
  }
}

export async function requestMyQuoteAdjustment(requestId: string, message: string, clientRequestId: string): Promise<{ id: string; createdAt: string }> {
  if (!isCustomerQuoteId(requestId)) throw new Error('quote_not_found');
  const normalizedMessage = message.trim().slice(0, 800);
  if (normalizedMessage.length < 2) throw new Error('adjustment_message_required');
  const { data, error } = await runSiteRpc(requireClient().rpc('request_my_quote_adjustment', {
    p_request_id: requestId,
    p_message: normalizedMessage,
    p_client_request_id: clientRequestId,
  }));
  if (error) {
    if (error.message?.includes('too_many_pending_adjustments')) throw new Error(ADJUSTMENT_PENDING_LIMIT_MESSAGE);
    rpcError(error);
  }
  try {
    return parseCustomerQuoteAdjustmentResult(data);
  } catch {
    throw new Error('customer_area_unavailable');
  }
}

export async function fetchMyDataAccess(): Promise<CustomerAccessReport> {
  const { data, error } = await runSiteRpc(requireClient().rpc('get_my_data_access'));
  if (error) rpcError(error);
  const payload = parseCustomerPayload<CustomerAccessReport>(data);
  const counts = customerPayloadIsObject(payload.counts)
    ? { quotes: readCount(payload.counts.quotes), selections: readCount(payload.counts.selections), favorites: readCount(payload.counts.favorites), contacts: readCount(payload.counts.contacts) }
    : { quotes: Number.NaN, selections: Number.NaN, favorites: Number.NaN, contacts: Number.NaN };
  if (Number.isNaN(counts.quotes)) throw new Error('customer_area_unavailable');
  return {
    profile: customerPayloadIsObject(payload.profile)
      ? { displayName: typeof payload.profile.displayName === 'string' || payload.profile.displayName === null ? payload.profile.displayName : null, company: typeof payload.profile.company === 'string' || payload.profile.company === null ? payload.profile.company : null }
      : { displayName: null, company: null },
    counts,
  };
}

export async function exportMyData(): Promise<CustomerDataExport> {
  const { data, error } = await runSiteRpc(requireClient().rpc('export_my_data'));
  if (error) rpcError(error);
  const payload = parseCustomerPayload<CustomerDataExport>(data);
  if (typeof payload.exportedAt !== 'string' || !Array.isArray(payload.quotes) || !Array.isArray(payload.rights)) throw new Error('customer_area_unavailable');
  return payload;
}

export async function downloadMyData(): Promise<void> {
  const payload = await exportMyData();
  const filename = 'meus-dados-promo-brindes-' + new Date(payload.exportedAt).toISOString().slice(0, 10) + '.json';
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function correctMyData(displayName: string, company: string): Promise<CustomerProfileCorrection> {
  const normalizedName = displayName.trim().slice(0, 100);
  const normalizedCompany = company.trim().slice(0, 150);
  if (!normalizedName && !normalizedCompany) throw new Error('invalid_profile_fields');
  if (normalizedName.length > 0 && normalizedName.length < 2) throw new Error('invalid_profile_fields');
  if (normalizedCompany.length > 0 && normalizedCompany.length < 2) throw new Error('invalid_profile_fields');
  const { data, error } = await runSiteRpc(requireClient().rpc('correct_my_data', {
    p_display_name: normalizedName,
    p_company: normalizedCompany,
  }));
  if (error) rpcError(error);
  const payload = parseCustomerPayload<CustomerProfileCorrection>(data);
  if (payload.updated !== true) throw new Error('customer_area_unavailable');
  return payload;
}

export async function deleteMyData(confirmationEmail: string): Promise<string> {
  if (!EMAIL_PATTERN.test(confirmationEmail.trim())) throw new Error('invalid_email_confirmation');
  const { data, error } = await runSiteRpc(requireClient().rpc('delete_my_data'));
  if (error) rpcError(error);
  const payload = parseCustomerPayload<Record<string, unknown>>(data);
  const deleted = readCount(payload.authUsersDeleted);
  if (Number.isNaN(deleted)) throw new Error('customer_area_unavailable');
  return 'Seus dados foram apagados e esta conta foi encerrada. Obrigado por usar a Promo Brindes.';
}

export function sanitizeCustomerNextPath(value: string | null): string {
  return value?.startsWith('/minha-conta') && !value.startsWith('//') ? value : '/minha-conta';
}

/** Normaliza a paginação antes de ela virar uma consulta RPC ou URL compartilhada. */
export function normalizeCustomerHistoryPage(value: string | null, maximumPage = 834): number {
  const requested = Number(value);
  return Number.isInteger(requested) && requested >= 1 ? Math.min(maximumPage, requested) : 1;
}
