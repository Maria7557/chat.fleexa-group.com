import { describe, expect, it, vi } from 'vitest';

import { ChatwootFleexaApiClient, HttpFleexaApiClient, MockFleexaApiClient } from './index';
import type { FleexaApiError } from './index';

describe('@fleexa/api-client', () => {
  it('sends bearer tokens and query params to the Manager API base path', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          user: { id: 'user_1', name: 'Manager', email: 'manager@example.com' },
          activeAccountId: 'acc_1',
          memberships: [],
          permissions: [],
          realtime: {
            url: 'wss://example.com/realtime',
            token: 'rt',
            tokenExpiresAt: '2026-07-18T10:00:00Z',
          },
          serverTime: '2026-07-18T09:00:00Z',
          apiVersion: '0.1.0',
        })
      )
    );
    const client = new HttpFleexaApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1/',
      tokenProvider: () => 'access-token',
      fetchImpl,
    });

    await client.getCurrentSession('acc_1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/fleexa-manager/v1/session/current?activeAccountId=acc_1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          Accept: 'application/json',
        }),
      })
    );
  });

  it('maps API error envelopes into typed client errors', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'forbidden',
            message: 'No permission.',
            requestId: 'req_1',
          },
        }),
        { status: 403 }
      )
    );
    const client = new HttpFleexaApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1',
      fetchImpl,
    });

    await expect(client.getManagerCounters('acc_1')).rejects.toMatchObject({
      status: 403,
      code: 'forbidden',
      requestId: 'req_1',
    } satisfies Partial<FleexaApiError>);
  });

  it('keeps mock mode explicit and Manager-shaped', async () => {
    const client = new MockFleexaApiClient();
    const session = await client.getCurrentSession();
    const conversations = await client.listConversations({ accountId: 'acc_mock_fleexa' });

    expect(session.apiVersion).toContain('mock');
    expect(conversations.data[0]?.linkedDeal?.id).toMatch(/^deal_/);
    expect(conversations.data[0]).not.toHaveProperty('custom_attributes');
  });

  it('maps Chatwoot profile and conversations into Manager DTOs', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/profile')) {
        return new Response(
          JSON.stringify({
            id: 1,
            name: 'Admin',
            email: 'admin@fleexa.com',
            account_id: 1,
            pubsub_token: 'pubsub-token',
            accounts: [{ id: 1, name: 'Fleexa', role: 'administrator' }],
          })
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            meta: { mine_count: 1, assigned_count: 1, unassigned_count: 0, all_count: 1 },
            payload: [
              {
                id: 81,
                account_id: 1,
                status: 'open',
                priority: null,
                can_reply: true,
                unread_count: 2,
                last_activity_at: 1784369978,
                labels: ['vip'],
                meta: {
                  channel: 'Channel::Api',
                  sender: { id: 44, name: 'Mikhail Orlov', email: 'mikhail@example.com' },
                  assignee: { id: 1, name: 'Admin', type: 'user' },
                },
                messages: [
                  {
                    id: 180,
                    content: 'Meta WhatsApp click',
                    conversation_id: 81,
                    message_type: 0,
                    status: 'sent',
                    created_at: 1784369978,
                  },
                ],
              },
            ],
          },
        })
      );
    });
    const client = new ChatwootFleexaApiClient({
      baseUrl: 'http://localhost:3000',
      chatwootAccountId: '1',
      tokenProvider: () => 'chatwoot-token',
      fetchImpl,
    });

    const session = await client.getCurrentSession();
    const conversations = await client.listConversations({ accountId: session.activeAccountId ?? '', assignment: 'mine' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/profile',
      expect.objectContaining({
        headers: expect.objectContaining({ api_access_token: 'chatwoot-token' }),
      })
    );
    expect(session.activeAccountId).toBe('acc_1');
    expect(session.memberships[0]?.role).toBe('owner');
    expect(conversations.data[0]).toMatchObject({
      id: 'conv_81',
      accountId: 'acc_1',
      channel: { type: 'other', displayName: 'Api' },
      contact: { id: 'contact_44', displayName: 'Mikhail Orlov' },
      lastMessage: { id: 'msg_180', text: 'Meta WhatsApp click', direction: 'incoming' },
    });
    expect(conversations.data[0]).not.toHaveProperty('custom_attributes');
  });

  it('sends Chatwoot text messages with api_access_token and client ids', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 223,
          content: 'hello',
          conversation_id: 81,
          message_type: 1,
          status: 'sent',
          private: false,
          content_attributes: { clientMessageId: 'client_1' },
          created_at: 1784369978,
        })
      )
    );
    const client = new ChatwootFleexaApiClient({
      baseUrl: 'http://localhost:3000/api/fleexa-manager/v1',
      tokenProvider: () => 'chatwoot-token',
      fetchImpl,
    });

    const result = await client.sendTextMessage({
      accountId: 'acc_1',
      conversationId: 'conv_81',
      idempotencyKey: 'idem_1',
      clientMessageId: 'client_1',
      text: 'hello',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/accounts/1/conversations/81/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          api_access_token: 'chatwoot-token',
          'Idempotency-Key': 'idem_1',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          content: 'hello',
          private: false,
          content_attributes: { clientMessageId: 'client_1', idempotencyKey: 'idem_1' },
        }),
      })
    );
    expect(result.data).toMatchObject({
      id: 'msg_223',
      conversationId: 'conv_81',
      text: 'hello',
      direction: 'outgoing',
      clientMessageId: 'client_1',
    });
  });
});
