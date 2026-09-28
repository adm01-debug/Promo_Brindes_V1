import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { listMyOccasionFavorites, setMyOccasionFavorite } from './customerOccasionFavorites';

type FavoriteOwner = 'anonymous' | `account:${string}`;
type FavoriteIntent = { saved: boolean; version: number; writeStatus: 'pending' | 'succeeded' };
type FavoriteScope = { owner: FavoriteOwner; sessionEpoch: number };

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
    // A chave anônima é também a chave histórica. Antes de lê-la como cache
    // público precisamos provar que ela não pertence a uma conta anterior no
    // mesmo navegador.
    if (owner === 'anonymous') {
      const legacyOwner = window.localStorage.getItem(FAVORITES_OWNER_KEY);
      if (legacyOwner && legacyOwner !== 'anonymous') return new Set<string>();
      return parseFavorites(window.localStorage.getItem(FAVORITES_KEY));
    }
    const cached = window.localStorage.getItem(cacheKeyFor(owner));
    if (cached !== null) return parseFavorites(cached);
    const legacyOwner = window.localStorage.getItem(FAVORITES_OWNER_KEY);
    const ownerId = owner.slice('account:'.length);
    if (legacyOwner === ownerId) {
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

function applyIntents(confirmed: Set<string>, intents: Map<string, FavoriteIntent>) {
  const next = new Set(confirmed);
  for (const [occasionId, { saved }] of intents) {
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
  // O cache é útil para renderização imediata, mas a fonte de rollback das
  // mutações autenticadas é sempre o último estado confirmado pela RPC/lista.
  const confirmedFavoritesRef = useRef(new Set(favorites));
  const sessionEpochRef = useRef(0);
  const appliedSessionEpochRef = useRef(0);
  const readEpochRef = useRef(0);
  const mutationEpochRef = useRef(new Map<string, number>());
  const writeChainsRef = useRef(new Map<string, Promise<void>>());
  const committedAuthLoadingRef = useRef(authLoading);
  const committedOwnerRef = useRef<FavoriteOwner>(initialOwner);
  // Intenções pertencem somente à sessão de sincronização do titular atual.
  // Ao trocar a conta, callbacks antigos já são invalidados pelo epoch e a
  // projeção seguinte começa pelo cache/servidor do novo titular.
  const intentsRef = useRef(new Map<string, FavoriteIntent>());

  // Atualiza a identidade somente quando o render foi efetivamente commitado.
  // Layout effect fecha a janela anterior ao efeito passivo sem deixar que um
  // render concorrente abandonado vaze identidade para a árvore ainda ativa.
  useLayoutEffect(() => {
    if (committedOwnerRef.current !== initialOwner || committedAuthLoadingRef.current !== authLoading) {
      sessionEpochRef.current += 1;
    }
    committedOwnerRef.current = initialOwner;
    committedAuthLoadingRef.current = authLoading;
  }, [authLoading, initialOwner]);

  const replaceFavorites = useCallback((update: Set<string> | ((current: Set<string>) => Set<string>)) => {
    setFavorites((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      favoritesRef.current = next;
      return next;
    });
  }, []);

  const isCurrentScope = useCallback((scope: FavoriteScope) => (
    !committedAuthLoadingRef.current
    && committedOwnerRef.current === scope.owner
    && sessionEpochRef.current === scope.sessionEpoch
    && appliedSessionEpochRef.current === scope.sessionEpoch
    && favoriteOwnerRef.current === scope.owner
  ), []);

  const publishConfirmedAndIntents = useCallback((scope: FavoriteScope) => {
    if (!isCurrentScope(scope)) return;
    const next = applyIntents(confirmedFavoritesRef.current, intentsRef.current);
    favoritesRef.current = next;
    replaceFavorites(next);
  }, [isCurrentScope, replaceFavorites]);

  const reconcileConfirmedFavorites = useCallback((
    scope: FavoriteScope,
    confirmed: Set<string>,
    options: { readStartedBeforeActiveIntents?: boolean } = {},
  ) => {
    if (!isCurrentScope(scope)) return;
    const nextConfirmed = new Set(confirmed);
    for (const [occasionId, intent] of intentsRef.current) {
      if (options.readStartedBeforeActiveIntents) {
        // A carga inicial começou antes das interações que agora estão ativas.
        // Ela não pode substituir a base de rollback nem confirmar uma dessas
        // intenções, ainda que o valor coincida por acaso.
        confirmedFavoritesRef.current.has(occasionId)
          ? nextConfirmed.add(occasionId)
          : nextConfirmed.delete(occasionId);
        continue;
      }
      // Somente uma escrita já concluída pode ser liberada por uma observação
      // posterior com o mesmo valor. Uma intenção ainda na fila permanece viva.
      if (intent.writeStatus === 'succeeded' && confirmed.has(occasionId) === intent.saved) {
        intentsRef.current.delete(occasionId);
      }
    }
    confirmedFavoritesRef.current = nextConfirmed;
    publishConfirmedAndIntents(scope);
  }, [isCurrentScope, publishConfirmedAndIntents]);

  // O banco recebe operações idempotentes, mas não recebe uma versão do cliente.
  // Serializar por titular/data garante ordem no servidor. A guarda é feita no
  // instante do despacho (e não só no callback) para que uma operação já
  // enfileirada nunca seja enviada depois de logout ou troca de conta.
  const enqueueRemoteWrite = useCallback((scope: FavoriteScope, occasionId: string, saved: boolean) => {
    const mutationKey = `${scope.owner}:${occasionId}`;
    const previous = writeChainsRef.current.get(mutationKey) || Promise.resolve();
    const next = previous.catch(() => undefined).then(() => {
      if (!isCurrentScope(scope)) throw new Error('stale_favorite_session');
      return setMyOccasionFavorite(occasionId, saved);
    });
    writeChainsRef.current.set(mutationKey, next);
    void next.finally(() => {
      if (writeChainsRef.current.get(mutationKey) === next) writeChainsRef.current.delete(mutationKey);
    }).catch(() => undefined);
    return next;
  }, [isCurrentScope]);

  useEffect(() => {
    try {
      if (favoriteOwnerRef.current === initialOwner) saveFavorites(initialOwner, favorites);
    } catch {
      setStorageMessage('Seu navegador não permitiu salvar esta seleção neste dispositivo.');
    }
  }, [favorites, initialOwner]);

  useEffect(() => {
    const readEpoch = ++readEpochRef.current;
    if (authLoading) return;

    const owner = ownerFor(userId);
    const sessionEpoch = sessionEpochRef.current;
    const knownIds = new Set(knownOccasionIdsKey.split(',').filter(Boolean));
    // A origem anônima precisa ser lida antes da troca de titular para não ser
    // reatribuída pelo efeito de persistência e descartada em seguida.
    const anonymousFavorites = userId
      ? new Set([...loadFavorites('anonymous')].filter((id) => knownIds.has(id)))
      : new Set<string>();
    const sessionChanged = favoriteOwnerRef.current !== owner || appliedSessionEpochRef.current !== sessionEpoch;
    favoriteOwnerRef.current = owner;
    appliedSessionEpochRef.current = sessionEpoch;
    if (sessionChanged) {
      mutationEpochRef.current.clear();
      writeChainsRef.current.clear();
      intentsRef.current.clear();
      const cachedFavorites = new Set([...loadFavorites(owner)].filter((id) => knownIds.has(id)));
      confirmedFavoritesRef.current = new Set(cachedFavorites);
      favoritesRef.current = cachedFavorites;
      setFavorites(cachedFavorites);
    }

    if (!userId) return;

    let active = true;
    void listMyOccasionFavorites()
      .then(async (remote) => {
        const scope = { owner, sessionEpoch };
        if (!active || readEpochRef.current !== readEpoch || !isCurrentScope(scope)) return;
        const remoteFavorites = new Set(remote.filter((id) => knownIds.has(id)));
        let merged = remoteFavorites;
        try {
          const shouldPromoteLocal = !window.localStorage.getItem(promotionKey(userId)) && anonymousFavorites.size > 0;
          if (shouldPromoteLocal) {
            // Uma intenção autenticada criada enquanto a lista remota carregava
            // sempre vence a promoção do cache anônimo.
            const localOnly = [...anonymousFavorites].filter((id) => !remoteFavorites.has(id) && !intentsRef.current.has(id));
            if (localOnly.length) await Promise.all(localOnly.map((id) => enqueueRemoteWrite(scope, id, true)));
            if (!active || readEpochRef.current !== readEpoch || !isCurrentScope(scope)) return;
            merged = new Set([...remoteFavorites, ...localOnly]);
            window.localStorage.setItem(promotionKey(userId), '1');
          }
        } catch {
          if (active && readEpochRef.current === readEpoch && isCurrentScope(scope)) {
            reconcileConfirmedFavorites(scope, remoteFavorites, { readStartedBeforeActiveIntents: true });
            setStorageMessage('Não foi possível sincronizar todas as suas datas agora. Tente novamente mais tarde.');
          }
          return;
        }
        if (active && readEpochRef.current === readEpoch && isCurrentScope(scope)) {
          reconcileConfirmedFavorites(scope, merged, { readStartedBeforeActiveIntents: true });
        }
      })
      .catch(() => {
        const scope = { owner, sessionEpoch };
        if (active && readEpochRef.current === readEpoch && isCurrentScope(scope)) {
          setStorageMessage('Não foi possível carregar suas datas salvas agora. Tente novamente mais tarde.');
        }
      });
    return () => { active = false; };
  }, [authLoading, enqueueRemoteWrite, isCurrentScope, knownOccasionIdsKey, reconcileConfirmedFavorites, userId]);

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
      reconcileConfirmedFavorites({ owner, sessionEpoch: sessionEpochRef.current }, externalFavorites);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [authLoading, knownOccasionIdsKey, reconcileConfirmedFavorites, userId]);

  const saveFavorite = useCallback((occasionId: string, nextSaved: boolean, onRollback?: () => void) => {
    setStorageMessage('');
    const owner = ownerFor(userId);
    if (
      authLoading
      || committedOwnerRef.current !== owner
      || favoriteOwnerRef.current !== owner
      || appliedSessionEpochRef.current !== sessionEpochRef.current
    ) {
      setStorageMessage('Estamos atualizando suas datas salvas. Tente novamente em instantes.');
      return false;
    }

    const scope = { owner, sessionEpoch: sessionEpochRef.current };

    if (!userId) {
      replaceFavorites((current) => {
        const next = new Set(current);
        nextSaved ? next.add(occasionId) : next.delete(occasionId);
        confirmedFavoritesRef.current = new Set(next);
        return next;
      });
      return true;
    }
    const mutationKey = `${owner}:${occasionId}`;
    const mutationEpoch = (mutationEpochRef.current.get(mutationKey) || 0) + 1;
    mutationEpochRef.current.set(mutationKey, mutationEpoch);
    intentsRef.current.set(occasionId, { saved: nextSaved, version: mutationEpoch, writeStatus: 'pending' });
    publishConfirmedAndIntents(scope);
    void enqueueRemoteWrite(scope, occasionId, nextSaved)
      .then(() => {
        if (!isCurrentScope(scope)) return;
        confirmedFavoritesRef.current = new Set(confirmedFavoritesRef.current);
        nextSaved ? confirmedFavoritesRef.current.add(occasionId) : confirmedFavoritesRef.current.delete(occasionId);
        const currentIntent = intentsRef.current.get(occasionId);
        if (currentIntent?.version === mutationEpoch) {
          intentsRef.current.set(occasionId, { ...currentIntent, writeStatus: 'succeeded' });
        }
        // A confirmação da escrita não prova que uma lista já em voo reflete a
        // mutação. Mantemos a intenção até uma leitura/storage com o mesmo
        // valor confirmá-la, evitando que esse snapshot antigo reverta a UI.
        publishConfirmedAndIntents(scope);
      })
      .catch((error: unknown) => {
        if (!isCurrentScope(scope) || mutationEpochRef.current.get(mutationKey) !== mutationEpoch) return;
        // O estado confirmado não é modificado em uma falha. Só a intenção que
        // falhou é removida; uma intenção posterior preserva sua precedência.
        if (intentsRef.current.get(occasionId)?.version === mutationEpoch) intentsRef.current.delete(occasionId);
        publishConfirmedAndIntents(scope);
        onRollback?.();
        setStorageMessage(error instanceof Error && error.message === 'occasion_favorite_limit_reached'
          ? 'Você já salvou o máximo de 100 datas na sua conta. Remova uma para adicionar outra.'
          : 'Não foi possível sincronizar esta alteração. Sua lista foi restaurada.');
      })
      .finally(() => undefined);
    return true;
  }, [authLoading, enqueueRemoteWrite, isCurrentScope, publishConfirmedAndIntents, replaceFavorites, userId]);

  // `useEffect` só atualiza o cache depois da renderização. A projeção abaixo
  // impede um commit com o titular B e favoritos pertencentes a A nesse intervalo.
  const visibleFavorites = !authLoading && favoriteOwnerRef.current === initialOwner ? favorites : EMPTY_FAVORITES;

  return { favorites: visibleFavorites, saveFavorite, storageMessage };
}
