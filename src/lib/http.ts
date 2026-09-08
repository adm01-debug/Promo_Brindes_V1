const REQUEST_TIMEOUT_MS = 15_000;

export function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function validHttpsEndpoint(endpoint: string, label: string): string {
  const isRelativeApiRoute = endpoint.startsWith('/api/') && !endpoint.startsWith('//');
  if (isRelativeApiRoute) return endpoint;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !url.hostname) throw new Error();
    return url.href;
  } catch {
    throw new Error(`O endpoint de ${label} precisa ser uma URL HTTPS válida.`);
  }
}

export async function postJson(endpoint: string, payload: unknown, label: string, idempotencyKey?: string): Promise<{ id?: string; requestId?: string }> {
  const url = validHttpsEndpoint(endpoint, label);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) throw new Error('O envio demorou além do esperado. Tente novamente.');
    throw new Error('Não conseguimos conectar ao serviço de envio. Verifique sua conexão e tente novamente.');
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) throw new Error('Não conseguimos enviar agora. Tente novamente em alguns instantes.');
  return await response.json().catch(() => ({})) as { id?: string; requestId?: string };
}
