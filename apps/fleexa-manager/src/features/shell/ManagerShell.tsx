import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, GitBranch, MessageSquareText, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings, UserRound } from 'lucide-react-native';

import { Button, Screen, StatusPill, colors, spacing } from '@fleexa/ui';
import { activeAccountIdForSession } from '@fleexa/domain';
import type { FleexaRuntimeConfig } from '@fleexa/config';

import { useConversations, useCurrentSession, useManagerCounters, usePipelineStages } from '@/src/api/queries';
import { useAuth } from '@/src/auth/AuthProvider';
import { useUiStore, type ManagerSection } from '@/src/state/uiStore';

const sections: Array<{ key: ManagerSection; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'conversations', label: 'Inbox' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'bookings', label: 'Bookings' },
];

const formatAmount = (amount?: { amount: string; currency: string } | null): string => {
  if (!amount) return 'No value';
  return `${Number(amount.amount).toLocaleString()} ${amount.currency}`;
};

export const ManagerShell = ({ config }: { config: FleexaRuntimeConfig }) => {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const activeSection = useUiStore(state => state.activeSection);
  const setActiveSection = useUiStore(state => state.setActiveSection);
  const sidebarCollapsed = useUiStore(state => state.sidebarCollapsed);
  const toggleSidebar = useUiStore(state => state.toggleSidebar);
  const session = useCurrentSession();
  const accountId = session.data ? activeAccountIdForSession(session.data) : null;
  const counters = useManagerCounters(accountId);
  const conversations = useConversations(accountId);
  const stages = usePipelineStages(accountId);
  const isWide = width >= 900;

  const displayName = session.data?.user.name ?? 'Manager';
  const apiStatusLabel =
    config.apiMode === 'mock' ? 'Mock mode' : config.apiDriver === 'chatwoot' ? 'Chatwoot local' : 'Live API';
  const accountName = useMemo(() => {
    if (!session.data || !accountId) return 'No account';
    return session.data.memberships.find(membership => membership.accountId === accountId)?.accountName ?? accountId;
  }, [accountId, session.data]);

  if (session.isLoading || !session.data) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.loadingText}>Loading manager workspace</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.layout, !isWide && styles.layoutNarrow]}>
        {isWide ? (
          <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
            <Pressable accessibilityRole="button" onPress={toggleSidebar} style={styles.iconButton}>
              {sidebarCollapsed ? <PanelLeftOpen size={20} color={colors.text} /> : <PanelLeftClose size={20} color={colors.text} />}
            </Pressable>
            {!sidebarCollapsed ? (
              <>
                <View>
                  <Text style={styles.sidebarTitle}>Fleexa</Text>
                  <Text style={styles.sidebarSubtitle}>{accountName}</Text>
                </View>
                <View style={styles.navList}>
                  {sections.map(section => (
                    <Pressable
                      accessibilityRole="button"
                      key={section.key}
                      onPress={() => setActiveSection(section.key)}
                      style={[styles.navItem, activeSection === section.key && styles.navItemActive]}
                    >
                      <Text style={[styles.navText, activeSection === section.key && styles.navTextActive]}>
                        {section.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <View style={styles.mobileNav}>
            {sections.map(section => (
              <Pressable
                accessibilityRole="button"
                key={section.key}
                onPress={() => setActiveSection(section.key)}
                style={[styles.mobileNavItem, activeSection === section.key && styles.mobileNavItemActive]}
              >
                <Text style={[styles.mobileNavText, activeSection === section.key && styles.navTextActive]}>
                  {section.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{accountName}</Text>
              <Text style={styles.heading}>Manager workspace</Text>
            </View>
            <View style={styles.headerActions}>
              <StatusPill label={apiStatusLabel} tone={config.apiMode === 'mock' ? 'warning' : 'success'} />
              <Button label="Sign out" variant="secondary" onPress={signOut} />
            </View>
          </View>

          <View style={styles.banner}>
            <RefreshCw size={18} color={colors.teal} />
            <Text style={styles.bannerText}>
              API-first shell connected through TanStack Query. Mock responses are limited to UI development.
            </Text>
          </View>

          <View style={styles.metricsGrid}>
            <Metric label="Open conversations" value={counters.data?.counters.openConversations ?? 0} />
            <Metric label="Unread" value={counters.data?.counters.unreadConversations ?? 0} tone="warning" />
            <Metric label="Active deals" value={counters.data?.counters.activeDeals ?? 0} />
            <Metric label="Bookings today" value={counters.data?.counters.bookingsToday ?? 0} tone="success" />
          </View>

          <View style={styles.workGrid}>
            <View style={styles.surface}>
              <View style={styles.sectionHeader}>
                <MessageSquareText size={20} color={colors.teal} />
                <Text style={styles.sectionTitle}>Conversation queue</Text>
              </View>
              {conversations.error ? <EmptyState label={conversations.error.message} tone="danger" /> : null}
              {conversations.data?.data.map(item => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() =>
                    router.push(`/conversation/${encodeURIComponent(item.id)}` as Href)
                  }
                  style={({ pressed }) => [styles.queueRow, pressed && styles.queueRowPressed]}
                >
                  <View style={styles.queueText}>
                    <Text style={styles.rowTitle}>{item.contact.displayName}</Text>
                    <Text numberOfLines={2} style={styles.rowMeta}>
                      {item.lastMessage?.text || item.title || 'No messages yet'}
                    </Text>
                  </View>
                  <StatusPill label={`${item.unreadCount} unread`} tone={item.unreadCount ? 'warning' : 'neutral'} />
                  <ChevronRight size={18} color={colors.textMuted} />
                </Pressable>
              ))}
              {!conversations.error && !conversations.data?.data.length ? (
                <EmptyState label="No conversations returned by the chat API." />
              ) : null}
            </View>

            <View style={styles.surface}>
              <View style={styles.sectionHeader}>
                <GitBranch size={20} color={colors.green} />
                <Text style={styles.sectionTitle}>Pipeline stages</Text>
              </View>
              {stages.data?.data.map(stage => (
                <View key={stage.id} style={styles.stageRow}>
                  <View>
                    <Text style={styles.rowTitle}>{stage.name}</Text>
                    <Text style={styles.rowMeta}>{stage.kind}</Text>
                  </View>
                  <Text style={styles.amountText}>{formatAmount(stage.counters?.totalAmount)}</Text>
                </View>
              ))}
              {!stages.data?.data.length ? <EmptyState label="No stages returned by the Manager API." /> : null}
            </View>
          </View>

          <View style={styles.footerStrip}>
            <View style={styles.footerItem}>
              <UserRound size={18} color={colors.textMuted} />
              <Text style={styles.footerText}>{displayName}</Text>
            </View>
            <View style={styles.footerItem}>
              <Settings size={18} color={colors.textMuted} />
              <Text style={styles.footerText}>{session.data.permissions.length} permissions</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
};

const Metric = ({ label, value, tone = 'info' }: { label: string; value: number; tone?: 'info' | 'success' | 'warning' }) => (
  <View style={styles.metric}>
    <StatusPill label={tone} tone={tone} />
    <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const EmptyState = ({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'danger' }) => (
  <Text style={[styles.emptyText, tone === 'danger' && styles.errorText]}>{label}</Text>
);

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
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  layoutNarrow: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  sidebarCollapsed: {
    width: 72,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sidebarSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  navList: {
    gap: spacing.sm,
  },
  navItem: {
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navItemActive: {
    backgroundColor: '#E7F7F6',
  },
  navText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  navTextActive: {
    color: colors.text,
  },
  mobileNav: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  mobileNavItem: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  mobileNavItemActive: {
    backgroundColor: '#E7F7F6',
  },
  mobileNavText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    gap: spacing.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  banner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  bannerText: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    minWidth: 180,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  metricValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  workGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  surface: {
    minWidth: 280,
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  queueRowPressed: {
    opacity: 0.76,
  },
  queueText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  amountText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: colors.red,
  },
  footerStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
