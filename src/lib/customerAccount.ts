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

export type { CustomerProposal, CustomerQuoteDetail, CustomerQuotePage, CustomerQuoteStatus } from './customerQuoteContract';

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

export async function claimMyQuoteRequests(): Promise<number> {
  const { data, error } = await requireClient().rpc('claim_my_quote_requests');
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
  const { data, error } = await requireClient().rpc('get_my_quote_requests', {
    p_limit: options.limit ?? 20,
    p_offset: options.offset ?? 0,
    p_status: options.status || undefined,
    p_search: options.search?.trim().slice(0, 80) || undefined,
  });
  if (error) rpcError(error);
  try {
    return parseCustomerQuotePage(data);
  } catch {
    throw new Error('customer_area_unavailable');
  }
}

export async function fetchMyQuoteRequest(id: string): Promise<CustomerQuoteDetail | null> {
  if (!isCustomerQuoteId(id)) return null;
  const { data, error } = await requireClient().rpc('get_my_quote_request', { p_request_id: id });
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
  const { data, error } = await requireClient().rpc('request_my_quote_adjustment', {
    p_request_id: requestId,
    p_message: normalizedMessage,
    p_client_request_id: clientRequestId,
  });
  if (error) rpcError(error);
  try {
    return parseCustomerQuoteAdjustmentResult(data);
  } catch {
    throw new Error('customer_area_unavailable');
  }
}

export function sanitizeCustomerNextPath(value: string | null): string {
  return value?.startsWith('/minha-conta') && !value.startsWith('//') ? value : '/minha-conta';
}
