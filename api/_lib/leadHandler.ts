import { normalizeLeadPayload, RequestValidationError, type LeadKind } from './contracts.js';
import { reconcileQuoteItems } from './catalogValidation.js';
import { persistLead, SiteDatabaseError } from './siteDatabase.js';
import { deliverQuoteConfirmationsNow } from '../notifications.js';

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

export interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function bodySize(body: unknown): number {
  if (typeof body === 'string') return Buffer.byteLength(body);
  if (Buffer.isBuffer(body)) return body.byteLength;
  try {
    const serialized = JSON.stringify(body ?? null);
    if (typeof serialized !== 'string') throw new Error('unserializable_body');
    return Buffer.byteLength(serialized);
  } catch {
    throw new RequestValidationError('O corpo da solicitação não contém JSON válido.');
  }
}

function parseBody(body: unknown): unknown {
  if (Buffer.isBuffer(body)) return parseBody(body.toString('utf8'));
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    throw new RequestValidationError('O corpo da solicitação não contém JSON válido.');
  }
}

function readRequestBody(request: ApiRequest): unknown {
  try {
    return request.body;
  } catch {
    // A Vercel expõe o corpo JSON por meio de um getter que pode lançar durante
    // o parsing. Convertemos essa falha de entrada em 400 antes que vire 500.
    throw new RequestValidationError('O corpo da solicitação não contém JSON válido.');
  }
}

function requestIp(request: ApiRequest): string {
  // Na Vercel, este cabeçalho é inserido pela plataforma. X-Forwarded-For e
  // X-Real-IP podem ser fornecidos pelo próprio cliente e não podem decidir um
  // bucket de rate limit; fora da Vercel, usamos somente o endereço do socket.
  return header(request, 'x-vercel-forwarded-for').split(',')[0]?.trim()
    || request.socket?.remoteAddress
    || 'unknown';
}

function validateOrigin(request: ApiRequest): void {
  const origin = header(request, 'origin');
  const allowedOrigin = process.env.SITE_PUBLIC_ORIGIN?.trim();
  if (!allowedOrigin) {
    throw new RequestValidationError('O recebimento online ainda não está configurado.', 503, 'origin_not_configured');
  }
  if (!origin || origin !== allowedOrigin) {
    throw new RequestValidationError('Origem não autorizada.', 403, 'origin_not_allowed');
  }
}

export async function handleLeadRequest(kind: LeadKind, request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'method_not_allowed', message: 'Método não permitido.' });
    return;
  }

  try {
    const contentType = header(request, 'content-type').split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json') {
      throw new RequestValidationError('Envie o conteúdo como application/json.', 415, 'unsupported_media_type');
    }
    validateOrigin(request);
    const requestBody = readRequestBody(request);
    if (bodySize(requestBody) > 64 * 1024) {
      throw new RequestValidationError('A solicitação ultrapassa o limite permitido.', 413, 'payload_too_large');
    }
    const normalizedPayload = normalizeLeadPayload(kind, parseBody(requestBody));
    const idempotencyKey = header(request, 'idempotency-key');
    if (idempotencyKey && idempotencyKey !== normalizedPayload.clientRequestId) {
      throw new RequestValidationError('A chave de idempotência não corresponde à solicitação.', 409, 'idempotency_key_mismatch');
    }
    const payload = normalizedPayload.source === 'site-promo-brindes'
      ? await reconcileQuoteItems(normalizedPayload)
      : normalizedPayload;
    const result = await persistLead(kind, payload, {
      ip: requestIp(request),
      userAgent: header(request, 'user-agent'),
      origin: header(request, 'origin'),
    });
    const confirmations = payload.source === 'site-promo-brindes'
      ? result.duplicate
        ? { email: 'pending' as const, whatsapp: payload.notificationPreferences.whatsappCopy ? 'pending' as const : 'not_requested' as const }
        : await deliverQuoteConfirmationsNow(result.requestId, payload.notificationPreferences.whatsappCopy)
      : undefined;
    response.status(result.duplicate ? 200 : 201).json({
      ...result,
      ...(confirmations ? { confirmations } : {}),
    });
  } catch (error) {
    if (error instanceof RequestValidationError || error instanceof SiteDatabaseError) {
      response.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    response.status(500).json({ error: 'internal_error', message: 'Não conseguimos processar sua solicitação.' });
  }
}
