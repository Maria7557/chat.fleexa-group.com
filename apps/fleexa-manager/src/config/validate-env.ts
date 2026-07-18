import { createRuntimeConfig } from '@fleexa/config';

const config = createRuntimeConfig({
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
});

console.log(
  JSON.stringify(
    {
      appEnv: config.appEnv,
      apiMode: config.apiMode,
      apiDriver: config.apiDriver,
      apiBaseUrl: config.apiBaseUrl,
      chatwootAccountId: config.chatwootAccountId ?? null,
      sentryEnabled: config.sentry.enabled,
    },
    null,
    2
  )
);
