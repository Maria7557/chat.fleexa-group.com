import type { ManagerRealtimeEvent } from '@fleexa/domain';

type CableControlType = 'welcome' | 'ping' | 'confirm_subscription' | 'reject_subscription';

interface CableMessage {
  type?: CableControlType;
  message?: unknown;
}

export interface ManagerActionCableSubscriptionOptions {
  url: string;
  accountId: string;
  authToken?: string | null;
  getLastCursor?: () => string | null;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onRejected?: () => void;
  onEvent: (event: ManagerRealtimeEvent) => void;
}

export interface ManagerActionCableSubscription {
  close(): void;
}

const CHANNEL_NAME = 'FleexaManager::V1::RealtimeChannel';
const RECONNECT_DELAY_MS = 3_000;

export const createManagerActionCableSubscription = (
  options: ManagerActionCableSubscriptionOptions
): ManagerActionCableSubscription => {
  let socket: WebSocket | null = null;
  let closedByClient = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closedByClient || typeof WebSocket === 'undefined') {
      options.onDisconnected?.();
      return;
    }

    socket = new WebSocket(normalizeCableUrl(options.url));

    socket.onopen = () => {
      socket?.send(
        JSON.stringify({
          command: 'subscribe',
          identifier: JSON.stringify(subscriptionIdentifier(options)),
        })
      );
    };

    socket.onmessage = event => {
      const cableMessage = parseCableMessage(event.data);
      if (!cableMessage) return;

      if (cableMessage.type === 'confirm_subscription') {
        options.onConnected?.();
        return;
      }

      if (cableMessage.type === 'reject_subscription') {
        options.onRejected?.();
        options.onDisconnected?.();
        return;
      }

      const realtimeEvent = parseRealtimeEvent(cableMessage.message);
      if (realtimeEvent) options.onEvent(realtimeEvent);
    };

    socket.onerror = () => {
      options.onDisconnected?.();
    };

    socket.onclose = () => {
      options.onDisconnected?.();
      if (!closedByClient) scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  };

  connect();

  return {
    close() {
      closedByClient = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            command: 'unsubscribe',
            identifier: JSON.stringify(subscriptionIdentifier(options)),
          })
        );
      }

      socket?.close();
      socket = null;
      options.onDisconnected?.();
    },
  };
};

const normalizeCableUrl = (url: string): string => {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : parsed.protocol === 'http:' ? 'ws:' : parsed.protocol;
  parsed.search = '';
  return parsed.toString();
};

const subscriptionIdentifier = (options: ManagerActionCableSubscriptionOptions): Record<string, string> => {
  const identifier: Record<string, string> = {
    channel: CHANNEL_NAME,
    accountId: options.accountId,
  };
  const lastCursor = options.getLastCursor?.();

  if (lastCursor) identifier.cursor = lastCursor;
  if (options.authToken) identifier.token = options.authToken;

  return identifier;
};

const parseCableMessage = (raw: unknown): CableMessage | null => {
  if (typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as CableMessage) : null;
  } catch {
    return null;
  }
};

const parseRealtimeEvent = (raw: unknown): ManagerRealtimeEvent | null => {
  if (typeof raw !== 'object' || raw === null) return null;

  const event = raw as Partial<ManagerRealtimeEvent>;
  if (typeof event.eventId !== 'string') return null;
  if (typeof event.eventType !== 'string') return null;
  if (typeof event.accountId !== 'string') return null;
  if (typeof event.occurredAt !== 'string') return null;
  if (!('payload' in event)) return null;

  return event as ManagerRealtimeEvent;
};
