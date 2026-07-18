import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { FleexaApiClient } from '@fleexa/api-client';
import type { FleexaRuntimeConfig } from '@fleexa/config';
import type { CurrentSessionResponse } from '@fleexa/domain';

import { ApiClientProvider, useFleexaApiClient } from '@/src/api/client';
import { createSecureValueStore } from '@/src/storage/secureStore';

const TOKEN_KEY = 'fleexa.manager.accessToken';

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  signIn(accessToken: string): Promise<void>;
  signOut(): Promise<void>;
  tokenProvider(): string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthStateProviderProps {
  children: ReactNode;
  tokenRef: MutableRefObject<string | null>;
}

const AuthStateProvider = ({ children, tokenRef }: AuthStateProviderProps) => {
  const client = useFleexaApiClient();
  const queryClient = useQueryClient();
  const tokenStore = useMemo(() => createSecureValueStore(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    tokenStore
      .getItem(TOKEN_KEY)
      .then(token => {
        if (!mounted) return;
        tokenRef.current = token;
        setAccessToken(token);
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [tokenRef, tokenStore]);

  const tokenProvider = useCallback(() => tokenRef.current, [tokenRef]);

  const signIn = useCallback(
    async (token: string) => {
      const normalizedToken = token.trim();
      if (!normalizedToken) throw new Error('Access token is required');

      const previousToken = tokenRef.current;
      tokenRef.current = normalizedToken;

      try {
        const session = await verifySession(client);
        await tokenStore.setItem(TOKEN_KEY, normalizedToken);
        queryClient.setQueryData(['session', 'current'], session);
        setAccessToken(normalizedToken);
      } catch (error) {
        tokenRef.current = previousToken;
        throw error;
      }
    },
    [client, queryClient, tokenRef, tokenStore]
  );

  const signOut = useCallback(async () => {
    tokenRef.current = null;
    await tokenStore.deleteItem(TOKEN_KEY);
    queryClient.clear();
    setAccessToken(null);
  }, [queryClient, tokenRef, tokenStore]);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated: Boolean(accessToken),
      accessToken,
      signIn,
      signOut,
      tokenProvider,
    }),
    [accessToken, isReady, signIn, signOut, tokenProvider]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const verifySession = async (client: FleexaApiClient): Promise<CurrentSessionResponse> => {
  return client.getCurrentSession();
};

export interface AuthProviderProps {
  children: ReactNode;
  config: FleexaRuntimeConfig;
}

export const AuthProvider = ({ children, config }: AuthProviderProps) => {
  const tokenRef = useRef<string | null>(null);
  const tokenProvider = useCallback(() => tokenRef.current, []);

  return (
    <ApiClientProvider config={config} tokenProvider={tokenProvider}>
      <AuthStateProvider tokenRef={tokenRef}>{children}</AuthStateProvider>
    </ApiClientProvider>
  );
};

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
