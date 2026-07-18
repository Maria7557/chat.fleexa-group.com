import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { activeAccountIdForSession, type ConversationFilter } from '@fleexa/domain';

import { useAuth } from '@/src/auth/AuthProvider';
import { useFleexaApiClient } from './client';

const CONVERSATION_LIST_POLL_INTERVAL_MS = 7_000;
const CONVERSATION_DETAIL_POLL_INTERVAL_MS = 7_000;
const MESSAGE_THREAD_POLL_INTERVAL_MS = 5_000;
const COUNTERS_POLL_INTERVAL_MS = 10_000;

export interface SendTextMessageInput {
  clientMessageId: string;
  text: string;
}

export const queryKeys = {
  session: ['session', 'current'] as const,
  counters: (accountId: string) => ['manager-counters', accountId] as const,
  conversations: (accountId: string, filter?: ConversationFilter) => ['conversations', accountId, filter ?? 'all'] as const,
  conversation: (accountId: string, conversationId: string) => ['conversation', accountId, conversationId] as const,
  messages: (accountId: string, conversationId: string) => ['messages', accountId, conversationId] as const,
  stages: (accountId: string) => ['pipeline-stages', accountId] as const,
};

export const useCurrentSession = () => {
  const { isAuthenticated } = useAuth();
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => client.getCurrentSession(),
    enabled: isAuthenticated,
    retry: false,
  });
};

export const useActiveAccountId = () => {
  const session = useCurrentSession();
  return session.data ? activeAccountIdForSession(session.data) : null;
};

export const useManagerCounters = (accountId: string | null) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId ? queryKeys.counters(accountId) : ['manager-counters', 'missing'],
    queryFn: () => client.getManagerCounters(accountId ?? ''),
    enabled: Boolean(accountId),
    retry: false,
    refetchInterval: COUNTERS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
};

export const useConversations = (accountId: string | null, filter: ConversationFilter = 'all') => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId ? queryKeys.conversations(accountId, filter) : ['conversations', 'missing', filter],
    queryFn: () => client.listConversations({ accountId: accountId ?? '', limit: 20, filter }),
    enabled: Boolean(accountId),
    retry: false,
    refetchInterval: CONVERSATION_LIST_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
};

export const usePipelineStages = (accountId: string | null) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId ? queryKeys.stages(accountId) : ['pipeline-stages', 'missing'],
    queryFn: () => client.listPipelineStages(accountId ?? '', true),
    enabled: Boolean(accountId),
    retry: false,
  });
};

export const useConversationDetail = (accountId: string | null, conversationId: string | null) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId && conversationId ? queryKeys.conversation(accountId, conversationId) : ['conversation', 'missing'],
    queryFn: () => client.getConversationDetail(accountId ?? '', conversationId ?? ''),
    enabled: Boolean(accountId && conversationId),
    retry: false,
    refetchInterval: CONVERSATION_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
};

export const useMessages = (accountId: string | null, conversationId: string | null) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId && conversationId ? queryKeys.messages(accountId, conversationId) : ['messages', 'missing'],
    queryFn: () => client.listMessages({ accountId: accountId ?? '', conversationId: conversationId ?? '', order: 'asc' }),
    enabled: Boolean(accountId && conversationId),
    retry: false,
    refetchInterval: MESSAGE_THREAD_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
};

export const useSendTextMessage = (accountId: string | null, conversationId: string | null) => {
  const client = useFleexaApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientMessageId, text }: SendTextMessageInput) => {
      return client.sendTextMessage({
        accountId: accountId ?? '',
        conversationId: conversationId ?? '',
        clientMessageId,
        idempotencyKey: clientMessageId,
        text,
      });
    },
    retry: false,
    onSuccess: () => {
      if (!accountId || !conversationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(accountId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(accountId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: ['conversations', accountId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.counters(accountId) });
    },
  });
};
