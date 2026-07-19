import type { QueryClient } from '@tanstack/react-query';

import type {
  ConversationDetailResponse,
  ConversationListResponse,
  ManagerCountersResponse,
  ManagerMessage,
  ManagerRealtimeEvent,
  MessageListResponse,
} from '@fleexa/domain';

import { queryKeys } from '@/src/api/queryKeys';

const MAX_SEEN_EVENT_IDS = 500;

export interface RealtimeDedupeState {
  seenEventIds: string[];
}

export const markRealtimeEventSeen = (
  state: RealtimeDedupeState,
  event: Pick<ManagerRealtimeEvent, 'eventId'>
): { duplicate: boolean; state: RealtimeDedupeState } => {
  if (state.seenEventIds.includes(event.eventId)) return { duplicate: true, state };

  return {
    duplicate: false,
    state: {
      seenEventIds: [...state.seenEventIds, event.eventId].slice(-MAX_SEEN_EVENT_IDS),
    },
  };
};

export const upsertMessageByIdentity = (
  messages: readonly ManagerMessage[],
  incoming: ManagerMessage
): ManagerMessage[] => {
  const incomingClientMessageId = incoming.clientMessageId ?? null;
  const index = messages.findIndex(message => {
    if (message.id === incoming.id) return true;
    return Boolean(incomingClientMessageId && message.clientMessageId === incomingClientMessageId);
  });

  if (index < 0) {
    return [...messages, incoming].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  return messages.map((message, messageIndex) => (messageIndex === index ? { ...message, ...incoming } : message));
};

export const applyManagerRealtimeEventToCache = (queryClient: QueryClient, event: ManagerRealtimeEvent): void => {
  if (event.eventType === 'message.created') {
    const { conversation, message } = event.payload;
    const messagesKey = queryKeys.messages(event.accountId, event.payload.conversationId);

    queryClient.setQueryData<MessageListResponse>(messagesKey, current => {
      if (!current) return current;

      return {
        ...current,
        data: upsertMessageByIdentity(current.data, message),
      };
    });

    updateConversationCaches(queryClient, event.accountId, conversation);
    if (event.payload.counters) updateCountersCache(queryClient, event.payload.counters);
    return;
  }

  if (event.eventType === 'conversation.updated' || event.eventType === 'conversation.assigned') {
    updateConversationCaches(queryClient, event.accountId, event.payload.conversation);
    if (event.payload.counters) updateCountersCache(queryClient, event.payload.counters);
    return;
  }

  if (event.eventType === 'manager.counters.updated') {
    updateCountersCache(queryClient, event.payload.counters);
  }
};

const updateCountersCache = (queryClient: QueryClient, counters: ManagerCountersResponse): void => {
  queryClient.setQueryData(queryKeys.counters(counters.accountId), counters);
};

const updateConversationCaches = (
  queryClient: QueryClient,
  accountId: string,
  conversation: ConversationListResponse['data'][number]
): void => {
  queryClient.setQueriesData<ConversationListResponse>({ queryKey: ['conversations', accountId] }, current => {
    if (!current) return current;

    const existingIndex = current.data.findIndex(item => item.id === conversation.id);
    const data =
      existingIndex >= 0
        ? current.data.map((item, index) => (index === existingIndex ? { ...item, ...conversation } : item))
        : [conversation, ...current.data];

    return {
      ...current,
      data: data.sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt)),
    };
  });

  queryClient.setQueryData<ConversationDetailResponse>(queryKeys.conversation(accountId, conversation.id), current => {
    if (!current) return current;

    return {
      ...current,
      data: {
        ...current.data,
        ...conversation,
      },
    };
  });
};
