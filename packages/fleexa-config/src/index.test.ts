import { describe, expect, it } from 'vitest';

import { EnvironmentConfigError, createRuntimeConfig } from './index';

describe('@fleexa/config', () => {
  it('defaults to live local development with Sentry disabled', () => {
    const config = createRuntimeConfig({ NODE_ENV: 'development' });

    expect(config.apiMode).toBe('live');
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

  it('requires HTTPS API URLs in production', () => {
    expect(() =>
      createRuntimeConfig({
        EXPO_PUBLIC_FLEEXA_APP_ENV: 'production',
        EXPO_PUBLIC_FLEEXA_API_BASE_URL: 'http://localhost:3000/api/fleexa-manager/v1',
      })
    ).toThrow(/production API base URL must use HTTPS/);
  });
});
