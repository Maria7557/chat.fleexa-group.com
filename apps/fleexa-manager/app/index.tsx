import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';

import { Screen, colors, spacing } from '@fleexa/ui';

import { useAuth } from '@/src/auth/AuthProvider';

export default function IndexRoute() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.loadingText}>Preparing secure session</Text>
      </Screen>
    );
  }

  return <Redirect href={isAuthenticated ? '/home' : '/login'} />;
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
