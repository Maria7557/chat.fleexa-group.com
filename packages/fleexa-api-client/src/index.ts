import type {
  BookingByDealResponse,
  ConversationDetailResponse,
  ConversationListResponse,
  ContactSummary,
  CurrentSessionResponse,
  DealSummary,
  DealStageUpdateResponse,
  DealsByStageResponse,
  ErrorResponse,
  LinkedDealResponse,
  ManagerCountersResponse,
  MessageListResponse,
  MessageSendResponse,
  PipelineStageRef,
  PipelineStagesResponse,
} from '@fleexa/domain';

export type TokenProvider = () => string | null | Promise<string | null>;

export interface FleexaApiClientOptions {
  baseUrl: string;
  tokenProvider?: TokenProvider;
  fetchImpl?: typeof fetch;
}

export interface ListConversationsParams {
  accountId: string;
  cursor?: string;
  limit?: number;
  status?: string;
  assignment?: 'mine' | 'unassigned' | 'all';
}

export interface ListMessagesParams {
  accountId: string;
  conversationId: string;
  cursor?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface SendTextMessageParams {
  accountId: string;
  conversationId: string;
  idempotencyKey: string;
  clientMessageId: string;
  text: string;
  quotedMessageId?: string | null;
}

export interface UpdateDealStageParams {
  accountId: string;
  dealId: string;
  stageId: string;
  clientMutationId: string;
  expectedVersion?: number | null;
  note?: string | null;
  idempotencyKey?: string;
}

export interface ListDealsByStageParams {
  accountId: string;
  stageId: string;
  cursor?: string;
  limit?: number;
  assignedTo?: string;
  sort?: 'last_activity_desc' | 'created_desc' | 'amount_desc' | 'amount_asc';
}

export interface FleexaApiClient {
  getCurrentSession(activeAccountId?: string): Promise<CurrentSessionResponse>;
  listConversations(params: ListConversationsParams): Promise<ConversationListResponse>;
  getConversationDetail(accountId: string, conversationId: string): Promise<ConversationDetailResponse>;
  listMessages(params: ListMessagesParams): Promise<MessageListResponse>;
  sendTextMessage(params: SendTextMessageParams): Promise<MessageSendResponse>;
  getLinkedDeal(accountId: string, conversationId: string): Promise<LinkedDealResponse>;
  updateDealStage(params: UpdateDealStageParams): Promise<DealStageUpdateResponse>;
  listPipelineStages(accountId: string, includeCounters?: boolean): Promise<PipelineStagesResponse>;
  listDealsByStage(params: ListDealsByStageParams): Promise<DealsByStageResponse>;
  getBookingByDeal(accountId: string, dealId: string): Promise<BookingByDealResponse>;
  getManagerCounters(accountId: string, options?: { date?: string; timeZone?: string }): Promise<ManagerCountersResponse>;
}

export class FleexaApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, body: ErrorResponse) {
    super(body.error.message);
    this.name = 'FleexaApiError';
    this.status = status;
    this.code = body.error.code;
    this.requestId = body.error.requestId;
    this.details = body.error.details;
  }
}

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const pathWithQuery = (path: string, query: Record<string, string | number | boolean | undefined>): string => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });

  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
};

const safeJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const fallbackError = (status: number): ErrorResponse => ({
  error: {
    code: status === 401 ? 'unauthenticated' : 'unknown_error',
    message: 'The request failed. Please try again.',
  },
});

export class HttpFleexaApiClient implements FleexaApiClient {
  private readonly baseUrl: string;
  private readonly tokenProvider: TokenProvider | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FleexaApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.tokenProvider = options.tokenProvider;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getCurrentSession(activeAccountId?: string): Promise<CurrentSessionResponse> {
    return this.request('/session/current', {
      query: { activeAccountId },
    });
  }

  async listConversations(params: ListConversationsParams): Promise<ConversationListResponse> {
    return this.request(
      pathWithQuery(`/accounts/${params.accountId}/conversations`, {
        cursor: params.cursor,
        limit: params.limit,
        status: params.status,
        assignment: params.assignment,
      })
    );
  }

