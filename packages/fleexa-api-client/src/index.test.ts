import { describe, expect, it, vi } from 'vitest';

import { HttpFleexaApiClient, MockFleexaApiClient } from './index';
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
});
