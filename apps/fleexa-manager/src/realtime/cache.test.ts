import { describe, expect, it } from 'vitest';

import type { ManagerMessage, ManagerRealtimeEvent } from '@fleexa/domain';

import { markRealtimeEventSeen, upsertMessageByIdentity, type RealtimeDedupeState } from './cache';

const message = (overrides: Partial<ManagerMessage> = {}): ManagerMessage => ({
  id: 'msg_1',
  conversationId: 'conv_1',
  clientMessageId: '6a3fd024-f585-4e52-964b-20adf9332740',
  direction: 'outgoing',
  visibility: 'customer',
  type: 'text',
  text: 'Hello',
  sender: { id: 'user_1', displayName: 'Manager', type: 'user' },
  deliveryStatus: 'sent',
  attachments: [],
  createdAt: '2026-07-19T09:00:00Z',
  updatedAt: '2026-07-19T09:00:00Z',
  ...overrides,
});

const realtimeEvent = (eventId: string): Pick<ManagerRealtimeEvent, 'eventId'> => ({
  eventId,
});

describe('Manager realtime cache helpers', () => {
  it('dedupes repeated realtime events across reconnects', () => {
    const initialState: RealtimeDedupeState = { seenEventIds: [] };
    const first = markRealtimeEventSeen(initialState, realtimeEvent('evt_msg_1_created'));
    const repeated = markRealtimeEventSeen(first.state, realtimeEvent('evt_msg_1_created'));

    expect(first.duplicate).toBe(false);
    expect(repeated.duplicate).toBe(true);
    expect(repeated.state.seenEventIds).toEqual(['evt_msg_1_created']);
  });

  it('upserts messages by server id without duplicate rows', () => {
    const first = message({ id: 'msg_1', deliveryStatus: 'sending' });
    const confirmed = message({ id: 'msg_1', deliveryStatus: 'sent' });

    expect(upsertMessageByIdentity([first], confirmed)).toEqual([confirmed]);
  });

  it('upserts retry confirmations by clientMessageId when server id changes', () => {
    const localEcho = message({ id: 'local_1', deliveryStatus: 'sending' });
    const confirmed = message({ id: 'msg_2', deliveryStatus: 'sent' });

    const result = upsertMessageByIdentity([localEcho], confirmed);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('msg_2');
  });
});
