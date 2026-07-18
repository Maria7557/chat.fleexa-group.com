import { useQuery } from '@tanstack/react-query';

import { activeAccountIdForSession } from '@fleexa/domain';

import { useAuth } from '@/src/auth/AuthProvider';
import { useFleexaApiClient } from './client';

export const queryKeys = {
  session: ['session', 'current'] as const,
  counters: (accountId: string) => ['manager-counters', accountId] as const,
  conversations: (accountId: string) => ['conversations', accountId] as const,
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
  });
};

export const useConversations = (accountId: string | null) => {
  const client = useFleexaApiClient();

  return useQuery({
    queryKey: accountId ? queryKeys.conversations(accountId) : ['conversations', 'missing'],
    queryFn: () => client.listConversations({ accountId: accountId ?? '', limit: 12, assignment: 'mine' }),
    enabled: Boolean(accountId),
    retry: false,
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
