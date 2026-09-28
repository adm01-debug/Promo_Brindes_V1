import { afterEach, describe, expect, it, vi } from 'vitest';
import { runSiteRpc, SITE_RPC_TIMEOUT_MS } from './siteRpc';

function pendingAbortable<T>() {
  let observedSignal: AbortSignal | undefined;
  const abortSignal = vi.fn((signal: AbortSignal) => {
    observedSignal = signal;
    return new Promise<T>((_resolve, reject) => {
      const rejectAbort = () => reject(signal.reason || new DOMException('Abortado.', 'AbortError'));
      if (signal.aborted) rejectAbort();
      else signal.addEventListener('abort', rejectAbort, { once: true });
    });
  });
  return { abortSignal, get signal() { return observedSignal; } };
}

describe('deadline das RPCs do site', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborta a consulta no deadline padrão', async () => {
    vi.useFakeTimers();
    const query = pendingAbortable<never>();
    const request = runSiteRpc(query);
    const assertion = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });

    await vi.advanceTimersByTimeAsync(SITE_RPC_TIMEOUT_MS);

    await assertion;
    expect(query.signal?.aborted).toBe(true);
  });

  it('propaga o aborto externo para a consulta', async () => {
    const external = new AbortController();
    const query = pendingAbortable<never>();
    const request = runSiteRpc(query, { signal: external.signal });

    external.abort(new DOMException('Rota encerrada.', 'AbortError'));

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(query.signal?.aborted).toBe(true);
  });

  it('limpa o timer quando a consulta termina', async () => {
    vi.useFakeTimers();
    const abortSignal = vi.fn(async () => ({ data: { ok: true }, error: null }));

    await expect(runSiteRpc({ abortSignal })).resolves.toEqual({ data: { ok: true }, error: null });

    expect(abortSignal).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
