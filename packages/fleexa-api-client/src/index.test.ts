import { describe, expect, it, vi } from 'vitest';

import {
  ChatwootFleexaApiClient,
  HttpFleexaApiClient,
  ManagerApiClient,
  MockFleexaApiClient,
  createClientMessageId,
  createFleexaApiClient,
  safeFleexaApiErrorMessage,
} from './index';
import type { FleexaApiError } from './index';

describe('@fleexa/api-client', () => {
  it('creates UUID client message ids for idempotent sends', () => {
    expect(createClientMessageId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('uses the Manager API client for live mode by default', () => {
    const client = createFleexaApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1',
    });

    expect(client).toBeInstanceOf(ManagerApiClient);
    expect(client).not.toBeInstanceOf(ChatwootFleexaApiClient);
    expect(new HttpFleexaApiClient({ baseUrl: 'https://api.example.com/api/fleexa-manager/v1' })).toBeInstanceOf(
      ManagerApiClient
    );
  });

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
    const client = new ManagerApiClient({
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

  it('exchanges email and password with the Manager API without leaking stale bearer auth', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          accessToken: 'manager-session-token',
          tokenType: 'Bearer',
          session: {
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
          },
        })
      )
    );
    const client = new ManagerApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1/',
      tokenProvider: () => 'stale-token',
      fetchImpl,
    });

    const result = await client.login({
      email: 'manager@example.com',
      password: 'password',
      accountHint: 'acc_1',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/fleexa-manager/v1/session',
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
        body: JSON.stringify({
          email: 'manager@example.com',
          password: 'password',
          accountHint: 'acc_1',
        }),
      })
    );
    expect(result.accessToken).toBe('manager-session-token');
    expect(result.session.activeAccountId).toBe('acc_1');
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
    const client = new ManagerApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1',
      fetchImpl,
    });

    await expect(client.getManagerCounters('acc_1')).rejects.toMatchObject({
      status: 403,
      code: 'forbidden',
      requestId: 'req_1',
    } satisfies Partial<FleexaApiError>);
  });

  it('passes manager conversation filters through the Manager API', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [],
          page: { nextCursor: null, hasMore: false, limit: 12 },
        })
      )
    );
    const client = new ManagerApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1',
      tokenProvider: () => 'access-token',
      fetchImpl,
    });

    await client.listConversations({
      accountId: 'acc_1',
      limit: 12,
      filter: 'waiting_for_reply',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/fleexa-manager/v1/accounts/acc_1/conversations?limit=12&filter=waiting_for_reply',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      })
    );
  });

  it('sanitizes unavailable Manager API failures', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('connect ECONNREFUSED 127.0.0.1:3000');
    });
    const client = new ManagerApiClient({
      baseUrl: 'http://localhost:3000/api/fleexa-manager/v1',
      fetchImpl,
    });

    await expect(client.getCurrentSession()).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
      message: 'The Manager API is unavailable. Check the local backend and try again.',
    } satisfies Partial<FleexaApiError>);
  });

  it('does not expose raw Manager API internals in user-facing messages', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'unknown_error',
            message: 'PG::UndefinedColumn: raw backend internals',
            requestId: 'req_500',
          },
        }),
        { status: 500 }
      )
    );
    const client = new ManagerApiClient({
      baseUrl: 'http://localhost:3000/api/fleexa-manager/v1',
      fetchImpl,
    });

    let capturedError: unknown;
    try {
      await client.getManagerCounters('acc_1');
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({
      status: 500,
      code: 'unknown_error',
      requestId: 'req_500',
      message: 'Something went wrong. Please try again.',
    } satisfies Partial<FleexaApiError>);
    expect(safeFleexaApiErrorMessage(capturedError)).toBe('Something went wrong. Please try again.');
  });

  it('keeps mock mode explicit and Manager-shaped', async () => {
    const client = new MockFleexaApiClient();
    const login = await client.login({ email: 'manager@example.com', password: 'password' });
    const session = await client.getCurrentSession();
    const conversations = await client.listConversations({ accountId: 'acc_mock_fleexa' });
    const counters = await client.getManagerCounters('acc_mock_fleexa');

    expect(login.accessToken).toContain('mock');
    expect(session.apiVersion).toContain('mock');
    expect(conversations.data[0]?.linkedDeal).toMatchObject({
      id: expect.stringMatching(/^deal_/),
      clientName: 'Amina Noor',
      currency: 'AED',
      stageKey: 'reserved',
      qualificationStatus: 'qualified',
      trafficSource: { key: 'meta_ads', label: 'Meta Ads' },
      leadOrigin: { key: 'whatsapp', label: 'WhatsApp' },
      assignedManager: { id: 'user_mock_manager' },
    });
    expect(conversations.data[0]).toMatchObject({
      assignedManager: { id: 'user_mock_manager' },
      lastCustomerMessageAt: '2026-07-18T09:00:00.000Z',
      lastAgentReplyAt: null,
      replyState: 'waiting_for_reply',
    });
    expect(conversations.data[0]).not.toHaveProperty('custom_attributes');
    expect(counters.counters).toEqual({ unread: 5, assigned: 14, unassigned: 3 });
    expect(counters.counters).not.toHaveProperty('activeDeals');
  });

  it('sends Manager text messages with explicit idempotency metadata', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: 'msg_123',
            conversationId: 'conv_81',
            clientMessageId: '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
            direction: 'outgoing',
            visibility: 'customer',
            type: 'text',
            text: 'hello',
            deliveryStatus: 'sent',
            attachments: [],
            createdAt: '2026-07-18T09:00:00Z',
          },
          idempotency: {
            key: '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
            duplicate: false,
            originalMessageId: null,
          },
        }),
        { status: 201 }
      )
    );
    const client = new ManagerApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1',
      tokenProvider: () => 'access-token',
      fetchImpl,
    });

    const result = await client.sendTextMessage({
      accountId: 'acc_1',
      conversationId: 'conv_81',
      idempotencyKey: '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
      clientMessageId: '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
      text: 'hello',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/fleexa-manager/v1/accounts/acc_1/conversations/conv_81/messages/text',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Idempotency-Key': '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          clientMessageId: '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
          text: 'hello',
          quotedMessageId: null,
        }),
      })
    );
    expect(result.idempotency).toEqual({
      key: '4f236d7a-7054-4ad2-a592-2a9bd5ac3051',
      duplicate: false,
      originalMessageId: null,
    });
  });

  it('uses Manager deal endpoints for linked deal read, create, and update', async () => {
    const managerDeal = {
      id: 'deal_9',
      accountId: 'acc_1',
      title: 'Range Rover rental',
      clientName: 'Amina Noor',
      amount: { amount: '14000', currency: 'AED' },
      currency: 'AED',
      stage: { id: 'stage_new', key: 'new', name: 'New' },
      stageKey: 'new',
      qualificationStatus: 'qualified',
      trafficSource: { key: 'meta_ads', label: 'Meta Ads' },
      leadOrigin: { key: 'whatsapp', label: 'WhatsApp' },
      lostReason: null,
      assignedManager: { id: 'user_1', displayName: 'Manager', type: 'user' },
      createdAt: '2026-07-18T09:00:00Z',
      updatedAt: '2026-07-18T09:00:00Z',
      permissions: ['deals:read', 'deals:update'],
    };
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/deals/deal_9')) {
        return new Response(JSON.stringify({ data: { ...managerDeal, title: 'Updated rental' } }));
      }

      return new Response(
        JSON.stringify({
          conversationId: 'conv_81',
          linkState: 'linked',
          deal: managerDeal,
        }),
        { status: init?.method === 'POST' ? 201 : 200 }
      );
    });
    const client = new ManagerApiClient({
      baseUrl: 'https://api.example.com/api/fleexa-manager/v1',
      tokenProvider: () => 'access-token',
      fetchImpl,
    });

    const linkedDeal = await client.getLinkedDeal('acc_1', 'conv_81');
    await client.createDealFromConversation({
      accountId: 'acc_1',
      conversationId: 'conv_81',
      deal: {
        title: 'Range Rover rental',
        amount: { amount: '14000', currency: 'AED' },
        stageKey: 'new',
        trafficSourceKey: 'meta_ads',
        leadOriginKey: 'whatsapp',
      },
    });
    const updatedDeal = await client.updateDeal({
      accountId: 'acc_1',
      dealId: 'deal_9',
      deal: {
        title: 'Updated rental',
        qualificationStatus: 'qualified',
      },
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/api/fleexa-manager/v1/accounts/acc_1/conversations/conv_81/deal',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/api/fleexa-manager/v1/accounts/acc_1/conversations/conv_81/deal',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          deal: {
            title: 'Range Rover rental',
            amount: { amount: '14000', currency: 'AED' },
            stageKey: 'new',
            trafficSourceKey: 'meta_ads',
            leadOriginKey: 'whatsapp',
          },
        }),
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'https://api.example.com/api/fleexa-manager/v1/accounts/acc_1/deals/deal_9',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          deal: {
            title: 'Updated rental',
            qualificationStatus: 'qualified',
          },
        }),
      })
    );
    expect(fetchImpl.mock.calls.map(call => String(call[0])).join('\n')).not.toContain('linked-deal');
    expect(linkedDeal.deal?.trafficSource).toEqual({ key: 'meta_ads', label: 'Meta Ads' });
    expect(updatedDeal.data.title).toBe('Updated rental');
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
      assignedManager: { id: 'user_1' },
      lastCustomerMessageAt: '2026-07-18T10:19:38.000Z',
      lastAgentReplyAt: null,
      replyState: 'waiting_for_reply',
    });
    expect(conversations.data[0]).not.toHaveProperty('custom_attributes');
  });

  it('sends Chatwoot text messages with api_access_token and client ids', async () => {
    const clientMessageId = '6f4107ac-6079-472a-bf08-7c3862ea35b1';
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 223,
          content: 'hello',
          conversation_id: 81,
          message_type: 1,
          status: 'sent',
          private: false,
          content_attributes: { clientMessageId },
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
      idempotencyKey: clientMessageId,
      clientMessageId,
      text: 'hello',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/accounts/1/conversations/81/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          api_access_token: 'chatwoot-token',
          'Idempotency-Key': clientMessageId,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          content: 'hello',
          private: false,
          content_attributes: { clientMessageId, idempotencyKey: clientMessageId },
        }),
      })
    );
    expect(result.data).toMatchObject({
      id: 'msg_223',
      conversationId: 'conv_81',
      text: 'hello',
      direction: 'outgoing',
      clientMessageId,
    });
    expect(result.idempotency).toEqual({
      key: clientMessageId,
      duplicate: false,
      originalMessageId: null,
    });
  });
});
