import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { allowedSiteOrigins } from './_lib/siteOrigin.js';

const PROPOSAL_BUCKET = 'customer-proposals';
export const REQUEST_TIMEOUT_MS = 10_000;
const MAX_PROPOSAL_BODY_BYTES = 4 * 1024;
const MAX_PROPOSAL_PATH_LENGTH = 500;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function hasAllowedOrigin(request: ApiRequest): boolean {
  return allowedSiteOrigins().has(header(request, 'origin'));
}

function proposalPayload(request: ApiRequest): { proposalId?: string; error?: 'unsupported_media_type' | 'payload_too_large' | 'invalid_proposal' } {
  if (header(request, 'content-type').split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') return { error: 'unsupported_media_type' };
  let parsed: unknown;
  try {
    const serialized = JSON.stringify(request.body ?? null);
    if (!serialized) return { error: 'invalid_proposal' };
    if (Buffer.byteLength(serialized) > MAX_PROPOSAL_BODY_BYTES) return { error: 'payload_too_large' };
    parsed = JSON.parse(serialized);
  } catch {
    return { error: 'invalid_proposal' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'invalid_proposal' };
  return { proposalId: String((parsed as { proposalId?: unknown }).proposalId || '') };
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const point = character.codePointAt(0) || 0;
    return point <= 0x1f || point === 0x7f;
  });
}

/** O RPC determina a autorização, mas o caminho ainda atravessa JSON antes de
 * chegar ao Storage. Nunca aceite caminho absoluto, segmento de navegação ou
 * caracteres de controle como objeto a assinar. */
function isSafeProposalPath(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_PROPOSAL_PATH_LENGTH
    && !value.startsWith('/')
    && !hasControlCharacter(value)
    && value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function signedStorageUrl(baseUrl: string, candidate: string): string {
  const relativePath = candidate.startsWith('/storage/v1/')
    ? candidate
    : `/storage/v1${candidate.startsWith('/') ? '' : '/'}${candidate}`;
  const url = new URL(candidate.startsWith('http') ? candidate : relativePath, baseUrl);
  if (url.origin !== baseUrl || !url.pathname.startsWith(`/storage/v1/object/sign/${PROPOSAL_BUCKET}/`)) {
    throw new Error('unsafe_signed_url');
  }
  return url.toString();
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
  if (!hasAllowedOrigin(request)) {
    response.status(403).json({ error: 'origin_not_allowed', message: 'Origem não autorizada.' });
    return;
  }
  const authorization = header(request, 'authorization');
  if (!/^Bearer [A-Za-z0-9._-]{20,4000}$/.test(authorization)) {
    response.status(401).json({ error: 'authentication_required', message: 'Entre novamente para abrir a proposta.' });
    return;
  }
  const payload = proposalPayload(request);
  if (payload.error === 'unsupported_media_type') {
    response.status(415).json({ error: payload.error, message: 'Envie o conteúdo como application/json.' });
    return;
  }
  if (payload.error === 'payload_too_large') {
    response.status(413).json({ error: payload.error, message: 'A solicitação ultrapassa o limite permitido.' });
    return;
  }
  const proposalId = payload.proposalId || '';
  if (!UUID_PATTERN.test(proposalId)) {
    response.status(400).json({ error: 'invalid_proposal', message: 'Proposta inválida.' });
    return;
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const config = getSiteDatabaseConfig();
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const rpcResponse = await fetch(`${config.url}/rest/v1/rpc/get_my_proposal_document`, {
      method: 'POST',
      headers: { apikey: config.serviceCredential, Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_proposal_id: proposalId }),
      signal: controller.signal,
    });
    const document = await rpcResponse.json().catch(() => null) as { bucket?: string; path?: string } | null;
    if (rpcResponse.status === 401 || rpcResponse.status === 403) {
      response.status(401).json({ error: 'authentication_required', message: 'Sua sessão expirou. Entre novamente.' });
      return;
    }
    if (!rpcResponse.ok || document?.bucket !== PROPOSAL_BUCKET || !isSafeProposalPath(document?.path)) {
      response.status(404).json({ error: 'proposal_not_found', message: 'Proposta não encontrada.' });
      return;
    }
    const encodedPath = document.path.split('/').map(encodeURIComponent).join('/');
    // O JWT site_api só acessa RPCs; Storage exige uma credencial própria.
    // Se ela estiver ausente, falhamos fechado em vez de quebrar silenciosamente
    // a leitura de propostas após o corte do privilégio mínimo.
    if (!config.storageDeleteCredential) throw new Error('proposal_storage_credential_missing');
    const signedResponse = await fetch(`${config.url}/storage/v1/object/sign/${encodeURIComponent(document.bucket)}/${encodedPath}`, {
      method: 'POST',
      headers: { apikey: config.storageDeleteCredential, Authorization: `Bearer ${config.storageDeleteCredential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
      signal: controller.signal,
    });
    const signed = await signedResponse.json().catch(() => null) as { signedURL?: string } | null;
    if (!signedResponse.ok || !signed?.signedURL) throw new Error('sign_failed');
    response.status(200).json({ url: signedStorageUrl(config.url, signed.signedURL) });
  } catch {
    response.status(503).json({ error: 'proposal_unavailable', message: 'Não conseguimos abrir esta proposta agora.' });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
