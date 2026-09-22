import type { CampaignBrief, QuoteBriefingDetails, QuoteItem } from '../types';
import { siteSupabase } from './siteSupabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CustomerQuoteStatus = 'new' | 'triaged' | 'in_progress' | 'quoted' | 'closed';

export interface CustomerQuoteSummary {
  id: string;
  protocol: string;
  status: CustomerQuoteStatus;
  company: string;
  actionName?: string | null;
  createdAt: string;
  lastMovementAt?: string | null;
  desiredDeadline: string | null;
  itemCount: number;
  totalUnits: number;
  productNames: string[];
  productImages?: string[];
}

export interface CustomerQuoteEvent {
  id: string;
  type: string;
  status: CustomerQuoteStatus | null;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface CustomerProposal {
  id: string;
  version: number;
  title: string;
  validUntil: string | null;
  publishedAt: string;
  isCurrent: boolean;
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

export interface CustomerQuoteDetail {
  id: string;
  protocol: string;
  status: CustomerQuoteStatus;
  createdAt: string;
  submittedAt: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  city: string | null;
  desiredDeadline: string | null;
  notes: string | null;
  campaign: CampaignBrief | null;
  briefing: QuoteBriefingDetails | null;
  items: QuoteItem[];
  events: CustomerQuoteEvent[];
  proposals: CustomerProposal[];
}

export interface CustomerQuotePage {
  items: CustomerQuoteSummary[];
  total: number;
  limit: number;
  offset: number;
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
  return Number((data as { claimed?: unknown } | null)?.claimed || 0);
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
  const result = data as Partial<CustomerQuotePage> | null;
  return {
    items: Array.isArray(result?.items) ? result.items : [],
    total: Number(result?.total || 0),
    limit: Number(result?.limit || options.limit || 20),
    offset: Number(result?.offset || 0),
  };
}

export async function fetchMyQuoteRequest(id: string): Promise<CustomerQuoteDetail | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const { data, error } = await requireClient().rpc('get_my_quote_request', { p_request_id: id });
  if (error) rpcError(error);
  return data && typeof data === 'object' && !Array.isArray(data) ? data as unknown as CustomerQuoteDetail : null;
}

export async function requestMyQuoteAdjustment(requestId: string, message: string, clientRequestId: string): Promise<{ id: string; createdAt: string }> {
  if (!UUID_PATTERN.test(requestId)) throw new Error('quote_not_found');
  const normalizedMessage = message.trim().slice(0, 800);
  if (normalizedMessage.length < 2) throw new Error('adjustment_message_required');
  const { data, error } = await requireClient().rpc('request_my_quote_adjustment', {
    p_request_id: requestId,
    p_message: normalizedMessage,
    p_client_request_id: clientRequestId,
  });
  if (error) rpcError(error);
  const result = data as { id?: unknown; createdAt?: unknown } | null;
  if (typeof result?.id !== 'string' || typeof result.createdAt !== 'string') throw new Error('customer_area_unavailable');
  return { id: result.id, createdAt: result.createdAt };
}

export function sanitizeCustomerNextPath(value: string | null): string {
  return value?.startsWith('/minha-conta') && !value.startsWith('//') ? value : '/minha-conta';
}
