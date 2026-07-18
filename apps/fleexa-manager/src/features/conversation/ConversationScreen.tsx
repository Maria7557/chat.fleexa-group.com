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
import { ArrowLeft, SendHorizontal } from 'lucide-react-native';

import { Button, Screen, StatusPill, colors, spacing } from '@fleexa/ui';
import { activeAccountIdForSession, type ManagerMessage } from '@fleexa/domain';

import { useConversationDetail, useCurrentSession, useMessages, useSendTextMessage } from '@/src/api/queries';

export const ConversationScreen = ({ conversationId }: { conversationId: string | null }) => {
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const session = useCurrentSession();
  const accountId = session.data ? activeAccountIdForSession(session.data) : null;
  const detail = useConversationDetail(accountId, conversationId);
  const messages = useMessages(accountId, conversationId);
  const sendText = useSendTextMessage(accountId, conversationId);
  const isWide = width >= 800;
  const conversation = detail.data?.data;
  const sortedMessages = useMemo(
    () => [...(messages.data?.data ?? [])].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages.data?.data]
  );
  const canSend = Boolean(conversation?.canReply && draft.trim() && accountId && conversationId && !sendText.isPending);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !accountId || !conversationId) return;

    setSendError(null);
    try {
      await sendText.mutateAsync(text);
      setDraft('');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to send message');
    }
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
        <View style={styles.header}>
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
          {conversation ? <StatusPill label={conversation.status} tone={conversation.status === 'open' ? 'success' : 'neutral'} /> : null}
        </View>

        <View style={[styles.body, isWide && styles.bodyWide]}>
          <View style={styles.thread}>
            {detail.error ? <InlineError message={detail.error.message} /> : null}
            {messages.error ? <InlineError message={messages.error.message} /> : null}
            {detail.isLoading || messages.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.teal} />
              </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.messages}>
              {sortedMessages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {!messages.isLoading && !sortedMessages.length ? (
                <Text style={styles.emptyText}>No messages returned by the chat API.</Text>
              ) : null}
            </ScrollView>
          </View>

          <View style={styles.composerWrap}>
            {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
            {conversation && !conversation.canReply ? <Text style={styles.errorText}>Reply window is closed.</Text> : null}
            <View style={styles.composer}>
              <TextInput
                multiline
                onChangeText={setDraft}
                placeholder="Write a message"
                placeholderTextColor="#7A8497"
                style={styles.composerInput}
                value={draft}
              />
              <Button
                label="Send"
                disabled={!canSend}
                loading={sendText.isPending}
                leftIcon={<SendHorizontal size={18} color="#FFFFFF" />}
                onPress={handleSend}
                style={styles.sendButton}
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

const MessageBubble = ({ message }: { message: ManagerMessage }) => {
  const outgoing = message.direction === 'outgoing';
  const privateNote = message.visibility === 'private_note';

  return (
    <View style={[styles.messageRow, outgoing && styles.messageRowOutgoing]}>
      <View style={[styles.bubble, outgoing && styles.bubbleOutgoing, privateNote && styles.bubblePrivate]}>
        <Text style={[styles.messageText, outgoing && styles.messageTextOutgoing]}>
          {message.text || '[non-text message]'}
        </Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.metaText, outgoing && styles.metaTextOutgoing]}>
            {message.sender?.displayName ?? (outgoing ? 'Manager' : 'Contact')}
          </Text>
          {message.deliveryStatus ? (
            <Text style={[styles.metaText, outgoing && styles.metaTextOutgoing]}>{message.deliveryStatus}</Text>
          ) : null}
        </View>
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
  messageRow: {
    flexDirection: 'row',
  },
  messageRowOutgoing: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bubbleOutgoing: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  bubblePrivate: {
    borderColor: colors.amber,
    backgroundColor: '#FFF4D8',
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
