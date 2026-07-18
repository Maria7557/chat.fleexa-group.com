import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { KeyRound, Server, ShieldCheck } from 'lucide-react-native';

import { Button, Screen, StatusPill, TextField, colors, spacing } from '@fleexa/ui';
import type { FleexaRuntimeConfig } from '@fleexa/config';

import { useAuth } from '@/src/auth/AuthProvider';

export const LoginScreen = ({ config }: { config: FleexaRuntimeConfig }) => {
  const { isAuthenticated, isReady, signIn } = useAuth();
  const [token, setToken] = useState(config.apiMode === 'mock' ? 'mock-development-token' : '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isReady && isAuthenticated) {
    return <Redirect href="/home" />;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(token);
      router.replace('/home');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.panel}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <ShieldCheck size={30} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandName}>Fleexa Manager</Text>
              <Text style={styles.brandSubline}>Manager API workspace</Text>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              Use a Manager bearer token from the Fleexa API layer. Mock mode is for UI development only.
            </Text>
          </View>

          <View style={styles.metaRow}>
            <StatusPill label={config.appEnv} tone={config.isProduction ? 'danger' : 'info'} />
            <StatusPill label={config.apiMode === 'mock' ? 'mock API' : 'live API'} tone={config.apiMode === 'mock' ? 'warning' : 'success'} />
            <StatusPill label={config.sentry.enabled ? 'Sentry on' : 'Sentry off'} tone={config.sentry.enabled ? 'success' : 'neutral'} />
          </View>

          <View style={styles.form}>
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label="API base"
              editable={false}
              value={config.apiBaseUrl}
              leftIcon={<Server size={18} color={colors.textMuted} />}
            />
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label="Access token"
              onChangeText={setToken}
              placeholder="Paste bearer token"
              secureTextEntry
              value={token}
              error={error}
            />
            <Button
              label={config.apiMode === 'mock' ? 'Continue with mock session' : 'Continue'}
              loading={isSubmitting}
              leftIcon={<KeyRound size={18} color="#FFFFFF" />}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  brandSubline: {
    color: colors.textMuted,
    fontSize: 13,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
});
