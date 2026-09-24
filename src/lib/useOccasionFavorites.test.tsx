import { act, cleanup, renderHook } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOccasionFavorites } from './useOccasionFavorites';

const rpc = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('./customerOccasionFavorites', () => ({
  listMyOccasionFavorites: rpc.list,
  setMyOccasionFavorite: rpc.save,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

const date = 'dia-do-cliente';
const accountKey = (id: string) => `promo-brindes:occasion-favorites:account:${id}`;
const options = { userId: 'conta-a', authLoading: false, knownOccasionIdsKey: date };

describe('useOccasionFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
    rpc.list.mockReset().mockResolvedValue([]);
    rpc.save.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('preserva uma adição confirmada quando uma leitura iniciada antes dela retorna vazia', async () => {
    const staleRead = deferred<string[]>();
    rpc.list.mockReturnValue(staleRead.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { staleRead.resolve([]); });

    expect(result.current.favorites.has(date)).toBe(true);
    expect(localStorage.getItem(accountKey('conta-a'))).toContain(date);
  });

  it('preserva uma remoção enquanto uma leitura antiga ainda contém o favorito', async () => {
    localStorage.setItem(accountKey('conta-a'), JSON.stringify([date]));
    const staleRead = deferred<string[]>();
    const pendingWrite = deferred<void>();
    rpc.list.mockReturnValue(staleRead.promise);
    rpc.save.mockReturnValue(pendingWrite.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));

    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { staleRead.resolve([date]); });

    expect(result.current.favorites.has(date)).toBe(false);
    await act(async () => { pendingWrite.resolve(); });
    expect(result.current.favorites.has(date)).toBe(false);
  });

  it('mantém a intenção mais recente quando respostas de escrita chegam fora de ordem', async () => {
    localStorage.setItem(accountKey('conta-a'), JSON.stringify([date]));
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    rpc.save.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));

    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { secondWrite.resolve(); });
    await act(async () => { firstWrite.reject(new Error('falha antiga')); });

    expect(result.current.favorites.has(date)).toBe(true);
  });

  it('não confirma uma ação enquanto a identidade está carregando e só aceita a nova conta após isolar a projeção', async () => {
    const { result, rerender } = renderHook((value: { userId?: string; authLoading: boolean }) => useOccasionFavorites({ ...options, ...value }), {
      initialProps: { userId: 'conta-a', authLoading: true },
    });
    expect(result.current.saveFavorite(date, true)).toBe(false);
    expect(result.current.favorites.size).toBe(0);

    await act(async () => { rerender({ userId: 'conta-b', authLoading: false }); });
    expect(result.current.favorites.size).toBe(0);
    expect(result.current.saveFavorite(date, true)).toBe(true);
  });

  it('nunca confirma uma renderização da conta B com estado de A', async () => {
    rpc.list.mockResolvedValueOnce([date]).mockResolvedValueOnce([]);
    const frames: Array<{ owner: string; ids: string[] }> = [];
    const { rerender } = renderHook(({ userId }: { userId: string }) => {
      const state = useOccasionFavorites({ ...options, userId });
      useLayoutEffect(() => {
        frames.push({ owner: userId, ids: [...state.favorites] });
      }, [state.favorites, userId]);
      return state;
    }, { initialProps: { userId: 'conta-a' } });

    await act(async () => {});
    expect(frames.some((frame) => frame.owner === 'conta-a' && frame.ids.includes(date))).toBe(true);
    rerender({ userId: 'conta-b' });
    await act(async () => {});

    expect(frames.filter((frame) => frame.owner === 'conta-b').every((frame) => !frame.ids.includes(date))).toBe(true);
  });
});
