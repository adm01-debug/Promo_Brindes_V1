export const SITE_RPC_TIMEOUT_MS = 12_000;

type AbortableQuery<T> = {
  abortSignal(signal: AbortSignal): PromiseLike<T>;
};

/**
 * Executa uma consulta PostgREST com deadline real. O AbortSignal chega até o
 * fetch do Supabase, portanto uma conexão pendurada é encerrada em vez de só
 * perder uma corrida local e continuar consumindo recursos em segundo plano.
 */
export async function runSiteRpc<T>(
  query: AbortableQuery<T>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? SITE_RPC_TIMEOUT_MS;
  const abortFromCaller = () => {
    if (!controller.signal.aborted) controller.abort(options.signal?.reason);
  };
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = globalThis.setTimeout(() => {
    if (!controller.signal.aborted) controller.abort(new DOMException('RPC excedeu o tempo limite.', 'TimeoutError'));
  }, timeoutMs);

  try {
    return await query.abortSignal(controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}
