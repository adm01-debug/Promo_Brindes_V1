import { afterEach, describe, expect, it, vi } from 'vitest';
import { postJson } from './http';

describe('transporte dos formulários', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('recusa endpoint malformado antes de chamar fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(postJson('https://', {}, 'contato')).rejects.toThrow('URL HTTPS válida');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia JSON com chave de idempotência', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"requestId":"ok-1"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(postJson('https://api.example.test/lead', { name: 'Ana' }, 'contato', 'stable-1')).resolves.toEqual({ requestId: 'ok-1' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/lead', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'stable-1' }),
    }));
  });

  it('aceita rota server-side de mesma origem sem expor outro host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"requestId":"local-1"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(postJson('/api/contact-requests', { name: 'Ana' }, 'contato', 'stable-local')).resolves.toEqual({ requestId: 'local-1' });
    expect(fetchMock).toHaveBeenCalledWith('/api/contact-requests', expect.objectContaining({ method: 'POST' }));
  });

  it('recusa URL relativa fora do namespace de API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(postJson('/captura-dados', {}, 'contato')).rejects.toThrow('URL HTTPS válida');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('interrompe uma requisição pendente e devolve erro amigável', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = postJson('https://api.example.test/lead', {}, 'contato');
    const assertion = expect(request).rejects.toThrow('demorou além do esperado');
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
});
