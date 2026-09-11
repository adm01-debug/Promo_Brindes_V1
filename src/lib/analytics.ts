import { track } from '@vercel/analytics';
import type { BeforeSendEvent } from '@vercel/analytics/react';

export interface FunnelEventMap {
  search_started: { source: 'home' | 'catalog' | 'header'; query_length: number; suggestion: boolean };
  campaign_finder_completed: { moment: string; audience: string; scale: string; mood: string; choices: number };
  catalog_result_viewed: { result_count: number; page: number; active_filters: number; campaign: boolean };
  product_viewed: { product_id: string; category_id: string };
  product_saved: { product_id: string; category_id: string; has_color: boolean };
  selection_limit_reached: { item_count: number };
  product_shared: { product_id: string; mode: 'native' | 'copy' };
  comparison_changed: { item_count: number; action: 'added' | 'removed' | 'cleared' };
  catalog_library_filtered: { theme: string; has_query: boolean; result_count: number };
  catalog_collection_opened: { catalog_id: string; format: 'online' | 'pdf' | 'digital' };
  catalog_collection_shared: { catalog_id: string; format: 'online' | 'pdf' | 'digital' };
  catalog_briefing_started: { source: 'library' };
  briefing_started: { item_count: number };
  quote_submitted: { item_count: number; has_deadline: boolean };
  quote_submission_failed: { item_count: number; reason: 'network' | 'rate_limited' | 'conflict' | 'validation' | 'unknown' };
  selection_printed: { item_count: number };
  selection_shared: { item_count: number; mode: 'native' | 'copy' };
  faq_opened: { scope: 'catalog' | 'product' | 'quote'; question: string };
  customer_access_requested: { method: 'email' | 'password' | 'create' | 'recover' };
  customer_history_viewed: { result_count: number; has_filter: boolean };
  customer_quote_repeated: { item_count: number };
  customer_adjustment_requested: { item_count: number };
  customer_proposal_opened: { version: number };
  social_link_opened: { network: 'instagram' | 'facebook' | 'pinterest' | 'youtube' };
  occasion_filtered: { has_query: boolean; audience: 'todos' | 'clientes' | 'colaboradores' | 'eventos' | 'comunidade'; month: number; result_count: number };
  occasion_opened: { occasion_id: string; year: number };
  occasion_saved: { occasion_id: string; saved: boolean };
  occasion_shared: { occasion_id: string; mode: 'native' | 'copy' };
  occasion_exported: { occasion_id: string; type: 'occasion' | 'planning' };
  occasion_catalog_opened: { occasion_id: string; idea: string };
}

type FunnelEventName = keyof FunnelEventMap;

const ALLOWED_PROPERTIES: { [Name in FunnelEventName]: ReadonlyArray<keyof FunnelEventMap[Name]> } = {
  search_started: ['source', 'query_length', 'suggestion'],
  campaign_finder_completed: ['moment', 'audience', 'scale', 'mood', 'choices'],
  catalog_result_viewed: ['result_count', 'page', 'active_filters', 'campaign'],
  product_viewed: ['product_id', 'category_id'],
  product_saved: ['product_id', 'category_id', 'has_color'],
  selection_limit_reached: ['item_count'],
  product_shared: ['product_id', 'mode'],
  comparison_changed: ['item_count', 'action'],
  catalog_library_filtered: ['theme', 'has_query', 'result_count'],
  catalog_collection_opened: ['catalog_id', 'format'],
  catalog_collection_shared: ['catalog_id', 'format'],
  catalog_briefing_started: ['source'],
  briefing_started: ['item_count'],
  quote_submitted: ['item_count', 'has_deadline'],
  quote_submission_failed: ['item_count', 'reason'],
  selection_printed: ['item_count'],
  selection_shared: ['item_count', 'mode'],
  faq_opened: ['scope', 'question'],
  customer_access_requested: ['method'],
  customer_history_viewed: ['result_count', 'has_filter'],
  customer_quote_repeated: ['item_count'],
  customer_adjustment_requested: ['item_count'],
  customer_proposal_opened: ['version'],
  social_link_opened: ['network'],
  occasion_filtered: ['has_query', 'audience', 'month', 'result_count'],
  occasion_opened: ['occasion_id', 'year'],
  occasion_saved: ['occasion_id', 'saved'],
  occasion_shared: ['occasion_id', 'mode'],
  occasion_exported: ['occasion_id', 'type'],
  occasion_catalog_opened: ['occasion_id', 'idea'],
};

function safeProperties<Name extends FunnelEventName>(name: Name, properties: FunnelEventMap[Name]) {
  const source = properties as Record<string, unknown>;
  const safe: Record<string, string | number | boolean | null> = {};
  ALLOWED_PROPERTIES[name].forEach((key) => {
    const value = source[String(key)];
    if (typeof value === 'string') safe[String(key)] = value.slice(0, 80);
    else if (typeof value === 'number' && Number.isFinite(value)) safe[String(key)] = value;
    else if (typeof value === 'boolean' || value === null) safe[String(key)] = value;
  });
  return safe;
}

export function redactAnalyticsUrl(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url, typeof window === 'undefined' ? 'https://promo-brindes.invalid' : window.location.origin);
    // Pageviews podem ser coletados sem passar pelos eventos tipados. Rotas com
    // identificadores opacos continuam identificadores pessoais no contexto da
    // área do cliente, portanto só enviamos um template estável da rota.
    const pathname = /^\/minha-conta\/orcamentos\/[^/]+\/?$/i.test(url.pathname)
      ? '/minha-conta/orcamentos/:id'
      : url.pathname === '/selecoes/compartilhada'
        ? '/selecoes/compartilhada'
        : url.pathname;
    return { ...event, url: `${url.origin}${pathname}` };
  } catch {
    return null;
  }
}

export function trackFunnelEvent<Name extends FunnelEventName>(name: Name, properties: FunnelEventMap[Name]): void {
  try {
    const safe = safeProperties(name, properties);
    track(name, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('promo:analytics', { detail: { name, properties: safe } }));
    }
  } catch {
    // Telemetria nunca pode interromper a descoberta ou o envio do briefing.
  }
}
