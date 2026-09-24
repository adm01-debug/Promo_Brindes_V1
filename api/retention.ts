import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import { sendOperationalAlert } from './_lib/operationalAlerts.js';

export const REQUEST_TIMEOUT_MS = 10_000;
const RETENTION_BATCH_SIZE = 100;
const PROPOSAL_BUCKET = 'customer-proposals';
const BRIEFING_ASSET_BUCKET = 'customer-briefing-assets';
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
  if (value.some((item) => typeof item !== 'string')) throw new Error('invalid_retention_candidates');
  const items = value;
  if (items.some((item) => !valid(item))) throw new Error('invalid_retention_candidates');
  return Array.from(new Set(items));
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function safeStoragePath(path: string): boolean {
  if (path.length < 2 || path.length > 500 || path.startsWith('/') || hasControlCharacter(path)) return false;
  return path.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
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

async function removeStorageObjects(baseUrl: string, secretKey: string, bucket: string, paths: string[], signal: AbortSignal): Promise<void> {
  if (!paths.length) return;
  if (![PROPOSAL_BUCKET, BRIEFING_ASSET_BUCKET].includes(bucket)) throw new Error('unsafe_storage_bucket');
  const result = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
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

type StorageDeletionObject = { bucket: typeof PROPOSAL_BUCKET | typeof BRIEFING_ASSET_BUCKET; path: string };

function storageDeletionObjects(value: unknown): StorageDeletionObject[] {
  if (!Array.isArray(value) || value.length > RETENTION_BATCH_SIZE) throw new Error('invalid_retention_candidates');
  const unique = new Map<string, StorageDeletionObject>();
  value.forEach((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('invalid_retention_candidates');
    const record = item as { bucket?: unknown; path?: unknown };
    if (![BRIEFING_ASSET_BUCKET, PROPOSAL_BUCKET].includes(String(record.bucket))
      || typeof record.path !== 'string' || !safeStoragePath(record.path)) {
      throw new Error('invalid_retention_candidates');
    }
    const object = { bucket: record.bucket, path: record.path } as StorageDeletionObject;
    unique.set(`${object.bucket}\0${object.path}`, object);
  });
  return Array.from(unique.values());
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
    await removeStorageObjects(config.url, config.storageDeleteCredential || '', PROPOSAL_BUCKET, storagePaths, controller.signal);
    const finalized = await rpc<Record<string, number>>(
      config.url,
      config.serviceCredential,
      'finalize_site_data_retention',
      { p_quote_ids: quoteIds, p_storage_paths: storagePaths, p_batch_size: RETENTION_BATCH_SIZE },
      controller.signal,
    );
    const archivedSelectionsDeleted = await rpc<number>(
      config.url,
      config.serviceCredential,
      'purge_archived_customer_selections',
      { p_batch_size: RETENTION_BATCH_SIZE },
      controller.signal,
    );
    const briefingCandidates = await rpc<{ objects?: unknown }>(
      config.url,
      config.serviceCredential,
      'get_briefing_asset_retention_candidates',
      { p_batch_size: RETENTION_BATCH_SIZE },
      controller.signal,
    );
    const storageObjects = storageDeletionObjects(briefingCandidates.objects);
    if (storageObjects.length && !config.storageDeleteCredential) throw new Error('storage_delete_credential_not_configured');
    for (const bucket of [BRIEFING_ASSET_BUCKET, PROPOSAL_BUCKET] as const) {
      const paths = storageObjects.filter((object) => object.bucket === bucket).map((object) => object.path);
      await removeStorageObjects(config.url, config.storageDeleteCredential || '', bucket, paths, controller.signal);
    }
    const storageFinalized = await rpc<{ assetsDeleted?: number; queueEntriesDeleted?: number }>(
      config.url,
      config.serviceCredential,
      'finalize_site_storage_retention',
      { p_objects: storageObjects, p_batch_size: RETENTION_BATCH_SIZE },
      controller.signal,
    );
    const auditLogsPurged = await rpc<{ writesDeleted?: number; ddlDeleted?: number }>(
      config.url,
      config.serviceCredential,
      'purge_site_admin_audit_logs',
      { p_retention_days: 400, p_batch_size: 1000 },
      controller.signal,
    );
    console.info('site_retention_completed', {
      quotesDeleted: Number(finalized.quotesDeleted || 0),
      proposalDocumentsDeleted: Number(finalized.proposalDocumentsDeleted || 0),
      contactsDeleted: Number(finalized.contactsDeleted || 0),
      notificationsDeleted: Number(finalized.notificationsDeleted || 0),
      archivedSelectionsDeleted: Number(archivedSelectionsDeleted || 0),
      briefingAssetsFinalized: Number(storageFinalized.assetsDeleted || 0),
      storageQueueEntriesFinalized: Number(storageFinalized.queueEntriesDeleted || 0),
      adminWriteAuditLogsPurged: Number(auditLogsPurged.writesDeleted || 0),
      adminDdlAuditLogsPurged: Number(auditLogsPurged.ddlDeleted || 0),
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
