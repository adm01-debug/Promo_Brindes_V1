import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { createSharedSelection, readSharedSelection, revokeSharedSelection } from './_lib/sharedSelections.js';
import { SiteDatabaseError } from './_lib/siteDatabase.js';
import { allowedSiteOrigins } from './_lib/siteOrigin.js';

// Cinquenta referências válidas com variantes e nomes de kit no limite ocupam
// cerca de 18 KiB. A margem mantém o contrato público sem abrir payload irrestrito.
const MAX_SHARED_SELECTION_BODY_BYTES = 32 * 1024;

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function requestIp(request: ApiRequest): string {
  return header(request, 'x-vercel-forwarded-for').split(',')[0]?.trim()
    || request.socket?.remoteAddress
    || 'unknown';
}

function body(request: ApiRequest): Record<string, unknown> {
  if (header(request, 'content-type').split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    throw new SiteDatabaseError('Envie o conteúdo como application/json.', 'unsupported_media_type', 415);
  }
  let parsed: unknown;
  try {
    const serialized = JSON.stringify(request.body ?? null);
    if (!serialized) throw new Error('empty_body');
    if (Buffer.byteLength(serialized) > MAX_SHARED_SELECTION_BODY_BYTES) {
      throw new SiteDatabaseError('A solicitação ultrapassa o limite permitido.', 'payload_too_large', 413);
    }
    parsed = JSON.parse(serialized);
  } catch (error) {
    if (error instanceof SiteDatabaseError) throw error;
    throw new SiteDatabaseError('Envie uma solicitação válida.', 'invalid_shared_selection', 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SiteDatabaseError('Envie uma solicitação válida.', 'invalid_shared_selection', 400);
  }
  return parsed as Record<string, unknown>;
}

function requireOrigin(request: ApiRequest) {
  const allowedOrigins = allowedSiteOrigins();
  if (!allowedOrigins.size || !allowedOrigins.has(header(request, 'origin'))) {
    throw new SiteDatabaseError('Origem não autorizada.', 'origin_not_allowed', 403);
  }
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
  try {
    requireOrigin(request);
    const payload = body(request);
    const action = String(payload.action || '');
    if (action === 'create') {
      const result = await createSharedSelection(payload.items, { ip: requestIp(request), userAgent: header(request, 'user-agent'), origin: header(request, 'origin') });
      response.status(201).json(result);
      return;
    }
    if (action === 'read') {
      const result = await readSharedSelection(String(payload.token || ''), { ip: requestIp(request), userAgent: header(request, 'user-agent'), origin: header(request, 'origin') });
      response.status(result ? 200 : 404).json(result || { error: 'shared_selection_not_found', message: 'Esta seleção não está disponível.' });
      return;
    }
    if (action === 'revoke') {
      const revoked = await revokeSharedSelection(String(payload.token || ''), String(payload.managementToken || ''), { ip: requestIp(request), userAgent: header(request, 'user-agent'), origin: header(request, 'origin') });
      response.status(revoked ? 200 : 404).json({ revoked });
      return;
    }
    throw new SiteDatabaseError('Ação de compartilhamento inválida.', 'invalid_shared_selection_action', 400);
  } catch (error) {
    if (error instanceof SiteDatabaseError) {
      response.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    response.status(500).json({ error: 'internal_error', message: 'Não conseguimos processar este link agora.' });
  }
}
