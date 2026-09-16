import { createHash, createHmac } from 'node:crypto';
import type { LeadKind, NormalizedLeadPayload } from './contracts.js';

// Allowlist exata: por definição, o catálogo canônico não pode receber escritas do site.
const SITE_DATABASE_PROJECT = 'xlzmclcjdncjfdrjxclt';
export const REQUEST_TIMEOUT_MS = 10_000;

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
  if (url.protocol !== 'https:' || !projectHost || projectHost[1] !== SITE_DATABASE_PROJECT) {
    throw new SiteDatabaseError('Destino isolado do banco do site inválido.', 'unsafe_database_target');
  }
  if (!isValidServiceCredential(serviceCredential) || requestHashSalt.length < 32) {
    throw new SiteDatabaseError('Credenciais server-side do site inválidas.', 'backend_misconfigured');
  }
  return { url: url.origin, serviceCredential, requestHashSalt };
}

function identifierHash(ip: string, salt: string): string {
  return createHmac('sha256', salt).update(ip || 'unknown').digest('hex');
}

function requestHash(payload: NormalizedLeadPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
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

  const result = await response.json().catch(() => ({})) as { requestId?: string; duplicate?: boolean; message?: string; code?: string };
  if (!response.ok) {
    const detail = `${result.message || ''} ${result.code || ''}`;
    if (detail.includes('rate_limit_exceeded')) {
      throw new SiteDatabaseError('Muitas tentativas em pouco tempo. Aguarde alguns minutos.', 'rate_limit_exceeded', 429);
    }
    if (detail.includes('client_request_id_conflict')) {
      throw new SiteDatabaseError('Esta solicitação entrou em conflito com uma tentativa anterior. Atualize a página.', 'idempotency_conflict', 409);
    }
    throw new SiteDatabaseError('Não conseguimos registrar sua solicitação agora. Tente novamente.', 'database_unavailable');
  }
  if (!result.requestId) throw new SiteDatabaseError('O banco não devolveu um protocolo válido.', 'invalid_database_response');
  return { requestId: result.requestId, duplicate: Boolean(result.duplicate) };
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
