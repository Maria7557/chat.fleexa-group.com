import type { ConversationFilter } from '@fleexa/domain';
import type { ListDealsParams } from '@fleexa/api-client';

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
