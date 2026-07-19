import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Edit3, RefreshCw, RotateCcw, Save, SendHorizontal } from 'lucide-react-native';

import { createClientMessageId, safeFleexaApiErrorMessage } from '@fleexa/api-client';
import { Button, Screen, StatusPill, colors, spacing } from '@fleexa/ui';
import {
  activeAccountIdForSession,
  type ConversationDetail,
  type DealDraft,
  type DealSummary,
  type ManagerMessage,
  type PipelineStage,
  type QualificationStatus,
} from '@fleexa/domain';

import {
  useConversationDetail,
  useCreateLinkedDeal,
  useCurrentSession,
  useLinkedDeal,
  useMessages,
  usePipelineStages,
  useSendTextMessage,
  useUpdateDeal,
} from '@/src/api/queries';

interface LocalOutgoingMessage {
  clientMessageId: string;
  text: string;
  state: 'sending' | 'failed';
  errorMessage?: string;
}

const qualificationOptions: Array<{ key: QualificationStatus; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'unqualified', label: 'Unqualified' },
];

const replyStateLabel = (state: 'waiting_for_reply' | 'replied'): string =>
  state === 'waiting_for_reply' ? 'Waiting' : 'Replied';

const replyStateTone = (state: 'waiting_for_reply' | 'replied'): 'warning' | 'success' =>
  state === 'waiting_for_reply' ? 'warning' : 'success';

const formatChatTime = (value: string | null | undefined): string => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatMoney = (value: DealSummary['amount']): string => {
  if (!value) return 'Not set';

  return `${value.amount} ${value.currency}`;
};

const hasDealUpdatePermission = (deal: DealSummary | null | undefined): boolean =>
  Boolean(deal?.permissions.includes('deals:update'));

