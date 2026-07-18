import { EnvironmentConfigError, createRuntimeConfig, type FleexaRuntimeConfig } from '@fleexa/config';

export type RuntimeConfigResult =
  | {
      ok: true;
      config: FleexaRuntimeConfig;
    }
  | {
      ok: false;
      issues: string[];
    };

export const getRuntimeConfig = (): RuntimeConfigResult => {
  try {
    return {
      ok: true,
      config: createRuntimeConfig({
        NODE_ENV: process.env.NODE_ENV,
        EXPO_PUBLIC_FLEEXA_APP_ENV: process.env.EXPO_PUBLIC_FLEEXA_APP_ENV,
        EXPO_PUBLIC_FLEEXA_API_MODE: process.env.EXPO_PUBLIC_FLEEXA_API_MODE,
        EXPO_PUBLIC_FLEEXA_API_DRIVER: process.env.EXPO_PUBLIC_FLEEXA_API_DRIVER,
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: process.env.EXPO_PUBLIC_FLEEXA_API_BASE_URL,
        EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID: process.env.EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID,
        EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
        SENTRY_DSN: process.env.SENTRY_DSN,
        EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
        SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
      }),
    };
  } catch (error) {
    if (error instanceof EnvironmentConfigError) {
      return { ok: false, issues: error.issues };
    }

    return { ok: false, issues: ['Unknown runtime configuration error'] };
  }
};
