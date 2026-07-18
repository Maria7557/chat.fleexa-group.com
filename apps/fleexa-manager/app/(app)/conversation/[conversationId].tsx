import { useLocalSearchParams } from 'expo-router';

import { ConversationScreen } from '@/src/features/conversation/ConversationScreen';

export default function ConversationRoute() {
  const params = useLocalSearchParams<{ conversationId?: string }>();
  return <ConversationScreen conversationId={params.conversationId ?? null} />;
}
