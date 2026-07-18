import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, GitBranch, MessageSquareText, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings, UserRound } from 'lucide-react-native';

import { FleexaApiError, safeFleexaApiErrorMessage } from '@fleexa/api-client';
import { Button, Screen, StatusPill, colors, spacing } from '@fleexa/ui';
import { activeAccountIdForSession, type ConversationFilter } from '@fleexa/domain';
import type { FleexaRuntimeConfig } from '@fleexa/config';

import { useConversations, useCurrentSession, useManagerCounters, usePipelineStages } from '@/src/api/queries';
import { useAuth } from '@/src/auth/AuthProvider';
import { PipelineScreen } from '@/src/features/pipeline/PipelineScreen';
import { useUiStore, type ManagerSection } from '@/src/state/uiStore';

const sections: Array<{ key: ManagerSection; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'conversations', label: 'Inbox' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'bookings', label: 'Bookings' },
];

const conversationFilters: Array<{ key: ConversationFilter; label: string }> = [
  { key: 'mine', label: 'My' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'unread', label: 'Unread' },
  { key: 'all', label: 'All' },
  { key: 'waiting_for_reply', label: 'Waiting' },
];

const formatAmount = (amount?: { amount: string; currency: string } | null): string => {
  if (!amount) return 'No value';
  return `${Number(amount.amount).toLocaleString()} ${amount.currency}`;
};

const replyStateLabel = (state: 'waiting_for_reply' | 'replied'): string =>
  state === 'waiting_for_reply' ? 'Waiting' : 'Replied';

const replyStateTone = (state: 'waiting_for_reply' | 'replied'): 'warning' | 'success' =>
  state === 'waiting_for_reply' ? 'warning' : 'success';

const initialsFor = (value: string): string => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('');
  return initials || '?';
};

