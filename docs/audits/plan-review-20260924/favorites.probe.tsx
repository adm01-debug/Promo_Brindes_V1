// Probes de auditoria: esperam o comportamento CORRETO e podem falhar.
// Fora do padrão *.test.*; executar somente com a configuração desta pasta.
import { act, cleanup, renderHook } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOccasionFavorites } from '../../../src/lib/useOccasionFavorites';

const rpc = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('../../../src/lib/customerOccasionFavorites', () => ({
  listMyOccasionFavorites: rpc.list,
  setMyOccasionFavorite: rpc.save,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const date = 'dia-do-cliente';
const options = { userId: 'audit-a', authLoading: false, knownOccasionIdsKey: date };

describe('aceites ainda não cobertos de favoritos — auditoria somente local', () => {
  beforeEach(() => {
    localStorage.clear();
    rpc.list.mockReset();
    rpc.save.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('leitura antiga não apaga uma adição já confirmada', async () => {
    const read = deferred<string[]>();
    rpc.list.mockReturnValue(read.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => { result.current.saveFavorite(date, true); });
    expect(result.current.favorites.has(date)).toBe(true);
    await act(async () => { read.resolve([]); });
    expect(result.current.favorites.has(date)).toBe(true);
  });

  it('leitura antiga não restaura uma remoção em andamento', async () => {
    localStorage.setItem('promo-brindes:occasion-favorites:account:audit-a', JSON.stringify([date]));
    const read = deferred<string[]>();
    const write = deferred<void>();
    rpc.list.mockReturnValue(read.promise);
    rpc.save.mockReturnValue(write.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => { result.current.saveFavorite(date, false); });
    expect(result.current.favorites.has(date)).toBe(false);
    await act(async () => { read.resolve([date]); });
    expect(result.current.favorites.has(date)).toBe(false);
  });

  it('nenhuma renderização da conta B recebe favoritos da conta A', async () => {
    rpc.list.mockResolvedValueOnce([date]).mockResolvedValueOnce([]);
    const frames: Array<{ owner: string; ids: string[] }> = [];
    const { rerender } = renderHook(({ userId }) => {
      const state = useOccasionFavorites({ ...options, userId });
      useLayoutEffect(() => {
        frames.push({ owner: userId, ids: [...state.favorites] });
      }, [state.favorites, userId]);
      return state;
    }, { initialProps: { userId: 'audit-a' } });
    await act(async () => {});
    expect(frames.some((frame) => frame.owner === 'audit-a' && frame.ids.includes(date))).toBe(true);
    rerender({ userId: 'audit-b' });
    await act(async () => {});
    expect(frames.filter((frame) => frame.owner === 'audit-b').every((frame) => !frame.ids.includes(date))).toBe(true);
  });
});
