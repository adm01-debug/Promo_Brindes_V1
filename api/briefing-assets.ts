import { matchesDeclaredFileSignature, readSignaturePrefix } from './_lib/fileSignatures.js';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { allowedSiteOrigins } from './_lib/siteOrigin.js';

export const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 4 * 1024;
const BUCKET = 'customer-briefing-assets';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:png|jpg|webp|pdf)$/i;

interface VerificationCandidate {
  id?: unknown;
  bucket?: unknown;
  path?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  verifiedAt?: unknown;
}

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function assetIdFrom(request: ApiRequest): string | null {
  if (header(request, 'content-type').split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') return null;
  try {
    const serialized = JSON.stringify(request.body ?? null);
    if (!serialized || Buffer.byteLength(serialized) > MAX_BODY_BYTES) return null;
    const parsed = JSON.parse(serialized) as { assetId?: unknown };
    const assetId = typeof parsed?.assetId === 'string' ? parsed.assetId : '';
    return UUID_PATTERN.test(assetId) ? assetId : null;
  } catch {
    return null;
  }
}

function serviceHeaders(credential: string): Record<string, string> {
  return { apikey: credential, Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

function userHeaders(apiKey: string, authorization: string): Record<string, string> {
  return { apikey: apiKey, Authorization: authorization, 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function removeRejectedAsset(baseUrl: string, secret: string, authorization: string, path: string, assetId: string, signal: AbortSignal) {
  await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(BUCKET)}`, {
    method: 'DELETE', headers: serviceHeaders(secret), body: JSON.stringify({ prefixes: [path] }), signal,
  }).catch(() => undefined);
  await fetch(`${baseUrl}/rest/v1/rpc/delete_my_briefing_asset`, {
    method: 'POST', headers: userHeaders(secret, authorization), body: JSON.stringify({ p_id: assetId }), signal,
  }).catch(() => undefined);
}

async function readStoredSignature(baseUrl: string, credential: string, path: string, signal: AbortSignal): Promise<Uint8Array | null> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const object = await fetch(`${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(BUCKET)}/${encodedPath}`, {
    headers: { apikey: credential, Authorization: `Bearer ${credential}`, Range: 'bytes=0-1023' },
    signal,
  });
  return object.ok ? readSignaturePrefix(object) : null;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'method_not_allowed', message: 'Método não permitido.' });
    return;
  }
  if (!allowedSiteOrigins().has(header(request, 'origin'))) {
    response.status(403).json({ error: 'origin_not_allowed', message: 'Origem não autorizada.' });
    return;
  }
  const authorization = header(request, 'authorization');
  if (!/^Bearer [A-Za-z0-9._-]{20,4000}$/.test(authorization)) {
    response.status(401).json({ error: 'authentication_required', message: 'Sua sessão expirou. Entre novamente.' });
    return;
  }
  const assetId = assetIdFrom(request);
  if (!assetId) {
    response.status(400).json({ error: 'invalid_briefing_asset', message: 'Arquivo inválido.' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const config = getSiteDatabaseConfig();
    if (!config.storageDeleteCredential) throw new Error('storage_credential_missing');
    const lookup = await fetch(`${config.url}/rest/v1/rpc/get_my_briefing_asset_verification`, {
      method: 'POST', headers: userHeaders(config.serviceCredential, authorization), body: JSON.stringify({ p_id: assetId }), signal: controller.signal,
    });
    const candidate = await lookup.json().catch(() => null) as VerificationCandidate | null;
    if (lookup.status === 401 || lookup.status === 403) {
      response.status(401).json({ error: 'authentication_required', message: 'Sua sessão expirou. Entre novamente.' });
      return;
    }
    if (!lookup.ok || candidate?.id !== assetId || candidate.bucket !== BUCKET
      || typeof candidate.path !== 'string' || !SAFE_PATH.test(candidate.path)
      || typeof candidate.mimeType !== 'string' || !Number.isInteger(candidate.sizeBytes)) {
      response.status(404).json({ error: 'briefing_asset_not_found', message: 'Arquivo não encontrado.' });
      return;
    }
    if (typeof candidate.verifiedAt === 'string' && !Number.isNaN(Date.parse(candidate.verifiedAt))) {
      response.status(200).json({ verifiedAt: candidate.verifiedAt });
      return;
    }

    const prefix = await readStoredSignature(config.url, config.storageDeleteCredential, candidate.path, controller.signal);
    if (!prefix) {
      response.status(409).json({ error: 'briefing_asset_upload_incomplete', message: 'A transferência ainda não foi confirmada. Tente enviar novamente.' });
      return;
    }
    if (!matchesDeclaredFileSignature(candidate.mimeType, prefix)) {
      await removeRejectedAsset(config.url, config.storageDeleteCredential, authorization, candidate.path, assetId, controller.signal);
      response.status(422).json({ error: 'briefing_asset_signature_mismatch', message: 'O conteúdo do arquivo não corresponde ao formato informado.' });
      return;
    }

    const confirmed = await fetch(`${config.url}/rest/v1/rpc/confirm_site_briefing_asset_verification`, {
      method: 'POST', headers: serviceHeaders(config.serviceCredential), body: JSON.stringify({
        p_id: assetId,
        p_storage_path: candidate.path,
        p_mime_type: candidate.mimeType,
        p_size_bytes: candidate.sizeBytes,
      }), signal: controller.signal,
    });
    const verifiedAt = await confirmed.json().catch(() => null) as string | null;
    if (!confirmed.ok || typeof verifiedAt !== 'string' || Number.isNaN(Date.parse(verifiedAt))) throw new Error('verification_confirmation_failed');

    // A confirmação torna o objeto imutável para o titular. Uma segunda leitura
    // fecha a janela entre a primeira inspeção e esse bloqueio (TOCTOU).
    const lockedPrefix = await readStoredSignature(config.url, config.storageDeleteCredential, candidate.path, controller.signal);
    if (!lockedPrefix || !matchesDeclaredFileSignature(candidate.mimeType, lockedPrefix)) {
      await removeRejectedAsset(config.url, config.storageDeleteCredential, authorization, candidate.path, assetId, controller.signal);
      response.status(422).json({ error: 'briefing_asset_signature_mismatch', message: 'O arquivo mudou durante a verificação e foi descartado.' });
      return;
    }
    response.status(200).json({ verifiedAt });
  } catch {
    response.status(503).json({ error: 'briefing_asset_verification_unavailable', message: 'Não conseguimos verificar o arquivo agora. Ele não foi anexado.' });
  } finally {
    clearTimeout(timeout);
  }
}
