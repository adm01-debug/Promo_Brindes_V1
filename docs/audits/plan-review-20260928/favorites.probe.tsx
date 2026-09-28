// Probes históricos da auditoria F28. As mesmas regressões agora vivem na
// suíte permanente; este arquivo preserva a reprodução isolada e segura.
// RPCs simuladas, identidades sintéticas, nenhuma chamada ao Supabase.
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOccasionFavorites } from '../../../src/lib/useOccasionFavorites';

const rpc = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('../../../src/lib/customerOccasionFavorites', () => ({
  listMyOccasionFavorites: rpc.list,
  setMyOccasionFavorite: rpc.save,
}));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const date = 'dia-do-cliente';
const options = { userId: 'conta-a', authLoading: false, knownOccasionIdsKey: date };

describe('auditoria F28 — integridade de escritas enfileiradas', () => {
  beforeEach(() => {
    localStorage.clear();
    rpc.list.mockReset().mockResolvedValue([]);
    rpc.save.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('F28-01: não despacha ação pendente de A depois da mudança para B', async () => {
    const pending = deferred();
    rpc.save.mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderHook(({ userId }) => useOccasionFavorites({ ...options, userId }), {
      initialProps: { userId: 'conta-a' },
    });
    await act(async () => {});
    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    expect(rpc.save).toHaveBeenCalledTimes(1);
    await act(async () => { rerender({ userId: 'conta-b' }); });
    await act(async () => { pending.resolve(); });
    // Limpar o Map de promises não cancela callbacks já registrados.
    expect(rpc.save).toHaveBeenCalledTimes(1);
  });

  it('F28-02: duas escritas rejeitadas restauram o último estado confirmado, não um otimista', async () => {
    const first = deferred();
    const second = deferred();
    rpc.save.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});
    expect(result.current.favorites.has(date)).toBe(false);
    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { first.reject(new Error('primeira gravação recusada')); });
    await act(async () => { second.reject(new Error('segunda gravação recusada')); });
    expect(result.current.favorites.has(date)).toBe(false);
  });
});