const formatChatTime = (value: string | null | undefined): string => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const ManagerShell = ({ config }: { config: FleexaRuntimeConfig }) => {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('mine');
  const activeSection = useUiStore(state => state.activeSection);
  const setActiveSection = useUiStore(state => state.setActiveSection);
  const sidebarCollapsed = useUiStore(state => state.sidebarCollapsed);
  const toggleSidebar = useUiStore(state => state.toggleSidebar);
  const session = useCurrentSession();
  const accountId = session.data ? activeAccountIdForSession(session.data) : null;
  const counters = useManagerCounters(accountId);
  const conversations = useConversations(accountId, conversationFilter);
  const stages = usePipelineStages(accountId);
  const isWide = width >= 900;
  const isCompact = width < 620;
  const sessionExpired =
    session.error instanceof FleexaApiError &&
    (session.error.code === 'unauthenticated' || session.error.code === 'invalid_credentials');

  const displayName = session.data?.user.name ?? 'Manager';
  const apiStatusLabel =
    config.apiMode === 'mock' ? 'Mock mode' : config.apiDriver === 'chatwoot' ? 'Chatwoot local' : 'Live API';
  const accountName = useMemo(() => {
    if (!session.data || !accountId) return 'No account';
    return session.data.memberships.find(membership => membership.accountId === accountId)?.accountName ?? accountId;
  }, [accountId, session.data]);

  useEffect(() => {
    if (sessionExpired) void signOut();
  }, [sessionExpired, signOut]);

  if (sessionExpired) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.loadingText}>Returning to sign in</Text>
      </Screen>
    );
  }

  if (session.error) {
    return (
      <Screen style={styles.loading}>
        <Text style={styles.errorText}>{safeFleexaApiErrorMessage(session.error)}</Text>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
      </Screen>
    );
  }

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

        <ScrollView contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}>
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

          {activeSection === 'pipeline' ? (
            <PipelineScreen accountId={accountId} />
          ) : (
            <>
              <View style={styles.metricsGrid}>
                <Metric label="Assigned conversations" value={counters.data?.counters.assigned ?? 0} />
                <Metric label="Unassigned" value={counters.data?.counters.unassigned ?? 0} />
                <Metric label="Unread" value={counters.data?.counters.unread ?? 0} tone="warning" />
              </View>

              <View style={styles.workGrid}>
                <View style={[styles.surface, styles.chatSurface]}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleGroup}>
                      <MessageSquareText size={20} color={colors.teal} />
                      <Text style={styles.sectionTitle}>Conversation queue</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Refresh conversations"
                      accessibilityRole="button"
                      onPress={() => {
                        void conversations.refetch();
                        if (accountId) void counters.refetch();
                      }}
                      style={[styles.refreshButton, conversations.isFetching && styles.refreshButtonActive]}
                    >
                      <RefreshCw size={16} color={colors.text} />
                    </Pressable>
                  </View>
                  <View style={styles.filterTabs}>
                    {conversationFilters.map(filter => {
                      const selected = conversationFilter === filter.key;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          key={filter.key}
                          onPress={() => setConversationFilter(filter.key)}
                          style={[styles.filterTab, selected && styles.filterTabActive]}
                        >
                          <Text style={[styles.filterTabText, selected && styles.filterTabTextActive]}>
                            {filter.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {conversations.error ? (
                    <EmptyState label={safeFleexaApiErrorMessage(conversations.error)} tone="danger" />
                  ) : null}
                  {conversations.data?.data.map(item => {
                    const unread = item.unreadCount > 0;
                    const waiting = item.replyState === 'waiting_for_reply';
                    const assignedLabel = item.assignedManager?.displayName ?? 'Unassigned';
                    const latestAt = item.lastMessage?.createdAt ?? item.lastActivityAt;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={item.id}
                        onPress={() =>
                          router.push(`/conversation/${encodeURIComponent(item.id)}` as Href)
                        }
                        style={({ pressed }) => [
                          styles.queueRow,
                          unread && styles.queueRowUnread,
                          waiting && styles.queueRowWaiting,
                          pressed && styles.queueRowPressed,
                        ]}
                      >
                        <View style={[styles.queueAvatar, !item.assignedManager && styles.queueAvatarUnassigned]}>
                          <Text style={styles.queueAvatarText}>{initialsFor(item.contact.displayName)}</Text>
                        </View>
                        <View style={styles.queueText}>
                          <View style={styles.queueTopLine}>
                            <Text numberOfLines={1} style={styles.rowTitle}>
                              {item.contact.displayName}
                            </Text>
                            <Text style={styles.rowTime}>{formatChatTime(latestAt)}</Text>
                          </View>
                          <Text numberOfLines={1} style={[styles.rowMeta, unread && styles.rowMetaUnread]}>
                            {item.lastMessage?.text || item.title || 'No messages yet'}
                          </Text>
                          <View style={styles.queueBadges}>
                            <StatusPill label={replyStateLabel(item.replyState)} tone={replyStateTone(item.replyState)} />
                            <View style={[styles.assignmentChip, !item.assignedManager && styles.assignmentChipUnassigned]}>
                              <Text numberOfLines={1} style={styles.assignmentChipText}>
                                {assignedLabel}
                              </Text>
                            </View>
                            {unread ? <StatusPill label={`${item.unreadCount} unread`} tone="warning" /> : null}
                          </View>
                        </View>
                        <ChevronRight size={18} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
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
            </>
          )}
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
  contentCompact: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
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
  chatSurface: {
    flexGrow: 1.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonActive: {
    backgroundColor: '#E7F7F6',
    borderColor: colors.teal,
  },
  filterTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterTab: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filterTabActive: {
    borderColor: colors.teal,
    backgroundColor: '#E7F7F6',
  },
  filterTabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTabTextActive: {
    color: colors.text,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  queueRowUnread: {
    borderColor: '#BFEDEB',
    backgroundColor: '#F3FCFB',
  },
  queueRowWaiting: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  queueRowPressed: {
    opacity: 0.76,
  },
  queueAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F7F6',
  },
  queueAvatarUnassigned: {
    backgroundColor: colors.surfaceMuted,
  },
  queueAvatarText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  queueText: {
    flex: 1,
    minWidth: 0,
  },
  queueTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rowTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  rowMetaUnread: {
    color: colors.text,
    fontWeight: '700',
  },
  queueBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  assignmentChip: {
    maxWidth: 170,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  assignmentChipUnassigned: {
    backgroundColor: '#FDE7EA',
  },
  assignmentChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
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
