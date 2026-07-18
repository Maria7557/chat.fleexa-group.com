import { describe, expect, it } from 'vitest';

import {
  activeAccountIdForSession,
  hasPermission,
  membershipForAccount,
  visiblePermissionsForAccount,
  type CurrentSessionResponse,
} from './index';

const session: CurrentSessionResponse = {
  user: {
    id: 'user_1',
    name: 'Manager',
    email: 'manager@example.com',
  },
  activeAccountId: 'acc_primary',
  memberships: [
    {
      accountId: 'acc_primary',
      accountName: 'Fleexa',
      role: 'manager',
      permissions: ['session:read', 'conversations:read', 'counters:read'],
    },
  ],
  permissions: ['session:read', 'conversations:read', 'counters:read'],
  realtime: {
    url: 'wss://api.example.com/realtime',
    token: 'realtime-token',
    tokenExpiresAt: '2026-07-18T10:00:00Z',
  },
  serverTime: '2026-07-18T09:00:00Z',
  apiVersion: '0.1.0',
};

describe('@fleexa/domain', () => {
  it('checks permissions without inferring role names', () => {
    expect(hasPermission(session.permissions, 'conversations:read')).toBe(true);
    expect(hasPermission(session.permissions, 'settings:write')).toBe(false);
  });

  it('finds account-scoped membership permissions', () => {
    expect(membershipForAccount(session, 'acc_primary')?.role).toBe('manager');
    expect(visiblePermissionsForAccount(session, 'acc_missing')).toEqual([]);
  });

  it('uses active account with a membership fallback', () => {
    expect(activeAccountIdForSession(session)).toBe('acc_primary');
    expect(activeAccountIdForSession({ ...session, activeAccountId: null })).toBe('acc_primary');
  });
});
