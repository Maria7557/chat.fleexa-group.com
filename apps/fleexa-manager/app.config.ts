import type { ExpoConfig } from 'expo/config';

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryUrl = process.env.SENTRY_URL || 'https://sentry.io/';

const plugins: ExpoConfig['plugins'] = [
  'expo-router',
  'expo-secure-store',
];

if (sentryOrg && sentryProject) {
  plugins.push([
    '@sentry/react-native/expo',
    {
      organization: sentryOrg,
      project: sentryProject,
      url: sentryUrl,
    },
  ]);
}

export default {
  name: 'Fleexa Manager',
  slug: 'fleexa-manager',
  scheme: 'fleexamanager',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.fleexa.manager',
    supportsTablet: true,
  },
  android: {
    package: 'com.fleexa.manager',
  },
  web: {
    bundler: 'metro',
    output: 'static',
  },
  experiments: {
    typedRoutes: true,
  },
  plugins,
} satisfies ExpoConfig;
