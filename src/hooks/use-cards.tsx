import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { subscribeToAuthChanges } from '@/services/auth';
import {
  deleteCardLocal,
  loadCardsLocal,
  pendingSyncCount,
  saveCardLocal,
  serialize,
} from '@/services/db';
import { cleanupDeletedCard, cleanupRemovedMediaItems } from '@/services/media-cleanup';
import { syncWithRemote } from '@/services/sync';
import type { BackItem, Card } from '@/types/card';
import { createCard, createEmergencyCard, generateId, isEmergencyCard } from '@/utils/cards';

const PERSIST_DEBOUNCE_MS = 800;
const RETRY_INTERVAL_MS = 45_000;

type CardsContextValue = {
  cards: Card[];
  hydrated: boolean;
  createNewCard: () => Card;
  createEmergencyCard: () => Card;
  getCard: (id: string) => Card | undefined;
  setCardName: (id: string, name: string) => void;
  setCardFront: (id: string, front: string) => void;
  setCardBack: (id: string, back: BackItem[]) => void;
  toggleFavorite: (id: string) => void;
  deleteCard: (id: string) => void;
};

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [initialSyncUserId, setInitialSyncUserId] = useState<string | null>(null);
  const cardsRef = useRef<Card[]>(cards);
  const userIdRef = useRef<string | null>(null);
  const autoEmergencySeededFor = useRef<string | null>(null);
  const persistTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const syncingRef = useRef(false);
  const syncRequestedRef = useRef(false);
  const runSyncRef = useRef<() => void>(() => {});

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const runSync = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) {
      return;
    }
    if (syncingRef.current) {
      // Uma sync já rodando: marca para repetir ao terminar (pega edições novas).
      syncRequestedRef.current = true;
      return;
    }
    syncingRef.current = true;
    try {
      const { pulled, deletedIds, pullSucceeded } = await syncWithRemote(userId);
      if (userIdRef.current !== userId) {
        return;
      }
      if (pullSucceeded) {
        setInitialSyncUserId(userId);
      }
      if (pulled.length === 0 && deletedIds.length === 0) {
        return;
      }
      setCards((current) => {
        const pulledById = new Map(pulled.map((card) => [card.id, card]));
        const deleted = new Set(deletedIds);
        const next = current
          .filter((card) => !deleted.has(card.id))
          .map((card) => {
            // Mantém a edição local pendente de flush em vez do remoto.
            if (persistTimers.current.has(card.id)) {
              return card;
            }
            return pulledById.get(card.id) ?? card;
          });
        for (const card of pulled) {
          if (
            !next.some((existing) => existing.id === card.id) &&
            !persistTimers.current.has(card.id)
          ) {
            next.push(card);
          }
        }
        return next;
      });
    } finally {
      syncingRef.current = false;
      if (syncRequestedRef.current) {
        syncRequestedRef.current = false;
        runSyncRef.current();
      }
    }
  }, []);

  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

  const persistCardNow = useCallback(
    async (cardId: string) => {
      const userId = userIdRef.current;
      const card = cardsRef.current.find((entry) => entry.id === cardId);
      if (!userId || !card) {
        return;
      }
      try {
        await serialize(() => saveCardLocal(userId, card));
        void runSync();
      } catch {
        // SQLite indisponível: segue em memória; nova edição tenta de novo.
      }
    },
    [runSync],
  );

  const schedulePersist = useCallback(
    (cardId: string) => {
      const existing = persistTimers.current.get(cardId);
      if (existing) {
        clearTimeout(existing);
      }
      persistTimers.current.set(
        cardId,
        setTimeout(() => {
          persistTimers.current.delete(cardId);
          void persistCardNow(cardId);
        }, PERSIST_DEBOUNCE_MS),
      );
    },
    [persistCardNow],
  );

  useEffect(() => {
    let active = true;

    const hydrateForUser = (userId: string | null) => {
      const previousUserId = userIdRef.current;
      userIdRef.current = userId;
      if (previousUserId !== userId) {
        setHydrated(false);
        setInitialSyncUserId(null);
        autoEmergencySeededFor.current = null;
      }
      persistTimers.current.forEach((timer) => clearTimeout(timer));
      persistTimers.current.clear();
      if (!userId) {
        cardsRef.current = [];
        setCards([]);
        setHydrated(true);
        return;
      }
      void loadCardsLocal(userId)
        .then((local) => {
          if (!active) {
            return;
          }
          cardsRef.current = local;
          setCards(local);
        })
        .catch(() => {
          // Sem cache local: começa vazio e tenta baixar do servidor.
        })
        .finally(() => {
          if (active) {
            setHydrated(true);
          }
          void runSync();
        });
    };

    void getCurrentUserId().then((userId) => {
      if (active) {
        hydrateForUser(userId);
      }
    });
    const unsubscribe = subscribeToAuthChanges((user) => {
      hydrateForUser(user?.id ?? null);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [runSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      const userId = userIdRef.current;
      if (!userId) {
        return;
      }
      if (initialSyncUserId !== userId) {
        void runSync();
        return;
      }
      void pendingSyncCount()
        .then((count) => {
          if (count > 0) {
            void runSync();
          }
        })
        .catch((error) => {
          console.warn('[sync] falha ao consultar fila pendente', error);
        });
    }, RETRY_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runSync();
      }
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [initialSyncUserId, runSync]);

  const addCard = useCallback(
    (card: Card): Card => {
      cardsRef.current = [...cardsRef.current, card];
      setCards((current) => [...current, card]);
      const userId = userIdRef.current;
      if (userId) {
        void serialize(() => saveCardLocal(userId, card))
          .then(() => runSync())
          .catch(() => {
            // Fica pendente até a próxima edição ou retry.
          });
      }
      return card;
    },
    [runSync],
  );

  const createNewCard = useCallback((): Card => {
    return addCard(createCard());
  }, [addCard]);

  const createEmergency = useCallback((): Card => {
    const existing = cardsRef.current.find(isEmergencyCard);
    if (existing) {
      return existing;
    }
    return addCard(createEmergencyCard(userIdRef.current ?? generateId()));
  }, [addCard]);

  // Sem cartões, o cartão de emergência é criado automaticamente na inicialização.
  // A decisão é tomada uma única vez por usuário em cada sessão do app.
  useEffect(() => {
    const userId = userIdRef.current;
    if (!hydrated || initialSyncUserId !== userId || !userId) {
      return;
    }
    if (autoEmergencySeededFor.current === userId) {
      return;
    }
    autoEmergencySeededFor.current = userId;
    if (cards.length === 0) {
      createEmergency();
    }
  }, [cards.length, createEmergency, hydrated, initialSyncUserId]);

  const getCard = useCallback(
    (id: string) => cards.find((card) => card.id === id),
    [cards],
  );

  const updateCard = useCallback(
    (id: string, updater: (card: Card) => Card) => {
      setCards((current) =>
        current.map((card) => (card.id === id ? updater(card) : card)),
      );
      schedulePersist(id);
    },
    [schedulePersist],
  );

  const setCardName = useCallback(
    (id: string, name: string) => {
      updateCard(id, (card) => ({ ...card, name }));
    },
    [updateCard],
  );

  const setCardFront = useCallback(
    (id: string, front: string) => {
      updateCard(id, (card) => ({ ...card, front }));
    },
    [updateCard],
  );

  const setCardBack = useCallback(
    (id: string, back: BackItem[]) => {
      const previous = cardsRef.current.find((card) => card.id === id)?.back ?? [];
      const nextIds = new Set(back.map((item) => item.id));
      const removed = previous.filter((item) => !nextIds.has(item.id));
      if (removed.length > 0) {
        void cleanupRemovedMediaItems(removed);
      }
      updateCard(id, (card) => ({ ...card, back }));
    },
    [updateCard],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      updateCard(id, (card) => ({ ...card, favorite: !card.favorite }));
    },
    [updateCard],
  );

  const deleteCard = useCallback(
    (id: string) => {
      const timer = persistTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        persistTimers.current.delete(id);
      }
      const userId = userIdRef.current;
      const card = cardsRef.current.find((entry) => entry.id === id);
      if (card) {
        void cleanupDeletedCard(card, userId);
      }
      cardsRef.current = cardsRef.current.filter((card) => card.id !== id);
      setCards((current) => current.filter((card) => card.id !== id));
      if (userId) {
        void serialize(() => deleteCardLocal(id))
          .then(() => runSync())
          .catch(() => {
            // Pendente até o próximo retry.
          });
      }
    },
    [runSync],
  );

  const value = useMemo(
    () => ({
      cards,
      hydrated,
      createNewCard,
      createEmergencyCard: createEmergency,
      getCard,
      setCardName,
      setCardFront,
      setCardBack,
      toggleFavorite,
      deleteCard,
    }),
    [
      cards,
      hydrated,
      createNewCard,
      createEmergency,
      getCard,
      setCardName,
      setCardFront,
      setCardBack,
      toggleFavorite,
      deleteCard,
    ],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

async function getCurrentUserId(): Promise<string | null> {
  const { getCurrentUser } = await import('@/services/auth');
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export function useCards(): CardsContextValue {
  const context = useContext(CardsContext);
  if (!context) {
    throw new Error('useCards deve ser usado dentro de CardsProvider');
  }
  return context;
}
