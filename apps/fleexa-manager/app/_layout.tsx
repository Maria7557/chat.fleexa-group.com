import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button, Screen, colors, spacing } from '@fleexa/ui';

import { AuthProvider } from '@/src/auth/AuthProvider';
import { getRuntimeConfig } from '@/src/config/runtime';
import { initializeSentry, wrapWithSentry } from '@/src/observability/sentry';
import { ManagerRealtimeProvider } from '@/src/realtime/ManagerRealtimeProvider';

function RootLayout() {
  const runtimeConfig = useMemo(() => getRuntimeConfig(), []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
          },
        },
      })
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (runtimeConfig.ok) initializeSentry(runtimeConfig.config);
  }, [runtimeConfig]);

  if (!runtimeConfig.ok) {
    return <ConfigurationProblem issues={runtimeConfig.issues} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider config={runtimeConfig.config}>
          <ManagerRealtimeProvider enabled={runtimeConfig.config.apiMode === 'live'}>
            <Stack screenOptions={{ headerShown: false }} />
          </ManagerRealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const ConfigurationProblem = ({ issues }: { issues: string[] }) => {
  const retry = useCallback(() => {
    if (Platform.OS === 'web') window.location.reload();
  }, []);

  return (
    <Screen style={styles.problemScreen}>
      <View style={styles.problemPanel}>
        <Text style={styles.problemTitle}>Configuration problem</Text>
        {issues.map(issue => (
          <Text key={issue} style={styles.problemText}>
            {issue}
          </Text>
        ))}
        {Platform.OS === 'web' ? <Button label="Reload" onPress={retry} /> : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  problemScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  problemPanel: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.md,
  },
  problemTitle: {
    color: colors.red,
    fontSize: 24,
    fontWeight: '800',
  },
  problemText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});

export default wrapWithSentry(RootLayout);
