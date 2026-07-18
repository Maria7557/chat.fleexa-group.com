import { describe, expect, it } from 'vitest';

import { EnvironmentConfigError, createRuntimeConfig } from './index';

describe('@fleexa/config', () => {
  it('defaults to live local development with Sentry disabled', () => {
    const config = createRuntimeConfig({ NODE_ENV: 'development' });

    expect(config.apiMode).toBe('live');
    expect(config.apiDriver).toBe('manager');
    expect(config.apiBaseUrl).toBe('http://localhost:3000/api/fleexa-manager/v1');
    expect(config.sentry.enabled).toBe(false);
  });

  it('allows explicit mock mode outside production', () => {
    const config = createRuntimeConfig({
      EXPO_PUBLIC_FLEEXA_APP_ENV: 'development',
      EXPO_PUBLIC_FLEEXA_API_MODE: 'mock',
    });

    expect(config.apiMode).toBe('mock');
    expect(config.mockModeAllowed).toBe(true);
  });

  it('rejects mock mode for production acceptance', () => {
    expect(() =>
      createRuntimeConfig({
        EXPO_PUBLIC_FLEEXA_APP_ENV: 'production',
        EXPO_PUBLIC_FLEEXA_API_MODE: 'mock',
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'https://api.fleexa.example.com/api/fleexa-manager/v1',
      })
    ).toThrow(EnvironmentConfigError);
  });

  it('allows explicit local Chatwoot driver with an account id', () => {
    const config = createRuntimeConfig({
      EXPO_PUBLIC_FLEEXA_APP_ENV: 'development',
      EXPO_PUBLIC_FLEEXA_API_DRIVER: 'chatwoot',
      EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'http://localhost:3000',
      EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID: '1',
    });

    expect(config.apiDriver).toBe('chatwoot');
    expect(config.chatwootAccountId).toBe('1');
  });

  it('requires the Manager API namespace for the Manager driver', () => {
    expect(() =>
      createRuntimeConfig({
        EXPO_PUBLIC_FLEEXA_APP_ENV: 'development',
        EXPO_PUBLIC_FLEEXA_API_DRIVER: 'manager',
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'http://localhost:3000',
      })
    ).toThrow(/Manager API base URL/);
  });

  it('requires a Chatwoot account id for the Chatwoot driver', () => {
    expect(() =>
      createRuntimeConfig({
        EXPO_PUBLIC_FLEEXA_APP_ENV: 'development',
        EXPO_PUBLIC_FLEEXA_API_DRIVER: 'chatwoot',
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'http://localhost:3000',
      })
    ).toThrow(/EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID/);
  });

  it('rejects the Chatwoot driver in production live mode', () => {
    expect(() =>
      createRuntimeConfig({
        EXPO_PUBLIC_FLEEXA_APP_ENV: 'production',
        EXPO_PUBLIC_FLEEXA_API_DRIVER: 'chatwoot',
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'https://chat.fleexa.example.com',
        EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID: '1',
      })
    ).toThrow(/production API driver must be manager/);
  });

  it('requires HTTPS API URLs in production', () => {
    expect(() =>
      createRuntimeConfig({
        EXPO_PUBLIC_FLEEXA_APP_ENV: 'production',
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'http://localhost:3000/api/fleexa-manager/v1',
      })
    ).toThrow(/production API base URL must use HTTPS/);
  });
});
