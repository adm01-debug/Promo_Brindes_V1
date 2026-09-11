import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { createSharedSelection, readSharedSelection, revokeSharedSelection } from './_lib/sharedSelections.js';
import { SiteDatabaseError } from './_lib/siteDatabase.js';

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function requestIp(request: ApiRequest): string {
  return header(request, 'x-vercel-forwarded-for').split(',')[0]?.trim()
    || header(request, 'x-forwarded-for').split(',')[0]?.trim()
    || request.socket?.remoteAddress
    || 'unknown';
}

function body(request: ApiRequest): Record<string, unknown> {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    throw new SiteDatabaseError('Envie uma solicitação válida.', 'invalid_shared_selection', 400);
  }
  return request.body as Record<string, unknown>;
}

function requireOrigin(request: ApiRequest) {
  const primaryOrigin = process.env.SITE_PUBLIC_ORIGIN?.trim();
  const deploymentHost = process.env.VERCEL_URL?.trim();
  const allowedOrigins = new Set([primaryOrigin, deploymentHost ? `https://${deploymentHost}` : ''].filter(Boolean));
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
      const result = await readSharedSelection(String(payload.token || ''));
      response.status(result ? 200 : 404).json(result || { error: 'shared_selection_not_found', message: 'Esta seleção não está disponível.' });
      return;
    }
    if (action === 'revoke') {
      const revoked = await revokeSharedSelection(String(payload.token || ''), String(payload.managementToken || ''));
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