  async getConversationDetail(accountId: string, conversationId: string): Promise<ConversationDetailResponse> {
    return this.request(`/accounts/${accountId}/conversations/${conversationId}`);
  }

  async listMessages(params: ListMessagesParams): Promise<MessageListResponse> {
    return this.request(
      pathWithQuery(`/accounts/${params.accountId}/conversations/${params.conversationId}/messages`, {
        cursor: params.cursor,
        limit: params.limit,
        order: params.order,
      })
    );
  }

  async sendTextMessage(params: SendTextMessageParams): Promise<MessageSendResponse> {
    return this.request(`/accounts/${params.accountId}/conversations/${params.conversationId}/messages/text`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': params.idempotencyKey,
      },
      body: {
        clientMessageId: params.clientMessageId,
        text: params.text,
        quotedMessageId: params.quotedMessageId ?? null,
      },
    });
  }

  async getLinkedDeal(accountId: string, conversationId: string): Promise<LinkedDealResponse> {
    return this.request(`/accounts/${accountId}/conversations/${conversationId}/linked-deal`);
  }

  async updateDealStage(params: UpdateDealStageParams): Promise<DealStageUpdateResponse> {
    return this.request(`/accounts/${params.accountId}/deals/${params.dealId}/stage`, {
      method: 'PATCH',
      headers: params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : undefined,
      body: {
        stageId: params.stageId,
        clientMutationId: params.clientMutationId,
        expectedVersion: params.expectedVersion ?? null,
        note: params.note ?? null,
      },
    });
  }

  async listPipelineStages(accountId: string, includeCounters = true): Promise<PipelineStagesResponse> {
    return this.request(
      pathWithQuery(`/accounts/${accountId}/pipeline/stages`, {
        includeCounters,
      })
    );
  }

  async listDealsByStage(params: ListDealsByStageParams): Promise<DealsByStageResponse> {
    return this.request(
      pathWithQuery(`/accounts/${params.accountId}/pipeline/stages/${params.stageId}/deals`, {
        cursor: params.cursor,
        limit: params.limit,
        assignedTo: params.assignedTo,
        sort: params.sort,
      })
    );
  }

  async getBookingByDeal(accountId: string, dealId: string): Promise<BookingByDealResponse> {
    return this.request(`/accounts/${accountId}/deals/${dealId}/booking`);
  }

  async getManagerCounters(
    accountId: string,
    options: { date?: string; timeZone?: string } = {}
  ): Promise<ManagerCountersResponse> {
    return this.request(
      pathWithQuery(`/accounts/${accountId}/manager/counters`, {
        date: options.date,
        timeZone: options.timeZone,
      })
    );
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string> | undefined;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const token = await this.tokenProvider?.();
    const url = `${this.baseUrl}${options.query ? pathWithQuery(path, options.query) : path}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch {
      throw new FleexaApiError(0, {
        error: {
          code: 'network_error',
          message: 'Network connection failed.',
        },
      });
    }

    const json = await safeJson(response);
    if (!response.ok) {
      throw new FleexaApiError(response.status, (json as ErrorResponse | null) ?? fallbackError(response.status));
    }

    return json as T;
  }
}

const now = new Date('2026-07-18T09:00:00Z').toISOString();

const mockSession: CurrentSessionResponse = {
  user: {
    id: 'user_mock_manager',
    name: 'Fleexa Manager',
    email: 'manager@fleexa.example',
    timeZone: 'Asia/Dubai',
  },
  activeAccountId: 'acc_mock_fleexa',
  memberships: [
    {
      accountId: 'acc_mock_fleexa',
      accountName: 'Fleexa Demo',
      role: 'manager',
      permissions: [
        'session:read',
        'conversations:read',
        'messages:send',
        'deals:read',
        'deals:update_stage',
        'pipeline:read',
        'bookings:read',
        'counters:read',
      ],
      features: ['manager-web-foundation'],
    },
  ],
  permissions: [
    'session:read',
    'conversations:read',
    'messages:send',
    'deals:read',
    'deals:update_stage',
    'pipeline:read',
    'bookings:read',
    'counters:read',
  ],
  realtime: {
    url: 'wss://mock.fleexa.local/api/fleexa-manager/v1/accounts/acc_mock_fleexa/realtime',
    token: 'mock-realtime-token',
    tokenExpiresAt: '2026-07-18T10:00:00Z',
    lastEventCursor: 'mock-cursor-1',
  },
  serverTime: now,
  apiVersion: '0.1.0-mock',
};

const mockStages: PipelineStagesResponse = {
  data: [
    {
      id: 'stage_new',
      key: 'new',
      name: 'New',
      position: 1,
      kind: 'intake',
      isTerminal: false,
      counters: { dealCount: 8, totalAmount: { amount: '128000', currency: 'AED' } },
    },
    {
      id: 'stage_reserved',
      key: 'reserved',
      name: 'Reserved',
      position: 2,
      kind: 'successful',
      isTerminal: false,
      counters: { dealCount: 3, totalAmount: { amount: '42000', currency: 'AED' } },
    },
    {
      id: 'stage_lost',
      key: 'lost',
      name: 'Lost',
      position: 3,
      kind: 'lost',
      isTerminal: true,
      counters: { dealCount: 2, totalAmount: { amount: '0', currency: 'AED' } },
    },
  ],
};

const mockContact: ContactSummary = {
  id: 'contact_mock_amina',
  displayName: 'Amina Noor',
  phone: '+971500000000',
  email: 'amina@example.com',
};

const mockDeal: DealSummary = {
  id: 'deal_mock_range_rover',
  accountId: 'acc_mock_fleexa',
  title: 'Range Rover weekly rental',
  stage: {
    id: 'stage_reserved',
    key: 'reserved',
    name: 'Reserved',
  },
  amount: {
    amount: '14000',
    currency: 'AED',
  },
  bookingRef: {
    bookingId: 'booking_mock_2048',
    status: 'confirmed' as const,
    externalBookingId: 'BK-2048',
  },
  contact: mockContact,
  lastActivityAt: now,
  createdAt: now,
  updatedAt: now,
  permissions: ['deals:read', 'deals:update_stage'],
};

const mockStageRefFor = (stageId: string): PipelineStageRef => {
  const stage = mockStages.data.find(item => item.id === stageId) ?? mockStages.data[0];

  return {
    id: stage?.id ?? 'stage_new',
    key: stage?.key ?? 'new',
    name: stage?.name ?? 'New',
  };
};

export class MockFleexaApiClient implements FleexaApiClient {
  async getCurrentSession(): Promise<CurrentSessionResponse> {
    return mockSession;
  }

  async listConversations(_params: ListConversationsParams): Promise<ConversationListResponse> {
    return {
      data: [
        {
          id: 'conv_mock_whatsapp',
          accountId: 'acc_mock_fleexa',
          title: 'WhatsApp client',
          status: 'open',
          priority: 'high',
          channel: {
            type: 'whatsapp',
            displayName: 'Main WhatsApp',
          },
          contact: mockContact,
          assignee: {
            id: 'user_mock_manager',
            displayName: 'Fleexa Manager',
            type: 'user',
          },
          lastMessage: {
            id: 'msg_mock_latest',
            text: 'Can you confirm the Range Rover booking?',
            direction: 'incoming',
            createdAt: now,
          },
          linkedDeal: mockDeal,
          unreadCount: 2,
          canReply: true,
          replyWindow: {
            canReply: true,
            reason: 'open',
            closesAt: '2026-07-18T19:00:00Z',
          },
          lastActivityAt: now,
          permissions: ['conversations:read', 'messages:send'],
        },
      ],
      page: {
        nextCursor: null,
        hasMore: false,
        limit: 30,
      },
    };
  }

  async getConversationDetail(): Promise<ConversationDetailResponse> {
    const list = await this.listConversations({ accountId: 'acc_mock_fleexa' });
    const first = list.data[0];
    if (!first) throw new Error('Mock conversation missing');

    return {
      data: {
        ...first,
        participants: [
          { id: 'user_mock_manager', displayName: 'Fleexa Manager', type: 'user' },
          { id: 'contact_mock_amina', displayName: 'Amina Noor', type: 'contact' },
        ],
        tags: ['vip', 'booking'],
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  async listMessages(): Promise<MessageListResponse> {
    return {
      data: [
        {
          id: 'msg_mock_latest',
          conversationId: 'conv_mock_whatsapp',
          direction: 'incoming',
          visibility: 'customer',
          type: 'text',
          text: 'Can you confirm the Range Rover booking?',
          sender: { id: 'contact_mock_amina', displayName: 'Amina Noor', type: 'contact' },
          deliveryStatus: 'delivered',
          attachments: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      page: {
        nextCursor: null,
        hasMore: false,
        limit: 30,
      },
    };
  }

  async sendTextMessage(params: SendTextMessageParams): Promise<MessageSendResponse> {
    return {
      data: {
        id: `msg_${params.clientMessageId}`,
        conversationId: params.conversationId,
        clientMessageId: params.clientMessageId,
        direction: 'outgoing',
        visibility: 'customer',
        type: 'text',
        text: params.text,
        sender: { id: 'user_mock_manager', displayName: 'Fleexa Manager', type: 'user' },
        deliveryStatus: 'sent',
        attachments: [],
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  async getLinkedDeal(): Promise<LinkedDealResponse> {
    return {
      conversationId: 'conv_mock_whatsapp',
      linkState: 'linked',
      deal: mockDeal,
    };
  }

  async updateDealStage(params: UpdateDealStageParams): Promise<DealStageUpdateResponse> {
    return {
      data: {
        ...mockDeal,
        stage: mockStageRefFor(params.stageId),
      },
      transition: {
        fromStage: mockDeal.stage,
        toStage: mockStageRefFor(params.stageId),
        changedAt: now,
        changedBy: { id: 'user_mock_manager', displayName: 'Fleexa Manager', type: 'user' },
      },
      emittedEventId: 'evt_mock_stage_changed',
    };
  }

  async listPipelineStages(): Promise<PipelineStagesResponse> {
    return mockStages;
  }

  async listDealsByStage(params: ListDealsByStageParams): Promise<DealsByStageResponse> {
    return {
      stage: mockStageRefFor(params.stageId),
      data: [mockDeal],
      page: {
        nextCursor: null,
        hasMore: false,
        limit: params.limit ?? 30,
      },
    };
  }

  async getBookingByDeal(): Promise<BookingByDealResponse> {
    return {
      dealId: mockDeal.id,
      linkState: 'linked',
      booking: {
        id: 'booking_mock_2048',
        accountId: 'acc_mock_fleexa',
        dealId: mockDeal.id,
        externalBookingId: 'BK-2048',
        status: 'confirmed',
        customer: mockContact,
        vehicle: {
          id: 'vehicle_mock_rr',
          label: 'Range Rover Vogue',
          plateNumber: 'D 2048',
        },
        period: {
          startsAt: '2026-07-18T12:00:00Z',
          endsAt: '2026-07-25T12:00:00Z',
          timeZone: 'Asia/Dubai',
        },
        total: {
          amount: '14000',
          currency: 'AED',
        },
        sourceSystem: 'fleetly',
        lastSyncedAt: now,
        version: 1,
      },
    };
  }

  async getManagerCounters(): Promise<ManagerCountersResponse> {
    return {
      accountId: 'acc_mock_fleexa',
      generatedAt: now,
      scope: 'mine',
      counters: {
        openConversations: 14,
        unreadConversations: 5,
        activeDeals: 21,
        overdueDeals: 2,
        bookingsToday: 4,
        bookingConflicts: 1,
      },
    };
  }
}

export const createFleexaApiClient = (
  options: FleexaApiClientOptions & { mode?: 'live' | 'mock' }
): FleexaApiClient => {
  if (options.mode === 'mock') {
    return new MockFleexaApiClient();
  }

  return new HttpFleexaApiClient(options);
};
