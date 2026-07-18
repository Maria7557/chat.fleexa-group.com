export type AppEnvironment = 'development' | 'preview' | 'production';
export type ApiMode = 'live' | 'mock';

export interface RawRuntimeEnv {
  NODE_ENV?: string | undefined;
  EXPO_PUBLIC_FLEEXA_APP_ENV?: string | undefined;
  EXPO_PUBLIC_FLEEXA_API_MODE?: string | undefined;
  EXPO_PUBLIC_FLEEXA_API_BASE_URL?: string | undefined;
  EXPO_PUBLIC_SENTRY_DSN?: string | undefined;
  SENTRY_DSN?: string | undefined;
  EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE?: string | undefined;
  SENTRY_TRACES_SAMPLE_RATE?: string | undefined;
}

export interface FleexaRuntimeConfig {
  appEnv: AppEnvironment;
  apiMode: ApiMode;
  apiBaseUrl: string;
  isProduction: boolean;
  mockModeAllowed: boolean;
  sentry: {
    enabled: boolean;
    dsn: string | null;
    tracesSampleRate: number;
  };
}

export class EnvironmentConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid Fleexa Manager environment: ${issues.join('; ')}`);
    this.name = 'EnvironmentConfigError';
    this.issues = issues;
  }
}

const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:3000/api/fleexa-manager/v1';
const APP_ENVS = new Set<AppEnvironment>(['development', 'preview', 'production']);
const API_MODES = new Set<ApiMode>(['live', 'mock']);

const optionalTrim = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const normalizeUrl = (value: string): string => value.replace(/\/+$/, '');

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const parseAppEnv = (raw: RawRuntimeEnv, issues: string[]): AppEnvironment => {
  const value = optionalTrim(raw.EXPO_PUBLIC_FLEEXA_APP_ENV);
  if (!value) return raw.NODE_ENV === 'production' ? 'production' : 'development';
  if (APP_ENVS.has(value as AppEnvironment)) return value as AppEnvironment;
  issues.push('EXPO_PUBLIC_FLEEXA_APP_ENV must be development, preview, or production');
  return 'development';
};

const parseApiMode = (raw: RawRuntimeEnv, issues: string[]): ApiMode => {
  const value = optionalTrim(raw.EXPO_PUBLIC_FLEEXA_API_MODE) ?? 'live';
  if (API_MODES.has(value as ApiMode)) return value as ApiMode;
  issues.push('EXPO_PUBLIC_FLEEXA_API_MODE must be live or mock');
  return 'live';
};

const parseSampleRate = (raw: RawRuntimeEnv, appEnv: AppEnvironment, issues: string[]): number => {
  const value = optionalTrim(raw.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? raw.SENTRY_TRACES_SAMPLE_RATE);
  if (!value) return appEnv === 'production' ? 0.1 : 0;

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;

  issues.push('Sentry traces sample rate must be a number between 0 and 1');
  return 0;
};

export const createRuntimeConfig = (raw: RawRuntimeEnv = {}): FleexaRuntimeConfig => {
  const issues: string[] = [];
  const appEnv = parseAppEnv(raw, issues);
  const apiMode = parseApiMode(raw, issues);
  const apiBaseUrl = normalizeUrl(
    optionalTrim(raw.EXPO_PUBLIC_FLEEXA_API_BASE_URL) ?? DEFAULT_LOCAL_API_BASE_URL
  );
  const sentryDsn = optionalTrim(raw.EXPO_PUBLIC_SENTRY_DSN ?? raw.SENTRY_DSN) ?? null;
  const tracesSampleRate = parseSampleRate(raw, appEnv, issues);
  const isProduction = appEnv === 'production';

  if (!isValidHttpUrl(apiBaseUrl)) {
    issues.push('EXPO_PUBLIC_FLEEXA_API_BASE_URL must be a valid http(s) URL');
  }

  if (isProduction && apiMode === 'mock') {
    issues.push('mock API mode cannot be used for production acceptance');
  }

  if (isProduction && !apiBaseUrl.startsWith('https://')) {
    issues.push('production API base URL must use HTTPS');
  }

  if (sentryDsn && !isValidHttpUrl(sentryDsn)) {
    issues.push('Sentry DSN must be a valid URL when provided');
  }

  if (issues.length) {
    throw new EnvironmentConfigError(issues);
  }

  return {
    appEnv,
    apiMode,
    apiBaseUrl,
    isProduction,
    mockModeAllowed: !isProduction,
    sentry: {
      enabled: Boolean(sentryDsn),
      dsn: sentryDsn,
      tracesSampleRate,
    },
  };
};
