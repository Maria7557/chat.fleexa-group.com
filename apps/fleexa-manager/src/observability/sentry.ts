import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

import type { FleexaRuntimeConfig } from '@fleexa/config';

let initialized = false;

export const initializeSentry = (config: FleexaRuntimeConfig): boolean => {
  if (initialized) return true;
  if (!config.sentry.enabled || !config.sentry.dsn) return false;

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.appEnv,
    tracesSampleRate: config.sentry.tracesSampleRate,
    release: `${Constants.expoConfig?.slug ?? 'fleexa-manager'}@${Constants.expoConfig?.version ?? '0.1.0'}`,
  });

  initialized = true;
  return true;
};

export const wrapWithSentry = Sentry.wrap;
