import { createHash, createHmac } from 'node:crypto';
import type { LeadKind, NormalizedLeadPayload } from './contracts.js';

// Allowlist exata: por definição, o catálogo canônico não pode receber escritas do site.
const SITE_DATABASE_PROJECT = 'xlzmclcjdncjfdrjxclt';
const INTERNAL_DATABASE_PROJECT = 'doufsxqlfjyuvxuezpln';
export const REQUEST_TIMEOUT_MS = 10_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SiteDatabaseError extends Error {
  constructor(message: string, readonly code = 'database_unavailable', readonly status = 503) {
    super(message);
  }
}

interface SiteDatabaseConfig {
  url: string;
  /**
   * Etapa 25 do plano de correções: SITE_SUPABASE_SERVICE_JWT (role site_api, privilégio
   * mínimo — ver docs/RUNBOOK_SITE_API_CUTOVER.md) tem prioridade sobre
   * SITE_SUPABASE_SECRET_KEY (service_role legado, todas as tabelas). As duas convivem
   * durante o cutover; nenhum caller precisa saber qual das duas está em uso — só que é
   * o que vai em apikey/Authorization.
   */
  serviceCredential: string;
  /** A Storage API exige uma credencial própria para exclusão de propostas. */
  storageDeleteCredential: string | null;
  requestHashSalt: string;
}

export interface RequestMetadata {
  ip: string;
  userAgent: string;
  origin: string;
}

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function isValidServiceCredential(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true;
  // JWT (Etapa 25): três segmentos base64url; decodifica o header e confirma que é o
  // formato esperado, sem validar a assinatura aqui (isso é papel do gateway do
  // Supabase — se o segredo estiver errado, a chamada volta 401 e falha de forma
  // visível, não silenciosa).
  if (!JWT_SHAPE.test(value)) return false;
  try {
    const headerSegment = value.split('.', 1)[0] ?? '';
    const header = JSON.parse(Buffer.from(headerSegment, 'base64url').toString('utf8')) as { alg?: string; typ?: string };
    return header.typ === 'JWT' && typeof header.alg === 'string';
  } catch {
    return false;
  }
}

export function getSiteDatabaseConfig(): SiteDatabaseConfig {
  const rawUrl = process.env.SITE_SUPABASE_URL?.trim();
  const serviceCredential = process.env.SITE_SUPABASE_SERVICE_JWT?.trim() || process.env.SITE_SUPABASE_SECRET_KEY?.trim();
  const storageDeleteCredential = process.env.SITE_SUPABASE_SECRET_KEY?.trim() || null;
  const requestHashSalt = process.env.SITE_REQUEST_HASH_SALT?.trim();
  if (!rawUrl || !serviceCredential || !requestHashSalt) {
    throw new SiteDatabaseError('O recebimento online ainda não está configurado.', 'backend_not_configured');
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SiteDatabaseError('Configuração do banco do site inválida.', 'backend_misconfigured');
  }
  const projectHost = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const expectedProject = isPreview
    ? process.env.SITE_PREVIEW_SUPABASE_PROJECT_REF?.trim()
    : SITE_DATABASE_PROJECT;
  if (url.protocol !== 'https:' || !projectHost || !expectedProject
    || !/^[a-z0-9]{20}$/.test(expectedProject)
    || (isPreview && [SITE_DATABASE_PROJECT, INTERNAL_DATABASE_PROJECT].includes(expectedProject))
    || projectHost[1] !== expectedProject
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new SiteDatabaseError('Destino isolado do banco do site inválido.', 'unsafe_database_target');
  }
  if (!isValidServiceCredential(serviceCredential)
    || (storageDeleteCredential !== null && !storageDeleteCredential.startsWith('sb_secret_'))
    || requestHashSalt.length < 32) {
    throw new SiteDatabaseError('Credenciais server-side do site inválidas.', 'backend_misconfigured');
  }
  return { url: url.origin, serviceCredential, storageDeleteCredential, requestHashSalt };
}

function identifierHash(ip: string, salt: string): string {
  return createHmac('sha256', salt).update(ip || 'unknown').digest('hex');
}

