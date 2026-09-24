import { useCallback, useEffect, useRef, useState } from 'react';
import { listMyOccasionFavorites, setMyOccasionFavorite } from './customerOccasionFavorites';

type FavoriteOwner = 'anonymous' | `account:${string}`;

const FAVORITES_KEY = 'promo-brindes:occasion-favorites:v1';
const FAVORITES_PROMOTION_KEY = 'promo-brindes:occasion-favorites:account-promoted:';
const FAVORITES_OWNER_KEY = 'promo-brindes:occasion-favorites:local-owner';
const FAVORITES_ACCOUNT_CACHE_PREFIX = 'promo-brindes:occasion-favorites:account:';
const EMPTY_FAVORITES = new Set<string>();

function ownerFor(userId?: string): FavoriteOwner {
  return userId ? `account:${userId}` : 'anonymous';
}

function cacheKeyFor(owner: FavoriteOwner) {
  return owner === 'anonymous' ? FAVORITES_KEY : `${FAVORITES_ACCOUNT_CACHE_PREFIX}${owner.slice('account:'.length)}`;
}

function parseFavorites(value: string | null) {
  if (!value) return new Set<string>();
  try {
    const parsed = JSON.parse(value) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

/**
 * O cache legado era único e identificado por uma chave de proprietário. A
 * leitura só o migra quando ele pertence exatamente ao titular atual; nunca
 * transforma a seleção de uma conta em seleção de outra.
 */
function loadFavorites(owner: FavoriteOwner) {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const cached = window.localStorage.getItem(cacheKeyFor(owner));
    if (cached !== null) return parseFavorites(cached);
    const legacyOwner = window.localStorage.getItem(FAVORITES_OWNER_KEY);
    const ownerId = owner === 'anonymous' ? 'anonymous' : owner.slice('account:'.length);
    if ((owner === 'anonymous' && (!legacyOwner || legacyOwner === 'anonymous')) || legacyOwner === ownerId) {
      return parseFavorites(window.localStorage.getItem(FAVORITES_KEY));
    }
  } catch {
    // Um storage bloqueado não pode impedir a consulta pública do calendário.
  }
  return new Set<string>();
}

function saveFavorites(owner: FavoriteOwner, favorites: Set<string>) {
  window.localStorage.setItem(cacheKeyFor(owner), JSON.stringify([...favorites]));
  if (owner === 'anonymous') {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    window.localStorage.setItem(FAVORITES_OWNER_KEY, 'anonymous');
  }
}

function promotionKey(userId: string) {
  return `${FAVORITES_PROMOTION_KEY}${userId}`;
}

function applyIntents(remote: Set<string>, intents: Map<string, boolean>) {
  const next = new Set(remote);
  for (const [occasionId, saved] of intents) {
    // Uma leitura que já reflete a intenção pode liberar a sobreposição local.
    // Enquanto ela divergir, o snapshot é anterior à ação e não pode apagar nem
    // ressuscitar a escolha feita neste dispositivo.
    if (remote.has(occasionId) === saved) {
      intents.delete(occasionId);
      continue;
    }
    saved ? next.add(occasionId) : next.delete(occasionId);
  }
  return next;
}

export interface OccasionFavoritesOptions {
  userId?: string;
  authLoading: boolean;
  /** IDs disponíveis no ano exibido; dados antigos ou inválidos nunca chegam à UI. */
  knownOccasionIdsKey: string;
}

/**
 * Máquina de estado de favoritos da agenda. A UI só recebe a projeção do
 * titular atual; sync, promoção e rollback sempre carregam titular e época.
 */
export function useOccasionFavorites({ userId, authLoading, knownOccasionIdsKey }: OccasionFavoritesOptions) {
  const initialOwner = ownerFor(userId);
  const [favorites, setFavorites] = useState(() => loadFavorites(initialOwner));
  const [storageMessage, setStorageMessage] = useState('');
  const favoriteOwnerRef = useRef<FavoriteOwner>(initialOwner);
  const favoritesRef = useRef(favorites);
  const syncEpochRef = useRef(0);
  const mutationEpochRef = useRef(new Map<string, number>());
  // Intenções pertencem somente à sessão de sincronização do titular atual.
  // Ao trocar a conta, callbacks antigos já são invalidados pelo epoch e a
  // projeção seguinte começa pelo cache/servidor do novo titular.
  const intentsRef = useRef(new Map<string, boolean>());

  const replaceFavorites = useCallback((update: Set<string> | ((current: Set<string>) => Set<string>)) => {
    setFavorites((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      favoritesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      if (favoriteOwnerRef.current === initialOwner) saveFavorites(initialOwner, favorites);
    } catch {
      setStorageMessage('Seu navegador não permitiu salvar esta seleção neste dispositivo.');
    }
  }, [favorites, initialOwner]);

  useEffect(() => {
    const syncEpoch = ++syncEpochRef.current;
    if (authLoading) return;

    const owner = ownerFor(userId);
    const knownIds = new Set(knownOccasionIdsKey.split(',').filter(Boolean));
    // A origem anônima precisa ser lida antes da troca de titular para não ser
    // reatribuída pelo efeito de persistência e descartada em seguida.
    const anonymousFavorites = userId
      ? new Set([...loadFavorites('anonymous')].filter((id) => knownIds.has(id)))
      : new Set<string>();
    favoriteOwnerRef.current = owner;
    mutationEpochRef.current.clear();
    intentsRef.current.clear();
    const cachedFavorites = new Set([...loadFavorites(owner)].filter((id) => knownIds.has(id)));
    favoritesRef.current = cachedFavorites;
    setFavorites(cachedFavorites);

    if (!userId) return;

    let active = true;
    void listMyOccasionFavorites()
      .then(async (remote) => {
        if (!active || syncEpochRef.current !== syncEpoch || favoriteOwnerRef.current !== owner) return;
        const remoteFavorites = new Set(remote.filter((id) => knownIds.has(id)));
        let merged = remoteFavorites;
        try {
          const shouldPromoteLocal = !window.localStorage.getItem(promotionKey(userId)) && anonymousFavorites.size > 0;
          if (shouldPromoteLocal) {
            const localOnly = [...anonymousFavorites].filter((id) => !remoteFavorites.has(id));
            if (localOnly.length) await Promise.all(localOnly.map((id) => setMyOccasionFavorite(id, true)));
            if (!active || syncEpochRef.current !== syncEpoch || favoriteOwnerRef.current !== owner) return;
            merged = new Set([...remoteFavorites, ...localOnly]);
            localOnly.forEach((id) => intentsRef.current.set(id, true));
            window.localStorage.setItem(promotionKey(userId), '1');
          }
        } catch {
          if (active && syncEpochRef.current === syncEpoch && favoriteOwnerRef.current === owner) {
            favoritesRef.current = remoteFavorites;
            setFavorites(remoteFavorites);
            setStorageMessage('Não foi possível sincronizar todas as suas datas agora. Tente novamente mais tarde.');
          }
          return;
        }
        if (active && syncEpochRef.current === syncEpoch && favoriteOwnerRef.current === owner) {
          const next = applyIntents(merged, intentsRef.current);
          favoritesRef.current = next;
          setFavorites(next);
        }
      })
      .catch(() => {
        if (active && syncEpochRef.current === syncEpoch && favoriteOwnerRef.current === owner) {
          setStorageMessage('Não foi possível carregar suas datas salvas agora. Tente novamente mais tarde.');
        }
      });
    return () => { active = false; };
  }, [authLoading, knownOccasionIdsKey, userId]);

  // `storage` é emitido somente nas outras abas do mesmo navegador. A ação
  // local ainda prevalece enquanto houver uma intenção pendente; assim, uma
  // gravação concorrente em outra aba não desfaz uma escolha recém-feita.
  useEffect(() => {
    if (authLoading || typeof window === 'undefined') return;
    const owner = ownerFor(userId);
    const key = cacheKeyFor(owner);
    const knownIds = new Set(knownOccasionIdsKey.split(',').filter(Boolean));
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || (event.storageArea && event.storageArea !== window.localStorage) || favoriteOwnerRef.current !== owner) return;
      const externalFavorites = new Set([...parseFavorites(event.newValue)].filter((id) => knownIds.has(id)));
      const next = applyIntents(externalFavorites, intentsRef.current);
      favoritesRef.current = next;
      setFavorites(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [authLoading, knownOccasionIdsKey, userId]);

  const saveFavorite = useCallback((occasionId: string, nextSaved: boolean, onRollback?: () => void) => {
    setStorageMessage('');
    const owner = ownerFor(userId);
    if (authLoading || favoriteOwnerRef.current !== owner) {
      setStorageMessage('Estamos atualizando suas datas salvas. Tente novamente em instantes.');
      return false;
    }

    const previouslySaved = favoritesRef.current.has(occasionId);
    replaceFavorites((current) => {
      const next = new Set(current);
      nextSaved ? next.add(occasionId) : next.delete(occasionId);
      return next;
    });

    if (!userId) return true;
    const mutationKey = `${owner}:${occasionId}`;
    const mutationEpoch = (mutationEpochRef.current.get(mutationKey) || 0) + 1;
    const syncEpoch = syncEpochRef.current;
    mutationEpochRef.current.set(mutationKey, mutationEpoch);
    intentsRef.current.set(occasionId, nextSaved);
    void setMyOccasionFavorite(occasionId, nextSaved)
      .catch((error: unknown) => {
        if (syncEpochRef.current !== syncEpoch || favoriteOwnerRef.current !== owner || mutationEpochRef.current.get(mutationKey) !== mutationEpoch) return;
        replaceFavorites((current) => {
          const restored = new Set(current);
          previouslySaved ? restored.add(occasionId) : restored.delete(occasionId);
          return restored;
        });
        intentsRef.current.set(occasionId, previouslySaved);
        onRollback?.();
        setStorageMessage(error instanceof Error && error.message === 'occasion_favorite_limit_reached'
          ? 'Você já salvou o máximo de 100 datas na sua conta. Remova uma para adicionar outra.'
          : 'Não foi possível sincronizar esta alteração. Sua lista foi restaurada.');
      })
      .finally(() => {
        if (syncEpochRef.current === syncEpoch && favoriteOwnerRef.current === owner && mutationEpochRef.current.get(mutationKey) === mutationEpoch) {
          mutationEpochRef.current.delete(mutationKey);
        }
      });
    return true;
  }, [authLoading, replaceFavorites, userId]);

  // `useEffect` só atualiza o cache depois da renderização. A projeção abaixo
  // impede um commit com o titular B e favoritos pertencentes a A nesse intervalo.
  const visibleFavorites = !authLoading && favoriteOwnerRef.current === initialOwner ? favorites : EMPTY_FAVORITES;

  return { favorites: visibleFavorites, saveFavorite, storageMessage };
}
