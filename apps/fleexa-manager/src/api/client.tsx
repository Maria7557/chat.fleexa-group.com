import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createFleexaApiClient, type FleexaApiClient } from '@fleexa/api-client';
import type { FleexaRuntimeConfig } from '@fleexa/config';

interface ApiClientContextValue {
  client: FleexaApiClient;
}

const ApiClientContext = createContext<ApiClientContextValue | null>(null);

export interface ApiClientProviderProps {
  children: ReactNode;
  config: FleexaRuntimeConfig;
  tokenProvider: () => string | null;
}

export const ApiClientProvider = ({ children, config, tokenProvider }: ApiClientProviderProps) => {
  const client = useMemo(
    () =>
      createFleexaApiClient({
        baseUrl: config.apiBaseUrl,
        mode: config.apiMode,
        tokenProvider,
      }),
    [config.apiBaseUrl, config.apiMode, tokenProvider]
  );

  return <ApiClientContext.Provider value={{ client }}>{children}</ApiClientContext.Provider>;
};

export const useFleexaApiClient = (): FleexaApiClient => {
  const value = useContext(ApiClientContext);
  if (!value) throw new Error('useFleexaApiClient must be used inside ApiClientProvider');
  return value.client;
};
