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
import { ArrowLeft, Edit3, RefreshCw, RotateCcw, SendHorizontal } from 'lucide-react-native';

import { createClientMessageId, safeFleexaApiErrorMessage } from '@fleexa/api-client';
import { Button, Screen, StatusPill, colors, spacing } from '@fleexa/ui';
import { activeAccountIdForSession, type ManagerMessage } from '@fleexa/domain';

import { useConversationDetail, useCurrentSession, useMessages, useSendTextMessage } from '@/src/api/queries';

interface LocalOutgoingMessage {
  clientMessageId: string;
  text: string;
  state: 'sending' | 'failed';
  errorMessage?: string;
}

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

export const ConversationScreen = ({ conversationId }: { conversationId: string | null }) => {
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [localOutgoing, setLocalOutgoing] = useState<LocalOutgoingMessage | null>(null);
  const session = useCurrentSession();
  const accountId = session.data ? activeAccountIdForSession(session.data) : null;
  const detail = useConversationDetail(accountId, conversationId);
  const messages = useMessages(accountId, conversationId);
  const sendText = useSendTextMessage(accountId, conversationId);
  const isWide = width >= 800;
  const isCompact = width < 560;
  const conversation = detail.data?.data;
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
            }}
            style={styles.iconButton}
          >
            <RefreshCw size={19} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.body, isWide && styles.bodyWide]}>
          <View style={styles.thread}>
            {detail.error ? <InlineError message={safeFleexaApiErrorMessage(detail.error)} /> : null}
            {messages.error ? <InlineError message={safeFleexaApiErrorMessage(messages.error)} /> : null}
            {detail.isLoading || messages.isLoading ? (
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
                  onEdit={handleEditFailed}
                  onRetry={handleRetry}
                />
              ) : null}
              {!messages.isLoading && !sortedMessages.length ? (
                <Text style={styles.emptyText}>No messages returned by the chat API.</Text>
              ) : null}
            </ScrollView>
          </View>

          <View style={styles.composerWrap}>
            {visibleSendError ? <Text style={styles.errorText}>{visibleSendError}</Text> : null}
            {conversation && !conversation.canReply ? <Text style={styles.errorText}>Reply window is closed.</Text> : null}
            <View style={[styles.composer, isCompact && styles.composerCompact]}>
              <TextInput
                multiline
                onChangeText={setDraft}
                placeholder="Write a message"
                placeholderTextColor="#7A8497"
                style={styles.composerInput}
                value={draft}
              />
              <Button
                label={sendText.isPending ? 'Sending' : 'Send'}
                disabled={!canSend}
                loading={sendText.isPending}
                leftIcon={<SendHorizontal size={18} color="#FFFFFF" />}
                onPress={handleSend}
                style={[styles.sendButton, isCompact && styles.sendButtonCompact]}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

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
    maxWidth: 1040,
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
