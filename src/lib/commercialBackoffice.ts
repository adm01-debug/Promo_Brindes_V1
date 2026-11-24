/**
 * Camada de dados do back-office comercial (F-03).
 *
 * Todas as chamadas passam por `runSiteRpc`, que já impõe deadline real (12 s) —
 * o back-office não pode ficar com spinner pendurado se o PostgREST travar.
 *
 * Nada aqui decide autorização: quem é operador é decidido por
 * `site_private.assert_site_operator()` no banco. O front só reage ao 42501.
 */
import { siteSupabase } from './siteSupabase';
import { runSiteRpc } from './siteRpc';
import {
  parseSiteNotificationBacklogCut,
  parseSiteNotificationDeliveryReport,
  parseSiteNotificationReprocessingResult,
  parseSiteQuoteDetail,
  parseSiteQuoteListPage,
  parseSiteQuoteProposalPublication,
  parseSiteQuoteStatusChange,
  type SiteNotificationBacklogCut,
  type SiteNotificationDeliveryReport,
  type SiteNotificationReprocessingResult,
  type SiteQuoteDetail,
  type SiteQuoteListPage,
  type SiteQuoteProposalPublication,
  type SiteQuoteStatus,
  type SiteQuoteStatusChange,
} from './commercialBackofficeContract';

function siteClient() {
  if (!siteSupabase) throw new Error('commercial_backoffice_unavailable');
  return siteSupabase;
}

export interface SiteQuoteListQuery {
  status?: SiteQuoteStatus | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export async function listSiteQuoteRequests(query: SiteQuoteListQuery = {}): Promise<SiteQuoteListPage> {
  const { data, error } = await runSiteRpc(
    siteClient().rpc('list_site_quote_requests', {
      p_status: query.status ?? undefined,
      p_search: query.search?.trim() ? query.search.trim() : undefined,
      p_limit: query.limit ?? 25,
      p_offset: query.offset ?? 0,
    }),
  );
  if (error) throw error;
  return parseSiteQuoteListPage(data);
}

export async function fetchSiteQuoteDetail(requestId: string): Promise<SiteQuoteDetail> {
  const { data, error } = await runSiteRpc(siteClient().rpc('get_site_quote_request', { p_request_id: requestId }));
  if (error) throw error;
  return parseSiteQuoteDetail(data);
}

export async function updateSiteQuoteStatus(
  requestId: string,
  status: SiteQuoteStatus,
): Promise<SiteQuoteStatusChange> {
  const { data, error } = await runSiteRpc(
    siteClient().rpc('update_site_quote_status', { p_request_id: requestId, p_status: status }),
  );
  if (error) throw error;
  return parseSiteQuoteStatusChange(data);
}

export async function cancelNotificationBacklog(reason: string): Promise<SiteNotificationBacklogCut> {
  const { data, error } = await runSiteRpc(
    siteClient().rpc('cancel_site_notification_backlog', { p_reason: reason.trim() }),
  );
  if (error) throw error;
  return parseSiteNotificationBacklogCut(data);
}

export async function replySiteQuoteAdjustment(
  adjustmentId: string,
  response: string,
  status: 'triaged' | 'resolved' | 'closed' = 'resolved',
): Promise<void> {
  const { error } = await runSiteRpc(
    siteClient().rpc('reply_site_quote_adjustment', {
      p_adjustment_id: adjustmentId,
      p_response: response,
      p_status: status,
    }),
  );
  if (error) throw error;
}

export async function publishSiteQuoteProposal(input: {
  requestId: string;
  title: string;
  storagePath: string;
  validUntil?: string | null;
}): Promise<SiteQuoteProposalPublication> {
  const { data, error } = await runSiteRpc(
    siteClient().rpc('publish_site_quote_proposal', {
      p_request_id: input.requestId,
      p_title: input.title,
      p_storage_path: input.storagePath,
      p_valid_until: input.validUntil ?? undefined,
    }),
  );
  if (error) throw error;
  return parseSiteQuoteProposalPublication(data);
}

/**
 * F-12: fila operacional (entregas esgotadas + eventos órfãos). Exige operador;
 * o 42501 é tratado pelo mesmo caminho do restante do back-office.
 */
export async function fetchSiteNotificationDeliveryReport(
  limit = 50,
): Promise<SiteNotificationDeliveryReport> {
  const { data, error } = await runSiteRpc(
    siteClient().rpc('get_site_notification_delivery_report', { p_limit: limit }),
  );
  if (error) throw error;
  return parseSiteNotificationDeliveryReport(data);
}

/**
 * F-12: reabre entregas esgotadas. O motivo é obrigatório porque ele é anexado ao
 * registro de auditoria — sem motivo, o reprocessamento vira alteração anônima.
 */
export async function reprocessSiteNotificationDeliveries(
  deliveryIds: string[],
  reason: string,
): Promise<SiteNotificationReprocessingResult> {
  const { data, error } = await runSiteRpc(
    siteClient().rpc('reprocess_site_notification_deliveries', {
      p_delivery_ids: deliveryIds,
      p_reason: reason.trim(),
    }),
  );
  if (error) throw error;
  return parseSiteNotificationReprocessingResult(data);
}