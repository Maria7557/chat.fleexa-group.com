import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { activeAccountIdForSession, type ConversationFilter, type DealDraft } from '@fleexa/domain';
import { createClientMessageId, type ListDealsParams, type UpdateDealStageParams } from '@fleexa/api-client';

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
  linkedDeal: (accountId: string, conversationId: string) => ['linked-deal', accountId, conversationId] as const,
  stages: (accountId: string) => ['pipeline-stages', accountId] as const,
  deals: (
    accountId: string,
    filters: {
      stageId?: string;
      stageKey?: string;
      sort?: ListDealsParams['sort'];
    } = {}
  ) =>
    [
      'pipeline-deals',
      accountId,
      filters.stageId ?? 'all',
      filters.stageKey ?? 'all',
      filters.sort ?? 'last_activity_desc',
    ] as const,
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

export const usePipelineDeals = (
  accountId: string | null,
  options: {
    stageId?: string;
    stageKey?: string;
    limit?: number;
    sort?: ListDealsParams['sort'];
  } = {}
) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId ? queryKeys.deals(accountId, options) : ['pipeline-deals', 'missing'],
    queryFn: () => {
      const request: ListDealsParams = {
        accountId: accountId ?? '',
        limit: options.limit ?? 80,
        sort: options.sort ?? 'last_activity_desc',
      };

      if (options.stageId) request.stageId = options.stageId;
      if (options.stageKey) request.stageKey = options.stageKey;

      return client.listDeals(request);
    },
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

export const useLinkedDeal = (accountId: string | null, conversationId: string | null) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId && conversationId ? queryKeys.linkedDeal(accountId, conversationId) : ['linked-deal', 'missing'],
    queryFn: () => client.getLinkedDeal(accountId ?? '', conversationId ?? ''),
    enabled: Boolean(accountId && conversationId),
    retry: false,
  });
};

export const useCreateLinkedDeal = (accountId: string | null, conversationId: string | null) => {
  const client = useFleexaApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      return client.createDealFromConversation({
        accountId: accountId ?? '',
        conversationId: conversationId ?? '',
        deal: {},
      });
    },
    retry: false,
    onSuccess: () => {
      if (!accountId || !conversationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.linkedDeal(accountId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(accountId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: ['conversations', accountId] });
    },
  });
};

export const useUpdateDeal = (accountId: string | null, conversationId: string | null) => {
  const client = useFleexaApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, deal, expectedVersion }: { dealId: string; deal: DealDraft; expectedVersion: number }) => {
      return client.updateDeal({
        accountId: accountId ?? '',
        dealId,
        expectedVersion,
        deal,
      });
    },
    retry: false,
    onSuccess: () => {
      if (!accountId || !conversationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.linkedDeal(accountId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(accountId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: ['conversations', accountId] });
    },
  });
};

export const useMoveDealStage = (accountId: string | null) => {
  const client = useFleexaApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      lostReasonLabel,
      stageId,
      expectedVersion,
    }: {
      dealId: string;
      expectedVersion: number;
      lostReasonLabel?: string | null;
      stageId: string;
    }) => {
      const clientMutationId = createClientMessageId();
      const request: UpdateDealStageParams = {
        accountId: accountId ?? '',
        dealId,
        stageId,
        clientMutationId,
        expectedVersion,
        idempotencyKey: `stage-move-${clientMutationId}`,
      };
      const trimmedLostReason = lostReasonLabel?.trim();
      if (trimmedLostReason) request.lostReasonLabel = trimmedLostReason;

      return client.updateDealStage(request);
    },
    retry: false,
    onSuccess: () => {
      if (!accountId) return;
      void queryClient.invalidateQueries({ queryKey: ['pipeline-deals', accountId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stages(accountId) });
      void queryClient.invalidateQueries({ queryKey: ['linked-deal', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations', accountId] });
    },
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