export const ConversationScreen = ({ conversationId }: { conversationId: string | null }) => {
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [localOutgoing, setLocalOutgoing] = useState<LocalOutgoingMessage | null>(null);
  const session = useCurrentSession();
  const accountId = session.data ? activeAccountIdForSession(session.data) : null;
  const detail = useConversationDetail(accountId, conversationId);
  const messages = useMessages(accountId, conversationId);
  const linkedDeal = useLinkedDeal(accountId, conversationId);
  const pipelineStages = usePipelineStages(accountId);
  const createLinkedDeal = useCreateLinkedDeal(accountId, conversationId);
  const updateDeal = useUpdateDeal(accountId, conversationId);
  const sendText = useSendTextMessage(accountId, conversationId);
  const isWide = width >= 900;
  const isCompact = width < 560;
  const conversation = detail.data?.data;
  const dealPanel = (
    <DealPanel
      conversation={conversation}
      createDealError={createLinkedDeal.error}
      deal={linkedDeal.data?.deal ?? null}
      isCompact={!isWide}
      isCreating={createLinkedDeal.isPending}
      isLoading={linkedDeal.isLoading}
      isUpdating={updateDeal.isPending}
      linkState={linkedDeal.data?.linkState ?? 'missing'}
      loadError={linkedDeal.error}
      onCreate={() => createLinkedDeal.mutate()}
      onRefresh={() => {
        void linkedDeal.refetch();
      }}
      onUpdate={(dealId, deal, expectedVersion) => updateDeal.mutate({ dealId, deal, expectedVersion })}
      stages={pipelineStages.data?.data ?? []}
      stagesError={pipelineStages.error}
      updateError={updateDeal.error}
    />
  );
  const sortedMessages = useMemo(
    () => [...(messages.data?.data ?? [])].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages.data?.data]
  );
  const localOutgoingDelivered = Boolean(
    localOutgoing && sortedMessages.some(message => message.clientMessageId === localOutgoing.clientMessageId)
  );
  const visibleLocalOutgoing = localOutgoingDelivered ? null : localOutgoing;
  const visibleSendError = localOutgoingDelivered ? null : sendError;
  const canSend = Boolean(conversation?.canReply && draft.trim() && accountId && conversationId && !sendText.isPending);

  const sendOutgoing = async (outgoing: Pick<LocalOutgoingMessage, 'clientMessageId' | 'text'>) => {
    setSendError(null);
    setLocalOutgoing({ ...outgoing, state: 'sending' });

    try {
      await sendText.mutateAsync(outgoing);
      setDraft('');
      setLocalOutgoing(current => (current?.clientMessageId === outgoing.clientMessageId ? null : current));
    } catch (error) {
      const message = safeFleexaApiErrorMessage(error);
      setSendError(message);
      setLocalOutgoing(current =>
        current?.clientMessageId === outgoing.clientMessageId
          ? { ...outgoing, state: 'failed', errorMessage: message }
          : current
      );
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !accountId || !conversationId) return;

    setDraft('');
    await sendOutgoing({
      clientMessageId: createClientMessageId(),
      text,
    });
  };

  const handleRetry = async () => {
    if (localOutgoing?.state !== 'failed') return;
    await sendOutgoing({
      clientMessageId: localOutgoing.clientMessageId,
      text: localOutgoing.text,
    });
  };

  const handleEditFailed = () => {
    if (!localOutgoing) return;
    setDraft(localOutgoing.text);
    setLocalOutgoing(null);
    setSendError(null);
  };

  if (session.isLoading || !session.data) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.loadingText}>Loading session</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={[styles.header, isCompact && styles.headerCompact]}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={styles.title}>
              {conversation?.contact.displayName ?? 'Conversation'}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {conversation?.channel.displayName ?? conversationId ?? 'Chat'}
            </Text>
          </View>
          {conversation ? (
            <View style={styles.headerPills}>
              <StatusPill label={conversation.status} tone={conversation.status === 'open' ? 'success' : 'neutral'} />
              <StatusPill label={replyStateLabel(conversation.replyState)} tone={replyStateTone(conversation.replyState)} />
              {conversation.unreadCount > 0 ? (
                <StatusPill label={`${conversation.unreadCount} unread`} tone="warning" />
              ) : null}
            </View>
          ) : null}
          <Pressable
            accessibilityLabel="Refresh conversation"
            accessibilityRole="button"
            onPress={() => {
              if (!accountId || !conversationId) return;
              void detail.refetch();
              void messages.refetch();
              void linkedDeal.refetch();
            }}
            style={styles.iconButton}
          >
            <RefreshCw size={19} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.body, isWide && styles.bodyWide]}>
          {isWide ? (
            <View style={styles.desktopLayout}>
              <View style={styles.chatColumn}>
                <ConversationThread
                  detailError={detail.error}
                  isCompact={isCompact}
                  isLoading={detail.isLoading || messages.isLoading}
                  messagesError={messages.error}
                  onEditFailed={handleEditFailed}
                  onRetry={handleRetry}
                  sortedMessages={sortedMessages}
                  visibleLocalOutgoing={visibleLocalOutgoing}
                />
                <Composer
                  canSend={canSend}
                  conversation={conversation}
                  draft={draft}
                  isCompact={isCompact}
                  isSending={sendText.isPending}
                  onChangeDraft={setDraft}
                  onSend={handleSend}
                  sendError={visibleSendError}
                />
              </View>
              {dealPanel}
            </View>
          ) : (
            <>
              <ConversationThread
                detailError={detail.error}
                isCompact={isCompact}
                isLoading={detail.isLoading || messages.isLoading}
                messagesError={messages.error}
                onEditFailed={handleEditFailed}
                onRetry={handleRetry}
                sortedMessages={sortedMessages}
                visibleLocalOutgoing={visibleLocalOutgoing}
              />
              {dealPanel}
              <Composer
                canSend={canSend}
                conversation={conversation}
                draft={draft}
                isCompact={isCompact}
                isSending={sendText.isPending}
                onChangeDraft={setDraft}
                onSend={handleSend}
                sendError={visibleSendError}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const ConversationThread = ({
  detailError,
  isCompact,
  isLoading,
  messagesError,
  onEditFailed,
  onRetry,
  sortedMessages,
  visibleLocalOutgoing,
}: {
  detailError: unknown;
  isCompact: boolean;
  isLoading: boolean;
  messagesError: unknown;
  onEditFailed: () => void;
  onRetry: () => void;
  sortedMessages: ManagerMessage[];
  visibleLocalOutgoing: LocalOutgoingMessage | null;
}) => (
  <View style={styles.thread} testID="conversation-thread">
    {detailError ? <InlineError message={safeFleexaApiErrorMessage(detailError)} /> : null}
    {messagesError ? <InlineError message={safeFleexaApiErrorMessage(messagesError)} /> : null}
    {isLoading ? (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    ) : null}

    <ScrollView contentContainerStyle={[styles.messages, isCompact && styles.messagesCompact]}>
      {sortedMessages.map(message => (
        <MessageBubble compact={isCompact} key={message.id} message={message} />
      ))}
      {visibleLocalOutgoing ? (
        <LocalOutgoingBubble
          compact={isCompact}
          message={visibleLocalOutgoing}
          onEdit={onEditFailed}
          onRetry={onRetry}
        />
      ) : null}
      {!isLoading && !sortedMessages.length ? (
        <Text style={styles.emptyText}>No messages returned by the chat API.</Text>
      ) : null}
    </ScrollView>
  </View>
);

const Composer = ({
  canSend,
  conversation,
  draft,
  isCompact,
  isSending,
  onChangeDraft,
  onSend,
  sendError,
}: {
  canSend: boolean;
  conversation: ConversationDetail | undefined;
  draft: string;
  isCompact: boolean;
  isSending: boolean;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  sendError: string | null;
}) => (
  <View style={styles.composerWrap}>
    {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
    {conversation && !conversation.canReply ? <Text style={styles.errorText}>Reply window is closed.</Text> : null}
    <View style={[styles.composer, isCompact && styles.composerCompact]}>
      <TextInput
        multiline
        onChangeText={onChangeDraft}
        placeholder="Write a message"
        placeholderTextColor="#7A8497"
        style={styles.composerInput}
        value={draft}
      />
      <Button
        label={isSending ? 'Sending' : 'Send'}
        disabled={!canSend}
        loading={isSending}
        leftIcon={<SendHorizontal size={18} color="#FFFFFF" />}
        onPress={onSend}
        style={[styles.sendButton, isCompact && styles.sendButtonCompact]}
      />
    </View>
  </View>
);

const DealPanel = ({
  conversation,
  createDealError,
  deal,
  isCompact,
  isCreating,
  isLoading,
  isUpdating,
  linkState,
  loadError,
  onCreate,
  onRefresh,
  onUpdate,
  stages,
  stagesError,
  updateError,
}: {
  conversation: ConversationDetail | undefined;
  createDealError: unknown;
  deal: DealSummary | null;
  isCompact: boolean;
  isCreating: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  linkState: 'linked' | 'missing' | 'inaccessible';
  loadError: unknown;
  onCreate: () => void;
  onRefresh: () => void;
  onUpdate: (dealId: string, deal: DealDraft, expectedVersion: number) => void;
  stages: PipelineStage[];
  stagesError: unknown;
  updateError: unknown;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amountDraft, setAmountDraft] = useState('');
  const [lostReasonDraft, setLostReasonDraft] = useState('');
  const canUpdate = hasDealUpdatePermission(deal);
  const canMoveStage = isEditing && canUpdate && stages.length > 0 && !stagesError;
  const actionError = loadError || createDealError || updateError;
  const showLostReason = Boolean(
    deal?.lostReason ||
      deal?.qualificationStatus === 'unqualified' ||
      deal?.stageKey === 'lost' ||
      deal?.stage.key === 'lost'
  );

  const updateCurrentDeal = (draft: DealDraft) => {
    if (!deal || !canUpdate) return;
    onUpdate(deal.id, draft, deal.version);
  };

  const toggleEditing = () => {
    if (!isEditing) {
      setAmountDraft(deal?.amount?.amount ?? '');
      setLostReasonDraft(deal?.lostReason?.label ?? '');
    }
    setIsEditing(value => !value);
  };

  const clientName = deal?.clientName || deal?.contact?.displayName || conversation?.contact.displayName || 'Unknown client';
  const phone = deal?.contact?.phone || conversation?.contact.phone || 'No phone';
  const source = deal?.trafficSource?.label || deal?.sourceAttribution?.trafficSourceLabel || 'Not set';
  const leadOrigin = deal?.leadOrigin?.label || deal?.sourceAttribution?.leadOriginLabel || 'Not set';
  const assignedManager = deal?.assignedManager?.displayName || deal?.assignee?.displayName || 'Unassigned';
  const qualification = deal?.qualificationStatus ?? deal?.qualification?.status ?? 'pending';

  return (
    <View
      style={[styles.dealPanel, isCompact ? styles.dealPanelMobile : styles.dealPanelDesktop]}
      testID={isCompact ? 'deal-panel-mobile' : 'deal-panel-desktop'}
    >
      <View style={styles.dealPanelHeader}>
        <View style={styles.dealPanelTitleWrap}>
          <Text style={styles.dealPanelTitle}>Deal</Text>
          <Text numberOfLines={1} style={styles.dealPanelSubtitle}>
            {deal ? deal.title : linkState === 'inaccessible' ? 'Restricted' : 'Not linked'}
          </Text>
        </View>
        <Pressable accessibilityLabel="Refresh linked deal" accessibilityRole="button" onPress={onRefresh} style={styles.smallIconButton}>
          <RefreshCw size={16} color={colors.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.dealLoading}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : null}

      {actionError ? <InlineError message={safeFleexaApiErrorMessage(actionError)} /> : null}

      {!isLoading && !deal ? (
        <View style={styles.dealPanelContent}>
          <FieldRow label="Client" value={clientName} />
          <FieldRow label="Phone" value={phone} />
          <Button
            disabled={linkState === 'inaccessible'}
            label={isCreating ? 'Creating' : 'Create deal'}
            loading={isCreating}
            leftIcon={<Edit3 size={16} color="#FFFFFF" />}
            onPress={onCreate}
            style={styles.panelButton}
            testID="deal-panel-create"
          />
        </View>
      ) : null}

      {deal ? (
        <ScrollView contentContainerStyle={styles.dealPanelContent}>
          <View style={styles.dealActions}>
            <Button
              disabled={!canUpdate}
              label={isEditing ? 'Done' : 'Edit deal'}
              leftIcon={<Edit3 size={16} color={isEditing ? '#FFFFFF' : colors.text} />}
              onPress={toggleEditing}
              style={styles.panelButton}
              testID="deal-panel-edit"
              variant={isEditing ? 'primary' : 'secondary'}
            />
          </View>

          <FieldRow label="Client" value={clientName} />
          <FieldRow label="Phone" value={phone} />
          <FieldRow label="Source" value={source} />
          <FieldRow label="Lead origin" value={leadOrigin} />
          <FieldRow label="Stage" value={deal.stage.name || deal.stageKey || 'Not set'} />
          <FieldRow label="Amount" value={formatMoney(deal.amount)} />
          <FieldRow label="Assigned" value={assignedManager} />
          <FieldRow label="Qualification" value={qualification} />
          {showLostReason ? <FieldRow label="Lost reason" value={deal.lostReason?.label || 'Not set'} /> : null}

          {isEditing && canUpdate ? (
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Amount</Text>
              <View style={styles.inlineEditRow}>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={setAmountDraft}
                  placeholder="0"
                  placeholderTextColor="#7A8497"
                  style={styles.inlineInput}
                  value={amountDraft}
                />
                <Button
                  disabled={!amountDraft.trim()}
                  label="Save"
                  leftIcon={<Save size={15} color="#FFFFFF" />}
                  loading={isUpdating}
                  onPress={() =>
                    updateCurrentDeal({
                      amount: {
                        amount: amountDraft.trim(),
                        currency: deal.currency || deal.amount?.currency || 'AED',
                      },
                      currency: deal.currency || deal.amount?.currency || 'AED',
                    })
                  }
                  style={styles.inlineButton}
                  testID="deal-panel-save-amount"
                />
              </View>

              <Text style={styles.editLabel}>Qualification</Text>
              <View style={styles.segmentWrap}>
                {qualificationOptions.map(option => {
                  const selected = qualification === option.key;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isUpdating}
                      key={option.key}
                      onPress={() => updateCurrentDeal({ qualificationStatus: option.key })}
                      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
                    >
                      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {canMoveStage ? (
                <>
                  <Text style={styles.editLabel}>Stage</Text>
                  <View style={styles.segmentWrap}>
                    {stages.map(stage => {
                      const selected = deal.stage.id === stage.id || deal.stageKey === stage.key;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          disabled={isUpdating}
                          key={stage.id}
                          onPress={() => updateCurrentDeal({ stageKey: stage.key })}
                          style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
                        >
                          <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{stage.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {showLostReason ? (
                <>
                  <Text style={styles.editLabel}>Lost reason</Text>
                  <View style={styles.inlineEditRow}>
                    <TextInput
                      onChangeText={setLostReasonDraft}
                      placeholder="Reason"
                      placeholderTextColor="#7A8497"
                      style={styles.inlineInput}
                      value={lostReasonDraft}
                    />
                    <Button
                      disabled={!lostReasonDraft.trim()}
                      label="Save"
                      leftIcon={<Save size={15} color="#FFFFFF" />}
                      loading={isUpdating}
                      onPress={() => updateCurrentDeal({ lostReasonLabel: lostReasonDraft.trim() })}
                      style={styles.inlineButton}
                      testID="deal-panel-save-lost-reason"
                    />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
};

const FieldRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldRowLabel}>{label}</Text>
    <Text numberOfLines={2} style={styles.fieldRowValue}>
      {value}
    </Text>
  </View>
);

const InlineError = ({ message }: { message: string }) => (
  <View style={styles.inlineError}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const MessageBubble = ({ compact, message }: { compact: boolean; message: ManagerMessage }) => {
  const outgoing = message.direction === 'outgoing';
  const privateNote = message.visibility === 'private_note';
  const time = formatChatTime(message.createdAt);

  return (
    <View style={[styles.messageRow, outgoing && styles.messageRowOutgoing]}>
      <View style={[styles.bubble, compact && styles.bubbleCompact, outgoing && styles.bubbleOutgoing, privateNote && styles.bubblePrivate]}>
        <Text style={[styles.messageText, outgoing && styles.messageTextOutgoing]}>
          {message.text || '[non-text message]'}
        </Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.metaText, outgoing && styles.metaTextOutgoing]}>
            {message.sender?.displayName ?? (outgoing ? 'Manager' : 'Contact')}
          </Text>
          {time ? <Text style={[styles.metaText, outgoing && styles.metaTextOutgoing]}>{time}</Text> : null}
          {message.deliveryStatus ? (
            <Text style={[styles.metaText, outgoing && styles.metaTextOutgoing]}>{message.deliveryStatus}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const LocalOutgoingBubble = ({
  compact,
  message,
  onEdit,
  onRetry,
}: {
  compact: boolean;
  message: LocalOutgoingMessage;
  onEdit: () => void;
  onRetry: () => void;
}) => {
  const failed = message.state === 'failed';

  return (
    <View style={[styles.messageRow, styles.messageRowOutgoing]}>
      <View style={[styles.bubble, compact && styles.bubbleCompact, styles.localBubble, failed && styles.localBubbleFailed]}>
        <Text style={styles.messageTextOutgoing}>{message.text}</Text>
        <View style={styles.messageMeta}>
          <Text style={styles.metaTextOutgoing}>{failed ? 'Failed' : 'Sending'}</Text>
        </View>
        {failed ? (
          <>
            {message.errorMessage ? <Text style={styles.localErrorText}>{message.errorMessage}</Text> : null}
            <View style={styles.retryActions}>
              <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryAction}>
                <RotateCcw size={14} color="#FFFFFF" />
                <Text style={styles.retryActionText}>Retry</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onEdit} style={styles.retryActionSecondary}>
                <Edit3 size={14} color={colors.text} />
                <Text style={styles.retryActionSecondaryText}>Edit</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  header: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerCompact: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1240,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  chatColumn: {
    flex: 1,
    minWidth: 0,
  },
  thread: {
    flex: 1,
  },
  center: {
    paddingTop: spacing.xl,
  },
  messages: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messagesCompact: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowOutgoing: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '68%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bubbleCompact: {
    maxWidth: '88%',
  },
  bubbleOutgoing: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  bubblePrivate: {
    borderColor: colors.amber,
    backgroundColor: '#FFF4D8',
  },
  localBubble: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  localBubbleFailed: {
    borderColor: colors.red,
    backgroundColor: colors.red,
  },
  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextOutgoing: {
    color: '#FFFFFF',
  },
  messageMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  metaTextOutgoing: {
    color: '#E7F7F6',
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  composerCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvas,
  },
  sendButton: {
    minWidth: 104,
  },
  sendButtonCompact: {
    width: '100%',
  },
  dealPanel: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dealPanelDesktop: {
    width: 320,
    borderLeftWidth: 1,
  },
  dealPanelMobile: {
    maxHeight: 320,
    borderTopWidth: 1,
  },
  dealPanelHeader: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dealPanelTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  dealPanelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dealPanelSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  smallIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  dealLoading: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealPanelContent: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  dealActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panelButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  fieldRow: {
    minHeight: 34,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fieldRowLabel: {
    width: 96,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldRowValue: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  editSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  editLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.canvas,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineButton: {
    minHeight: 38,
    minWidth: 84,
    paddingHorizontal: spacing.sm,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  segmentButton: {
    minHeight: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  segmentButtonSelected: {
    borderColor: colors.teal,
    backgroundColor: '#E7F7F6',
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: colors.teal,
  },
  inlineError: {
    margin: spacing.lg,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: '#FDE7EA',
    padding: spacing.md,
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
  },
  localErrorText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 17,
  },
  retryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  retryAction: {
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  retryActionSecondary: {
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  retryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  retryActionSecondaryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
