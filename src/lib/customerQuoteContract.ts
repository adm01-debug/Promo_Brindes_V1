import type { QuoteItem } from '../types';
import { normalizeQuoteItems, UUID_PATTERN } from './quoteItems';

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SAFE_IMAGE_URL = /^(?:\/(?!\/)|https:\/\/(?![^/]*@))/i;
const STATUS_VALUES: CustomerQuoteStatus[] = ['new', 'triaged', 'in_progress', 'quoted', 'closed'];

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
  /** Contextos históricos só podem ser usados após normalização explícita. */
  campaign: unknown;
  briefing: unknown;
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

function invalid(): never {
  throw new Error('invalid_customer_quote_response');
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, min = 1): string {
  if (typeof value !== 'string') invalid();
  const result = value.trim();
  if (result.length < min || result.length > max) invalid();
  return result;
}

function nullableText(value: unknown, max: number): string | null {
  return value == null ? null : text(value, max);
}

function uuid(value: unknown): string {
  const result = text(value, 36, 36);
  if (!UUID_PATTERN.test(result)) invalid();
  return result;
}

export function isCustomerQuoteId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) invalid();
  return value;
}

function status(value: unknown): CustomerQuoteStatus {
  if (typeof value !== 'string' || !STATUS_VALUES.includes(value as CustomerQuoteStatus)) invalid();
  return value as CustomerQuoteStatus;
}

function instant(value: unknown): string {
  const result = text(value, 40, 20);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(result)) invalid();
  return result;
}

function calendarDate(value: unknown): string {
  const result = text(value, 10, 10);
  if (!DATE_PATTERN.test(result)) invalid();
  return result;
}

function nullableCalendarDate(value: unknown): string | null {
  return value == null ? null : calendarDate(value);
}

function imageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  if (!SAFE_IMAGE_URL.test(candidate)) return null;
  return candidate.split('#')[0]?.slice(0, 2_000) || null;
}

function stringList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems) invalid();
  return value.map((item) => text(item, maxItemLength));
}

function parseQuoteItems(value: unknown): QuoteItem[] {
  if (!Array.isArray(value) || value.length > 50) invalid();
  for (const candidate of value) {
    const raw = record(candidate);
    integer(raw.quantity, 1, 999_999);
    integer(raw.minQuantity, 1, 999_999);
    const decisionGroup = raw.decisionGroup;
    if (decisionGroup != null && decisionGroup !== 'primary' && decisionGroup !== 'alternative') invalid();
  }
  const items = normalizeQuoteItems(value);
  if (items.length !== value.length) invalid();
  return items;
}

function assertSummary(value: unknown): asserts value is CustomerQuoteSummary {
  const raw = record(value);
  uuid(raw.id);
  text(raw.protocol, 40);
  status(raw.status);
  text(raw.company, 160);
  nullableText(raw.actionName, 100);
  instant(raw.createdAt);
  if (raw.lastMovementAt != null) instant(raw.lastMovementAt);
  nullableCalendarDate(raw.desiredDeadline);
  integer(raw.itemCount, 0, 50);
  integer(raw.totalUnits, 0, 49_999_950);
  raw.productNames = stringList(raw.productNames, 50, 240);
  raw.productImages = stringList(raw.productImages ?? [], 50, 2_000)
    .map(imageUrl)
    .filter(Boolean) as string[];
}

function parseSummary(value: unknown): CustomerQuoteSummary {
  assertSummary(value);
  return value;
}

function assertEvent(value: unknown): asserts value is CustomerQuoteEvent {
  const raw = record(value);
  uuid(raw.id);
  text(raw.type, 80);
  if (raw.status != null) status(raw.status);
  text(raw.title, 160);
  nullableText(raw.description, 1_000);
  instant(raw.createdAt);
}

function parseEvent(value: unknown): CustomerQuoteEvent {
  assertEvent(value);
  return value;
}

function assertProposal(value: unknown): asserts value is CustomerProposal {
  const raw = record(value);
  if (typeof raw.isCurrent !== 'boolean') invalid();
  uuid(raw.id);
  integer(raw.version, 1, 10_000);
  text(raw.title, 160);
  nullableCalendarDate(raw.validUntil);
  instant(raw.publishedAt);
}

function parseProposal(value: unknown): CustomerProposal {
  assertProposal(value);
  return value;
}

/**
 * Fronteira de leitura das RPCs do portal. O Supabase gera `Json` para estas
 * funções; por isso o tipo TypeScript não prova o formato recebido em runtime.
 * Campanha e briefing são contextos opcionais/históricos e chegam opacos: cada
 * consumidor deve normalizá-los antes de usar. Itens, status e identificadores
 * são centrais ao pedido e falham fechados.
 */
export function parseCustomerQuotePage(value: unknown): CustomerQuotePage {
  const raw = record(value);
  if (!Array.isArray(raw.items) || raw.items.length > 50) invalid();
  return {
    items: raw.items.map(parseSummary),
    total: integer(raw.total, 0, 1_000_000),
    limit: integer(raw.limit, 1, 50),
    offset: integer(raw.offset, 0, 10_000),
  };
}

function assertDetail(value: unknown): asserts value is CustomerQuoteDetail {
  const raw = record(value);
  if (!Array.isArray(raw.events) || raw.events.length > 500
    || !Array.isArray(raw.proposals) || raw.proposals.length > 100) invalid();
  uuid(raw.id);
  text(raw.protocol, 40);
  status(raw.status);
  instant(raw.createdAt);
  instant(raw.submittedAt);
  text(raw.company, 160);
  text(raw.contactName, 160);
  text(raw.email, 160);
  text(raw.phone, 40);
  nullableText(raw.city, 160);
  nullableCalendarDate(raw.desiredDeadline);
  nullableText(raw.notes, 4_000);
  raw.items = parseQuoteItems(raw.items);
  raw.events = raw.events.map(parseEvent);
  raw.proposals = raw.proposals.map(parseProposal);
}

export function parseCustomerQuoteDetail(value: unknown): CustomerQuoteDetail | null {
  if (value == null) return null;
  assertDetail(value);
  return value;
}

export function parseCustomerQuoteAdjustmentResult(value: unknown): { id: string; createdAt: string } {
  const raw = record(value);
  return { id: uuid(raw.id), createdAt: instant(raw.createdAt) };
}
