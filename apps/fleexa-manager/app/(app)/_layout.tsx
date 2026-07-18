import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { Screen, colors, spacing } from '@fleexa/ui';

import { useAuth } from '@/src/auth/AuthProvider';

export default function AuthenticatedLayout() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.loadingText}>Checking session</Text>
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