function requestHash(payload: NormalizedLeadPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/**
 * A resposta das RPCs de criação atravessa uma fronteira de confiança: mesmo
 * com types gerados, PostgREST entrega JSON. Nunca permita que um formato
 * inesperado vire protocolo de confirmação, URL de acompanhamento ou chave de
 * uma entrega posterior.
 */
export function parseLeadPersistenceResponse(value: unknown): { requestId: string; duplicate: boolean } {
  const result = record(value);
  const requestId = result?.requestId;
  if (typeof requestId !== 'string' || !UUID_PATTERN.test(requestId) || typeof result?.duplicate !== 'boolean') {
    throw new SiteDatabaseError('O banco não devolveu um protocolo válido.', 'invalid_database_response', 502);
  }
  return { requestId, duplicate: result.duplicate };
}

export type ProviderEventApplyReason = 'duplicate' | 'delivery_not_found' | 'delivery_state_already_set';

export interface ProviderEventApplyResult {
  applied: boolean;
  deliveryId: string | null;
  reason: ProviderEventApplyReason | null;
}

const PROVIDER_EVENT_APPLY_REASONS = new Set<ProviderEventApplyReason>([
  'duplicate',
  'delivery_not_found',
  'delivery_state_already_set',
]);

/**
 * `apply_site_notification_provider_event` também cruza a fronteira JSON do
 * PostgREST. Uma resposta 200 malformada não pode confirmar para Resend ou
 * Meta que o evento foi gravado: isso perderia a chance de reentrega.
 */
export function parseProviderEventApplyResponse(value: unknown): ProviderEventApplyResult {
  const result = record(value);
  const deliveryId = result?.deliveryId;
  const reason = result?.reason;
  if (!result
    || typeof result.applied !== 'boolean'
    || (deliveryId !== null && (typeof deliveryId !== 'string' || !UUID_PATTERN.test(deliveryId)))
    || (reason !== null && (typeof reason !== 'string' || !PROVIDER_EVENT_APPLY_REASONS.has(reason as ProviderEventApplyReason)))
    || (result.applied && (deliveryId === null || reason !== null))
    || (!result.applied && (reason === null || (reason === 'delivery_not_found' && deliveryId !== null)))) {
    throw new SiteDatabaseError('O banco não devolveu um protocolo de evento válido.', 'invalid_database_response', 502);
  }
  return { applied: result.applied, deliveryId, reason: reason as ProviderEventApplyReason | null };
}

function responseErrorDetail(value: unknown): string {
  const result = record(value);
  const message = typeof result?.message === 'string' ? result.message.slice(0, 160) : '';
  const code = typeof result?.code === 'string' ? result.code.slice(0, 80) : '';
  return `${message} ${code}`;
}

export async function persistLead(kind: LeadKind, payload: NormalizedLeadPayload, metadata: RequestMetadata) {
  const config = getSiteDatabaseConfig();
  const rpcName = kind === 'quote' ? 'create_site_quote_request' : 'create_site_contact_request';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${config.url}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        apikey: config.serviceCredential,
        Authorization: `Bearer ${config.serviceCredential}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        p_payload: payload,
        p_request_meta: {
          identifierHash: identifierHash(metadata.ip, config.requestHashSalt),
          requestHash: requestHash(payload),
          userAgent: metadata.userAgent.slice(0, 500),
          origin: metadata.origin.slice(0, 300),
          ...(payload.source === 'site-promo-brindes' ? {
            campaign: payload.campaign || null,
            briefing: payload.briefing || null,
            notificationPreferences: payload.notificationPreferences,
          } : {}),
        },
      }),
      signal: controller.signal,
    });
  } catch {
    throw new SiteDatabaseError('Não conseguimos registrar sua solicitação agora. Tente novamente.', 'database_unavailable');
  } finally {
    clearTimeout(timeout);
  }

  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = responseErrorDetail(result);
    if (detail.includes('rate_limit_exceeded')) {
      throw new SiteDatabaseError('Muitas tentativas em pouco tempo. Aguarde alguns minutos.', 'rate_limit_exceeded', 429);
    }
    if (detail.includes('client_request_id_conflict')) {
      throw new SiteDatabaseError('Esta solicitação entrou em conflito com uma tentativa anterior. Atualize a página.', 'idempotency_conflict', 409);
    }
    throw new SiteDatabaseError('Não conseguimos registrar sua solicitação agora. Tente novamente.', 'database_unavailable');
  }
  return parseLeadPersistenceResponse(result);
}

export function assertSafeSiteDatabaseConfiguration(): boolean {
  getSiteDatabaseConfig();
  return true;
}

/** Chamada de RPC genérica ao banco do site (Etapa 30: webhooks de provedor). */
export async function callSiteRpc<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.serviceCredential, Authorization: `Bearer ${config.serviceCredential}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new SiteDatabaseError(`site_rpc_${name}_failed`, 'database_unavailable', 502);
  return response.json() as Promise<T>;
}
