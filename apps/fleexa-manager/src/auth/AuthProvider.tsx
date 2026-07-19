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
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { FleexaApiError, type FleexaApiClient } from '@fleexa/api-client';
import type { FleexaRuntimeConfig } from '@fleexa/config';
import type { CurrentSessionResponse, LoginSessionRequest } from '@fleexa/domain';

import { ApiClientProvider, useFleexaApiClient } from '@/src/api/client';
import { createSecureValueStore } from '@/src/storage/secureStore';

const TOKEN_KEY = 'fleexa.manager.sessionToken';

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  session: CurrentSessionResponse | null;
  signIn(credentials: LoginSessionRequest): Promise<void>;
  signOut(): Promise<void>;
  tokenProvider(): string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthStateProviderProps {
  children: ReactNode;
  config: FleexaRuntimeConfig;
  tokenRef: MutableRefObject<string | null>;
}

const AuthStateProvider = ({ children, config, tokenRef }: AuthStateProviderProps) => {
  const client = useFleexaApiClient();
  const queryClient = useQueryClient();
  const tokenStore = useMemo(() => createSecureValueStore(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [session, setSession] = useState<CurrentSessionResponse | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const token = await tokenStore.getItem(TOKEN_KEY);
      if (!mounted) return;

      if (!token && (Platform.OS !== 'web' || config.apiMode === 'mock')) {
        if (mounted) setIsReady(true);
        return;
      }

      tokenRef.current = token ?? null;

      try {
        const restoredSession = await verifySession(client);
        if (!mounted) return;
        queryClient.setQueryData(['session', 'current'], restoredSession);
        setAccessToken(token ?? null);
        setSession(restoredSession);
      } catch (error) {
        if (!mounted) return;

        if (shouldClearStoredSession(error)) {
          tokenRef.current = null;
          await tokenStore.deleteItem(TOKEN_KEY);
          queryClient.clear();
          setAccessToken(null);
          setSession(null);
        } else {
          setAccessToken(token ?? null);
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [client, config.apiMode, queryClient, tokenRef, tokenStore]);

  const tokenProvider = useCallback(() => tokenRef.current, [tokenRef]);

  const signIn = useCallback(
    async (credentials: LoginSessionRequest) => {
      const email = credentials.email.trim();
      const password = credentials.password;
      const accountHint = credentials.accountHint?.trim() || null;
      if (!email || !password) throw new Error('Email and password are required');

      const previousToken = tokenRef.current;

      try {
        const login = await client.login({ email, password, accountHint, clientPlatform: managerClientPlatform() });
        const normalizedToken = login.accessToken?.trim() ?? null;
        if (login.auth.transport === 'bearer_token' && !normalizedToken) throw new Error('Session could not be created');

        tokenRef.current = normalizedToken;
        if (normalizedToken) {
          await tokenStore.setItem(TOKEN_KEY, normalizedToken);
        } else {
          await tokenStore.deleteItem(TOKEN_KEY);
        }
        queryClient.setQueryData(['session', 'current'], login.session);
        setAccessToken(normalizedToken);
        setSession(login.session);
      } catch (error) {
        tokenRef.current = previousToken;
        throw error;
      }
    },
    [client, queryClient, tokenRef, tokenStore]
  );

  const signOut = useCallback(async () => {
    try {
      await client.logout();
    } catch (error) {
      if (!shouldClearStoredSession(error)) throw error;
    } finally {
      tokenRef.current = null;
      await tokenStore.deleteItem(TOKEN_KEY);
      queryClient.clear();
      setAccessToken(null);
      setSession(null);
    }
  }, [client, queryClient, tokenRef, tokenStore]);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated: Boolean(session),
      accessToken,
      session,
      signIn,
      signOut,
      tokenProvider,
    }),
    [accessToken, isReady, session, signIn, signOut, tokenProvider]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const verifySession = async (client: FleexaApiClient): Promise<CurrentSessionResponse> => {
  return client.getCurrentSession();
};

const managerClientPlatform = (): NonNullable<LoginSessionRequest['clientPlatform']> => {
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'ios') return 'ios';
  return 'native';
};

const shouldClearStoredSession = (error: unknown): boolean => {
  if (!(error instanceof FleexaApiError)) return false;
  return error.code === 'unauthenticated' || error.code === 'invalid_credentials' || error.code === 'forbidden';
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
      <AuthStateProvider config={config} tokenRef={tokenRef}>
        {children}
      </AuthStateProvider>
    </ApiClientProvider>
  );
};

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
