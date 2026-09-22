import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import { sendOperationalAlert } from './_lib/operationalAlerts.js';

export const REQUEST_TIMEOUT_MS = 10_000;
const RETENTION_BATCH_SIZE = 100;
const PROPOSAL_BUCKET = 'customer-proposals';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function matchesCronSecret(authorization: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function stringArray(value: unknown, max: number, valid: (item: string) => boolean): string[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('invalid_retention_candidates');
  const items = value.map((item) => String(item));
  if (items.some((item) => !valid(item))) throw new Error('invalid_retention_candidates');
  return Array.from(new Set(items));
}

function safeStoragePath(path: string): boolean {
  return path.length >= 2 && path.length <= 500 && !/(^|\/)\.\.($|\/)/.test(path);
}

async function rpc<T>(baseUrl: string, secretKey: string, name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const result = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!result.ok) throw new Error(`rpc_${name}_failed`);
  return result.json() as Promise<T>;
}

async function removeProposalObjects(baseUrl: string, secretKey: string, paths: string[], signal: AbortSignal): Promise<void> {
  if (!paths.length) return;
  const result = await fetch(`${baseUrl}/storage/v1/object/${PROPOSAL_BUCKET}`, {
    method: 'DELETE',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
    signal,
  });
  // A API de Storage é a autoridade para apagar blobs. Uma repetição após uma
  // falha de rede pode encontrar um objeto já removido; 404 é seguro para retry.
  if (!result.ok && result.status !== 404) throw new Error('storage_delete_failed');
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // A Vercel injeta CRON_SECRET automaticamente nas chamadas configuradas em vercel.json.
  // Não há segredo alternativo: uma única credencial reduz a superfície de acesso.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 32 || !matchesCronSecret(header(request, 'authorization'), cronSecret)) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const config = getSiteDatabaseConfig();
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const candidates = await rpc<{ quoteIds?: unknown; storagePaths?: unknown }>(
      config.url,
      config.serviceCredential,
      'get_site_data_retention_candidates',
      { p_batch_size: RETENTION_BATCH_SIZE },
      controller.signal,
    );
    const quoteIds = stringArray(candidates.quoteIds, RETENTION_BATCH_SIZE, (value) => UUID_PATTERN.test(value));
    const storagePaths = stringArray(candidates.storagePaths, RETENTION_BATCH_SIZE * 20, safeStoragePath);
    if (storagePaths.length && !config.storageDeleteCredential) throw new Error('storage_delete_credential_not_configured');
    await removeProposalObjects(config.url, config.storageDeleteCredential || '', storagePaths, controller.signal);
    const finalized = await rpc<Record<string, number>>(
      config.url,
      config.serviceCredential,
      'finalize_site_data_retention',
      { p_quote_ids: quoteIds, p_storage_paths: storagePaths, p_batch_size: RETENTION_BATCH_SIZE },
      controller.signal,
    );
    console.info('site_retention_completed', {
      quotesDeleted: Number(finalized.quotesDeleted || 0),
      proposalDocumentsDeleted: Number(finalized.proposalDocumentsDeleted || 0),
      contactsDeleted: Number(finalized.contactsDeleted || 0),
      notificationsDeleted: Number(finalized.notificationsDeleted || 0),
    });
    response.status(200).json({ ok: true });
  } catch (error) {
    logServerError('site_retention_failed', { errorClass: errorClass(error) });
    const alerted = await sendOperationalAlert('retention_cron_failed', { errorClass: errorClass(error) });
    if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) logServerWarning('site_retention_failure_alert_delivery_failed', {});
    response.status(503).json({ error: 'retention_unavailable' });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
