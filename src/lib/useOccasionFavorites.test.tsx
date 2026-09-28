import { act, cleanup, renderHook } from '@testing-library/react';
import { Suspense, useLayoutEffect, type ReactNode } from 'react';
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
const anonymousKey = 'promo-brindes:occasion-favorites:v1';
const legacyOwnerKey = 'promo-brindes:occasion-favorites:local-owner';
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

  it('não mostra como seleção anônima o cache legado que pertence a uma conta anterior no mesmo navegador', async () => {
    localStorage.setItem(anonymousKey, JSON.stringify([date]));
    localStorage.setItem(legacyOwnerKey, 'conta-anterior');
    const { result } = renderHook(() => useOccasionFavorites({ ...options, userId: undefined }));
    await act(async () => {});
    expect(result.current.favorites.has(date)).toBe(false);
  });

  it('não deixa a promoção anônima ressuscitar uma remoção autenticada feita enquanto a leitura remota ainda carrega', async () => {
    localStorage.setItem(anonymousKey, JSON.stringify([date]));
    localStorage.setItem(legacyOwnerKey, 'anonymous');
    const staleRead = deferred<string[]>();
    rpc.list.mockReturnValue(staleRead.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));

    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { staleRead.resolve([]); });

    expect(result.current.favorites.has(date)).toBe(false);
    expect(rpc.save).toHaveBeenCalledWith(date, false);
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

  it('reflete uma alteração da mesma conta vinda de outra aba', async () => {
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: accountKey('conta-a'),
        newValue: JSON.stringify([date]),
        storageArea: localStorage,
      }));
    });

    expect(result.current.favorites.has(date)).toBe(true);
  });

  it('não aceita um evento de storage pertencente a outra conta', async () => {
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: accountKey('conta-b'),
        newValue: JSON.stringify([date]),
        storageArea: localStorage,
      }));
    });

    expect(result.current.favorites.has(date)).toBe(false);
  });

  it('mantém a intenção local diante de uma atualização concorrente de outra aba', async () => {
    const pendingWrite = deferred<void>();
    rpc.save.mockReturnValue(pendingWrite.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});
    await act(async () => { result.current.saveFavorite(date, true); });

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: accountKey('conta-a'),
        newValue: JSON.stringify([]),
        storageArea: localStorage,
      }));
    });

    expect(result.current.favorites.has(date)).toBe(true);
    await act(async () => { pendingWrite.resolve(); });
  });

  it('envia a segunda intenção somente depois de a primeira concluir, preservando a ordem no servidor', async () => {
    localStorage.setItem(accountKey('conta-a'), JSON.stringify([date]));
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    rpc.save.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { result.current.saveFavorite(date, true); });
    expect(rpc.save).toHaveBeenCalledTimes(1);
    await act(async () => { firstWrite.resolve(); });
    expect(rpc.save).toHaveBeenLastCalledWith(date, true);
    await act(async () => { secondWrite.resolve(); });
    expect(result.current.favorites.has(date)).toBe(true);
  });

  it('não despacha uma ação de A que ficou na fila após a sessão mudar para B', async () => {
    const pendingWrite = deferred<void>();
    rpc.save.mockReturnValueOnce(pendingWrite.promise);
    const { result, rerender } = renderHook(({ userId }: { userId: string }) => useOccasionFavorites({ ...options, userId }), {
      initialProps: { userId: 'conta-a' },
    });
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    expect(rpc.save).toHaveBeenCalledTimes(1);

    await act(async () => { rerender({ userId: 'conta-b' }); });
    await act(async () => { pendingWrite.resolve(); });

    expect(rpc.save).toHaveBeenCalledTimes(1);
  });

  it('invalida a fila de A já na renderização de B, antes do efeito passivo', async () => {
    const pendingWrite = deferred<void>();
    rpc.save.mockReturnValueOnce(pendingWrite.promise);
    const { result, rerender } = renderHook(({ userId }: { userId: string }) => {
      const state = useOccasionFavorites({ ...options, userId });
      useLayoutEffect(() => {
        if (userId === 'conta-b') pendingWrite.resolve();
      }, [userId]);
      return state;
    }, { initialProps: { userId: 'conta-a' } });
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    expect(rpc.save).toHaveBeenCalledTimes(1);

    await act(async () => { rerender({ userId: 'conta-b' }); });

    expect(rpc.save).toHaveBeenCalledTimes(1);
  });

  it('não invalida a fila da conta ativa quando um render concorrente de outra conta é abandonado', async () => {
    const pendingWrite = deferred<void>();
    const suspendedForever = new Promise<never>(() => undefined);
    rpc.save.mockReturnValueOnce(pendingWrite.promise).mockResolvedValueOnce(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;
    const { result, rerender } = renderHook(({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const state = useOccasionFavorites({ ...options, userId });
      if (suspend) throw suspendedForever;
      return state;
    }, {
      initialProps: { userId: 'conta-a', suspend: false },
      wrapper,
    });
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    expect(rpc.save).toHaveBeenCalledTimes(1);

    await act(async () => { rerender({ userId: 'conta-b', suspend: true }); });
    await act(async () => { pendingWrite.resolve(); });

    expect(rpc.save).toHaveBeenCalledTimes(2);
    expect(rpc.save).toHaveBeenLastCalledWith(date, false);
  });

  it('mantém a fila da mesma conta quando apenas a chave do catálogo muda', async () => {
    const pendingWrite = deferred<void>();
    rpc.save.mockReturnValueOnce(pendingWrite.promise).mockResolvedValueOnce(undefined);
    const { result, rerender } = renderHook(({ knownOccasionIdsKey }: { knownOccasionIdsKey: string }) => (
      useOccasionFavorites({ ...options, knownOccasionIdsKey })
    ), { initialProps: { knownOccasionIdsKey: date } });
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    expect(rpc.save).toHaveBeenCalledTimes(1);

    await act(async () => { rerender({ knownOccasionIdsKey: `${date},black-friday` }); });
    await act(async () => { pendingWrite.resolve(); });

    expect(rpc.save).toHaveBeenCalledTimes(2);
    expect(rpc.save).toHaveBeenLastCalledWith(date, false);
  });

  it('libera uma intenção concluída quando uma releitura posterior confirma o valor salvo', async () => {
    const refresh = deferred<string[]>();
    rpc.list.mockResolvedValueOnce([]).mockReturnValueOnce(refresh.promise);
    const { result, rerender } = renderHook(({ knownOccasionIdsKey }: { knownOccasionIdsKey: string }) => (
      useOccasionFavorites({ ...options, knownOccasionIdsKey })
    ), { initialProps: { knownOccasionIdsKey: date } });
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { rerender({ knownOccasionIdsKey: `${date},black-friday` }); });
    await act(async () => { refresh.resolve([date]); });

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: accountKey('conta-a'),
        newValue: JSON.stringify([]),
        storageArea: localStorage,
      }));
    });

    expect(result.current.favorites.has(date)).toBe(false);
  });

  it('mantém a remoção mais recente enquanto a adição anterior conclui após uma lista obsoleta', async () => {
    const staleRead = deferred<string[]>();
    const add = deferred<void>();
    const remove = deferred<void>();
    rpc.list.mockReturnValue(staleRead.promise);
    rpc.save.mockReturnValueOnce(add.promise).mockReturnValueOnce(remove.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { staleRead.resolve([]); });
    await act(async () => { add.resolve(); });

    expect(rpc.save).toHaveBeenLastCalledWith(date, false);
    expect(result.current.favorites.has(date)).toBe(false);
    await act(async () => { remove.resolve(); });
  });

  it('restaura o último estado confirmado quando duas escritas consecutivas são recusadas', async () => {
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    rpc.save.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});
    expect(result.current.favorites.has(date)).toBe(false);

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { firstWrite.reject(new Error('primeira gravação recusada')); });
    await act(async () => { secondWrite.reject(new Error('segunda gravação recusada')); });

    expect(result.current.favorites.has(date)).toBe(false);
  });

  it('restaura uma confirmação anterior quando a intenção posterior é recusada', async () => {
    const add = deferred<void>();
    const remove = deferred<void>();
    rpc.save.mockReturnValueOnce(add.promise).mockReturnValueOnce(remove.promise);
    const { result } = renderHook(() => useOccasionFavorites(options));
    await act(async () => {});

    await act(async () => { result.current.saveFavorite(date, true); });
    await act(async () => { result.current.saveFavorite(date, false); });
    await act(async () => { add.resolve(); });
    await act(async () => { remove.reject(new Error('remoção recusada')); });

    expect(result.current.favorites.has(date)).toBe(true);
  });
});
