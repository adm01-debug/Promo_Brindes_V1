const REQUEST_TIMEOUT_MS = 15_000;
const SITE_API_ROUTES = new Set(['/api/contact-requests', '/api/quote-requests']);

export interface SubmissionAttempt {
  id: string;
  submittedAt: string;
}

export function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function validHttpsEndpoint(endpoint: string, label: string): string {
  const isRelativeApiRoute = SITE_API_ROUTES.has(endpoint);
  if (isRelativeApiRoute) return endpoint;
  try {
    const url = new URL(endpoint);
    const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;
    if (url.protocol !== 'https:' || !url.hostname || url.origin !== currentOrigin || !SITE_API_ROUTES.has(url.pathname)) throw new Error();
    return url.href;
  } catch {
    throw new Error(`O endpoint de ${label} precisa ser uma URL HTTPS válida.`);
  }
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getOrCreateSubmissionAttempt(storageKey: string): SubmissionAttempt {
  const storage = safeSessionStorage();
  try {
    const cached = storage?.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<SubmissionAttempt>;
      if (typeof parsed.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$/.test(parsed.id)
        && typeof parsed.submittedAt === 'string' && !Number.isNaN(Date.parse(parsed.submittedAt))) {
        return { id: parsed.id, submittedAt: parsed.submittedAt };
      }
    }
  } catch {
    // Um armazenamento indisponível não pode impedir o envio do formulário.
  }
  const attempt = { id: createClientRequestId(), submittedAt: new Date().toISOString() };
  try { storage?.setItem(storageKey, JSON.stringify(attempt)); } catch { /* noop */ }
  return attempt;
}

export function clearSubmissionAttempt(storageKey: string): void {
  try { safeSessionStorage()?.removeItem(storageKey); } catch { /* noop */ }
}

export class ClientRequestError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}

export async function postJson(endpoint: string, payload: unknown, label: string, idempotencyKey?: string, externalSignal?: AbortSignal): Promise<{ requestId: string; confirmations?: unknown }> {
  const url = validHttpsEndpoint(endpoint, label);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // externalSignal permite ao chamador cancelar por um motivo próprio (ex.:
  // troca de titular em outra aba) sem se misturar com o timeout interno.
  const signal = externalSignal ? AbortSignal.any([controller.signal, externalSignal]) : controller.signal;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    if (externalSignal?.aborted) throw new Error('O envio foi cancelado.');
    if (controller.signal.aborted) throw new Error('O envio demorou além do esperado. Tente novamente.');
    throw new Error('Não conseguimos conectar ao serviço de envio. Verifique sua conexão e tente novamente.');
  } finally {
    window.clearTimeout(timeout);
  }
  const body = await response.json().catch(() => ({})) as { id?: string; requestId?: string; error?: string; message?: string; confirmations?: unknown };
  if (!response.ok) {
    const message = response.status === 429
      ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
      : response.status === 409
        ? 'Encontramos uma tentativa anterior. Atualize a página antes de reenviar.'
        : body.message || 'Não conseguimos enviar agora. Tente novamente em alguns instantes.';
    throw new ClientRequestError(message, response.status, body.error);
  }
  const requestId = body.requestId || body.id;
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) {
    throw new ClientRequestError('O serviço não confirmou um protocolo válido. Sua seleção foi preservada.', response.status, 'invalid_response');
  }
  return { requestId, confirmations: body.confirmations };
}
