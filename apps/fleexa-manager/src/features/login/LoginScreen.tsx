import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Building2, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react-native';

import { safeFleexaApiErrorMessage } from '@fleexa/api-client';
import { Button, Screen, StatusPill, TextField, colors, spacing } from '@fleexa/ui';
import type { FleexaRuntimeConfig } from '@fleexa/config';

import { useAuth } from '@/src/auth/AuthProvider';

const CREDENTIALS_REQUIRED = 'Email and password are required';

export const LoginScreen = ({ config }: { config: FleexaRuntimeConfig }) => {
  const { isAuthenticated, isReady, signIn } = useAuth();
  const [email, setEmail] = useState(config.apiMode === 'mock' ? 'manager@fleexa.example' : '');
  const [password, setPassword] = useState(config.apiMode === 'mock' ? 'mock-password' : '');
  const [accountHint, setAccountHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isReady && isAuthenticated) {
    return <Redirect href="/home" />;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await signIn({
        email,
        password,
        accountHint,
      });
      router.replace('/home');
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message === CREDENTIALS_REQUIRED
          ? CREDENTIALS_REQUIRED
          : safeFleexaApiErrorMessage(submitError)
      );
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
              <Text style={styles.brandSubline}>Manager workspace</Text>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Use your work email and password to open the manager workspace.</Text>
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
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="manager@company.com"
              textContentType="emailAddress"
              value={email}
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label="Password"
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              textContentType="password"
              value={password}
              leftIcon={<LockKeyhole size={18} color={colors.textMuted} />}
            />
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label="Workspace"
              onChangeText={setAccountHint}
              placeholder="Optional"
              value={accountHint}
              leftIcon={<Building2 size={18} color={colors.textMuted} />}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              label={config.apiMode === 'mock' ? 'Continue in demo mode' : 'Continue'}
              loading={isSubmitting}
              leftIcon={<LogIn size={18} color="#FFFFFF" />}
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
  errorText: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 18,
  },
});
