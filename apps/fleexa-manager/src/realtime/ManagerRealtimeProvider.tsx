import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { activeAccountIdForSession, type ManagerRealtimeEvent } from '@fleexa/domain';

import { queryKeys } from '@/src/api/queryKeys';
import { useAuth } from '@/src/auth/AuthProvider';
import { createManagerActionCableSubscription } from '@/src/realtime/actionCable';
import { applyManagerRealtimeEventToCache, markRealtimeEventSeen, type RealtimeDedupeState } from '@/src/realtime/cache';

interface RealtimeStatusContextValue {
  connected: boolean;
  enabled: boolean;
}

const RealtimeStatusContext = createContext<RealtimeStatusContextValue>({
  connected: false,
  enabled: false,
});

export interface ManagerRealtimeProviderProps {
  children: ReactNode;
  enabled: boolean;
}

export const ManagerRealtimeProvider = ({ children, enabled }: ManagerRealtimeProviderProps) => {
  const { session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const dedupeState = useRef<RealtimeDedupeState>({ seenEventIds: [] });
  const lastCursor = useRef<string | null>(session?.realtime.lastEventCursor ?? null);
  const accountId = session ? activeAccountIdForSession(session) : null;
  const realtimeUrl = session?.realtime.url ?? null;
  const realtimeToken = Platform.OS === 'web' ? null : session?.realtime.token ?? null;

  useEffect(() => {
    lastCursor.current = session?.realtime.lastEventCursor ?? lastCursor.current;
  }, [session?.realtime.lastEventCursor]);

  useEffect(() => {
    if (!enabled || !accountId || !realtimeUrl) {
      return undefined;
    }

    const subscription = createManagerActionCableSubscription({
      url: realtimeUrl,
      accountId,
      authToken: realtimeToken,
      getLastCursor: () => lastCursor.current,
      onConnected: () => setConnected(true),
      onDisconnected: () => setConnected(false),
      onRejected: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.session });
      },
      onEvent: event => {
        if (event.accountId !== accountId) return;
        handleRealtimeEvent(event, {
          dedupeState,
          queryClient,
          setLastCursor: cursor => {
            lastCursor.current = cursor;
          },
          signOut,
        });
      },
    });

    return () => subscription.close();
  }, [accountId, enabled, queryClient, realtimeToken, realtimeUrl, signOut]);

  const value = useMemo(
    () => ({
      connected,
      enabled,
    }),
    [connected, enabled]
  );

  return <RealtimeStatusContext.Provider value={value}>{children}</RealtimeStatusContext.Provider>;
};

export const useManagerRealtimeConnected = (): boolean => {
  const value = useContext(RealtimeStatusContext);
  return value.enabled && value.connected;
};

const handleRealtimeEvent = (
  event: ManagerRealtimeEvent,
  helpers: {
    dedupeState: MutableRefObject<RealtimeDedupeState>;
    queryClient: QueryClient;
    setLastCursor(cursor: string): void;
    signOut(): Promise<void>;
  }
): void => {
  const result = markRealtimeEventSeen(helpers.dedupeState.current, event);
  helpers.dedupeState.current = result.state;
  if (result.duplicate) return;

  if (event.cursor) helpers.setLastCursor(event.cursor);

  if (event.eventType === 'session.revoked') {
    void helpers.signOut();
    return;
  }

  if (event.eventType === 'permissions.changed') {
    void helpers.queryClient.invalidateQueries({ queryKey: queryKeys.session });
    return;
  }

  applyManagerRealtimeEventToCache(helpers.queryClient, event);
};
