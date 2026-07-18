import type {
  AccountMembership,
  Actor,
  AppRole,
  BookingByDealResponse,
  ChannelType,
  ConversationDetailResponse,
  ConversationListItem,
  ConversationListResponse,
  ConversationStatus,
  ContactSummary,
  DeliveryStatus,
  CurrentSessionResponse,
  DealSummary,
  DealStageUpdateResponse,
  DealsByStageResponse,
  ErrorResponse,
  LinkedDealResponse,
  ManagerMessage,
  ManagerCountersResponse,
  MessageListResponse,
  MessageSendResponse,
  MessagePreview,
  Permission,
  PipelineStageRef,
  PipelineStagesResponse,
} from '@fleexa/domain';

export type TokenProvider = () => string | null | Promise<string | null>;
export type FleexaApiDriver = 'manager' | 'chatwoot';

export interface FleexaApiClientOptions {
  baseUrl: string;
  driver?: FleexaApiDriver;
  chatwootAccountId?: string | undefined;
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

const chatwootErrorCodeForStatus = (status: number): ErrorResponse['error']['code'] => {
  if (status === 0) return 'network_error';
  if (status === 400 || status === 422) return 'validation_failed';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  return 'unknown_error';
};

const recordFrom = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const arrayFrom = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const primitiveToString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const numberFrom = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const booleanFrom = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const timestampToIso = (value: unknown): string => {
  const numeric = numberFrom(value);
  const date = numeric !== undefined
    ? new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000)
    : new Date(primitiveToString(value) ?? 0);

  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
};

const stableId = (prefix: string, value: unknown): string => `${prefix}_${primitiveToString(value) ?? 'unknown'}`;

const rawIdFromStableId = (prefix: string, value: string): string =>
  value.startsWith(`${prefix}_`) ? value.slice(prefix.length + 1) : value;

const CHATWOOT_VERTICAL_SLICE_PERMISSIONS: Permission[] = [
  'session:read',
  'conversations:read',
  'messages:send',
  'counters:read',
];

const CHATWOOT_READ_PERMISSIONS: Permission[] = ['conversations:read'];

const normalizeChatwootBaseUrl = (baseUrl: string): string => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized.endsWith('/api/v1')) return normalized;
  if (normalized.endsWith('/api/fleexa-manager/v1')) {
    return `${normalized.slice(0, -'/api/fleexa-manager/v1'.length)}/api/v1`;
  }
  return `${normalized}/api/v1`;
};

const chatwootErrorEnvelope = (status: number, json: unknown): ErrorResponse => {
  const body = recordFrom(json);
  const rawError = body.error;
  const errorRecord = recordFrom(rawError);
  const message =
    primitiveToString(errorRecord.message) ??
    primitiveToString(errorRecord.description) ??
    primitiveToString(rawError) ??
    primitiveToString(body.message) ??
    fallbackError(status).error.message;

  return {
    error: {
      code: chatwootErrorCodeForStatus(status),
      message,
    },
  };
};

const chatwootRoleToAppRole = (role: unknown): AppRole => {
  if (role === 'administrator') return 'owner';
  if (role === 'supervisor') return 'manager';
  return 'operator';
};

const chatwootChannelType = (channel: unknown): ChannelType => {
  switch (channel) {
    case 'Channel::Whatsapp':
    case 'Channel::WhatsappCloud':
    case 'Channel::WhatsappOfficial':
      return 'whatsapp';
    case 'Channel::FacebookPage':
      return 'instagram';
    case 'Channel::WebWidget':
      return 'web_widget';
    case 'Channel::Email':
      return 'email';
    case 'Channel::Sms':
      return 'phone';
    case 'Channel::Telegram':
      return 'telegram';
    default:
      return 'other';
  }
};

const chatwootChannelName = (channel: unknown): string =>
  primitiveToString(channel)?.replace(/^Channel::/, '').replace(/([a-z])([A-Z])/g, '$1 $2') ?? 'Chatwoot';

const chatwootConversationStatus = (status: unknown): ConversationStatus => {
  if (status === 'pending' || status === 'resolved' || status === 'snoozed') return status;
  return 'open';
};

const chatwootDeliveryStatus = (status: unknown): DeliveryStatus => {
  if (status === 'delivered' || status === 'read' || status === 'failed' || status === 'sent') return status;
  if (status === 'progress' || status === 'sending') return 'sending';
  return 'queued';
};

const chatwootPriority = (priority: unknown): NonNullable<ConversationListItem['priority']> => {
  if (priority === 'low' || priority === 'high' || priority === 'urgent') return priority;
  return 'normal';
};

const actorFromChatwoot = (raw: unknown, fallbackType: Actor['type'] = 'user'): Actor | null => {
  const record = recordFrom(raw);
  const id = primitiveToString(record.id);
  if (!id) return null;

  const rawType = primitiveToString(record.type)?.toLowerCase();
  const type: Actor['type'] = rawType?.includes('contact')
    ? 'contact'
    : rawType?.includes('bot')
      ? 'bot'
      : rawType?.includes('user') || rawType?.includes('agent')
        ? 'user'
        : fallbackType;

  return {
    id: stableId(type, id),
    displayName:
      primitiveToString(record.available_name) ??
      primitiveToString(record.display_name) ??
      primitiveToString(record.name) ??
      primitiveToString(record.email) ??
      `${type} ${id}`,
    type,
    avatarUrl: primitiveToString(record.avatar_url) ?? primitiveToString(record.thumbnail) ?? null,
  };
};

const contactFromChatwoot = (raw: unknown): ContactSummary => {
  const record = recordFrom(raw);
  const id = primitiveToString(record.id) ?? primitiveToString(record.source_id) ?? 'unknown';
  const email = primitiveToString(record.email) ?? null;
  const phone = primitiveToString(record.phone_number) ?? primitiveToString(record.phone) ?? null;

  return {
    id: stableId('contact', id),
    displayName:
      primitiveToString(record.available_name) ??
      primitiveToString(record.name) ??
      primitiveToString(record.display_name) ??
      email ??
      phone ??
      `Contact ${id}`,
    phone,
    email,
  };
};

const messageDirectionFromChatwoot = (messageType: unknown): ManagerMessage['direction'] =>
  numberFrom(messageType) === 0 ? 'incoming' : 'outgoing';

const messageVisibilityFromChatwoot = (raw: Record<string, unknown>): ManagerMessage['visibility'] => {
  if (booleanFrom(raw.private) === true) return 'private_note';
  if (numberFrom(raw.message_type) === 2) return 'system';
  return 'customer';
};

const messageTypeFromChatwoot = (raw: Record<string, unknown>): ManagerMessage['type'] => {
  if (numberFrom(raw.message_type) === 2) return 'system';
  if (arrayFrom(raw.attachments).length) return 'attachment';
  if (raw.content_type === 'input_select' || raw.content_type === 'cards') return 'template';
  return 'text';
};

const messageFromChatwoot = (raw: unknown): ManagerMessage => {
  const record = recordFrom(raw);
  const id = primitiveToString(record.id) ?? 'unknown';
  const conversationId = primitiveToString(record.conversation_id) ?? 'unknown';
  const contentAttributes = recordFrom(record.content_attributes);
  const createdAt = timestampToIso(record.created_at);

  return {
    id: stableId('msg', id),
    conversationId: stableId('conv', conversationId),
    clientMessageId: primitiveToString(contentAttributes.clientMessageId) ?? primitiveToString(contentAttributes.client_message_id) ?? null,
    direction: messageDirectionFromChatwoot(record.message_type),
    visibility: messageVisibilityFromChatwoot(record),
    type: messageTypeFromChatwoot(record),
    text: primitiveToString(record.content) ?? null,
    sender: actorFromChatwoot(record.sender, messageDirectionFromChatwoot(record.message_type) === 'incoming' ? 'contact' : 'user'),
    deliveryStatus: chatwootDeliveryStatus(record.status),
    failureReason: primitiveToString(record.external_error) ?? null,
    attachments: arrayFrom(record.attachments).map(attachment => {
      const attachmentRecord = recordFrom(attachment);
      return {
        id: stableId('attachment', attachmentRecord.id),
        kind: attachmentRecord.file_type === 'image'
          ? 'image'
          : attachmentRecord.file_type === 'video'
            ? 'video'
            : attachmentRecord.file_type === 'audio'
              ? 'audio'
              : attachmentRecord.file_type === 'file'
                ? 'document'
                : 'other',
        fileName: primitiveToString(attachmentRecord.file_name) ?? null,
        url: primitiveToString(attachmentRecord.data_url) ?? primitiveToString(attachmentRecord.download_url) ?? '',
        contentType: primitiveToString(attachmentRecord.content_type) ?? null,
      };
    }),
    createdAt,
    updatedAt: createdAt,
  };
};

const messagePreviewFromChatwoot = (raw: unknown): MessagePreview | null => {
  const record = recordFrom(raw);
  const id = primitiveToString(record.id);
  if (!id) return null;

  return {
    id: stableId('msg', id),
    text: primitiveToString(record.content) ?? '',
    direction: messageDirectionFromChatwoot(record.message_type),
    createdAt: timestampToIso(record.created_at),
  };
};

const conversationFromChatwoot = (raw: unknown): ConversationListItem => {
  const record = recordFrom(raw);
  const meta = recordFrom(record.meta);
  const displayId = primitiveToString(record.id) ?? 'unknown';
  const accountId = primitiveToString(record.account_id) ?? 'unknown';
  const channel = meta.channel;
  const contact = contactFromChatwoot(meta.sender);
  const lastRawMessage = arrayFrom(record.messages)[0] ?? record.last_non_activity_message;
  const canReply = booleanFrom(record.can_reply) ?? false;

  return {
    id: stableId('conv', displayId),
    accountId: stableId('acc', accountId),
    title: contact.displayName,
    status: chatwootConversationStatus(record.status),
    priority: chatwootPriority(record.priority),
    channel: {
      type: chatwootChannelType(channel),
      displayName: chatwootChannelName(channel),
    },
    contact,
    assignee: actorFromChatwoot(meta.assignee, 'user'),
    lastMessage: messagePreviewFromChatwoot(lastRawMessage),
    linkedDeal: null,
    unreadCount: numberFrom(record.unread_count) ?? 0,
    canReply,
    replyWindow: {
      canReply,
      reason: canReply ? 'open' : 'unsupported_channel',
      closesAt: null,
    },
    lastActivityAt: timestampToIso(record.last_activity_at ?? record.timestamp ?? record.updated_at),
    permissions: canReply ? CHATWOOT_VERTICAL_SLICE_PERMISSIONS : CHATWOOT_READ_PERMISSIONS,
  };
};

const conversationDetailFromChatwoot = (raw: unknown): ConversationDetailResponse => {
  const record = recordFrom(raw);
  const meta = recordFrom(record.meta);
  const base = conversationFromChatwoot(raw);
  const assignee = actorFromChatwoot(meta.assignee, 'user');
  const participants = [
    assignee,
    { id: base.contact.id, displayName: base.contact.displayName, type: 'contact' as const },
  ].filter((actor): actor is Actor => Boolean(actor));

  return {
    data: {
      ...base,
      participants,
      tags: arrayFrom(record.labels).map(label => primitiveToString(label)).filter((label): label is string => Boolean(label)),
      createdAt: timestampToIso(record.created_at),
      updatedAt: timestampToIso(record.updated_at),
    },
  };
};

export class ChatwootFleexaApiClient implements FleexaApiClient {
  private readonly baseUrl: string;
  private readonly accountId: string | undefined;
  private readonly tokenProvider: TokenProvider | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FleexaApiClientOptions) {
    this.baseUrl = normalizeChatwootBaseUrl(options.baseUrl);
    this.accountId = options.chatwootAccountId;
    this.tokenProvider = options.tokenProvider;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getCurrentSession(activeAccountId?: string): Promise<CurrentSessionResponse> {
    const profile = recordFrom(await this.request('/profile'));
    const rawAccounts = arrayFrom(profile.accounts);
    const configuredAccountId = activeAccountId ? rawIdFromStableId('acc', activeAccountId) : this.accountId;
    const firstAccount = recordFrom(rawAccounts[0]);
    const activeRawAccountId =
      configuredAccountId ??
      primitiveToString(profile.account_id) ??
      primitiveToString(firstAccount.id) ??
      'unknown';
    const activeStableAccountId = stableId('acc', activeRawAccountId);
    const memberships: AccountMembership[] = rawAccounts.map(rawAccount => {
      const account = recordFrom(rawAccount);
      const id = primitiveToString(account.id) ?? 'unknown';
      return {
        accountId: stableId('acc', id),
        accountName: primitiveToString(account.name) ?? `Account ${id}`,
        role: chatwootRoleToAppRole(account.role),
        permissions: CHATWOOT_VERTICAL_SLICE_PERMISSIONS,
        features: ['chatwoot-local-vertical-slice'],
      };
    });

    return {
      user: {
        id: stableId('user', profile.id),
        name:
          primitiveToString(profile.available_name) ??
          primitiveToString(profile.display_name) ??
          primitiveToString(profile.name) ??
          'Chatwoot user',
        email: primitiveToString(profile.email) ?? '',
        avatarUrl: primitiveToString(profile.avatar_url) ?? null,
      },
      activeAccountId: activeStableAccountId,
      memberships,
      permissions: CHATWOOT_VERTICAL_SLICE_PERMISSIONS,
      realtime: {
        url: this.realtimeUrl(),
        token: primitiveToString(profile.pubsub_token) ?? '',
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        lastEventCursor: null,
      },
      serverTime: new Date().toISOString(),
      apiVersion: 'chatwoot-v1-adapter',
    };
  }

  async listConversations(params: ListConversationsParams): Promise<ConversationListResponse> {
    const accountId = rawIdFromStableId('acc', params.accountId);
    const page = numberFrom(params.cursor) ?? 1;
    const assignment = params.assignment === 'mine' ? 'me' : params.assignment === 'unassigned' ? 'unassigned' : undefined;
    const response = recordFrom(
      await this.request(
        pathWithQuery(`/accounts/${accountId}/conversations`, {
          status: params.status ?? 'open',
          page,
          assignee_type: assignment,
        })
      )
    );
    const data = recordFrom(response.data);
    const payload = arrayFrom(data.payload);

    return {
      data: payload.map(conversationFromChatwoot),
      page: {
        nextCursor: payload.length >= 25 ? String(page + 1) : null,
        hasMore: payload.length >= 25,
        limit: payload.length,
      },
    };
  }

  async getConversationDetail(accountId: string, conversationId: string): Promise<ConversationDetailResponse> {
    const rawAccountId = rawIdFromStableId('acc', accountId);
    const rawConversationId = rawIdFromStableId('conv', conversationId);
    return conversationDetailFromChatwoot(
      await this.request(`/accounts/${rawAccountId}/conversations/${rawConversationId}`)
    );
  }

  async listMessages(params: ListMessagesParams): Promise<MessageListResponse> {
    const accountId = rawIdFromStableId('acc', params.accountId);
    const conversationId = rawIdFromStableId('conv', params.conversationId);
    const response = recordFrom(
      await this.request(
        pathWithQuery(`/accounts/${accountId}/conversations/${conversationId}/messages`, {
          before: params.cursor,
        })
      )
    );
    const payload = arrayFrom(response.payload);
    const messages = payload.map(messageFromChatwoot);
    const orderedMessages = params.order === 'desc' ? [...messages].reverse() : messages;

    return {
      data: orderedMessages,
      page: {
        nextCursor: payload.length >= 20 ? rawIdFromStableId('msg', orderedMessages[0]?.id ?? '') : null,
        hasMore: payload.length >= 20,
        limit: payload.length,
      },
    };
  }

  async sendTextMessage(params: SendTextMessageParams): Promise<MessageSendResponse> {
    const accountId = rawIdFromStableId('acc', params.accountId);
    const conversationId = rawIdFromStableId('conv', params.conversationId);
    const message = await this.request(`/accounts/${accountId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': params.idempotencyKey,
      },
      body: {
        content: params.text,
        private: false,
        content_attributes: {
          clientMessageId: params.clientMessageId,
          idempotencyKey: params.idempotencyKey,
        },
      },
    });

    return {
      data: messageFromChatwoot(message),
    };
  }

  async getLinkedDeal(_accountId: string, conversationId: string): Promise<LinkedDealResponse> {
    return {
      conversationId,
      linkState: 'missing',
      deal: null,
    };
  }

  async updateDealStage(_params: UpdateDealStageParams): Promise<DealStageUpdateResponse> {
    throw new FleexaApiError(501, {
      error: {
        code: 'unknown_error',
        message: 'Deal stage updates require the Fleexa Manager API layer.',
      },
    });
  }

  async listPipelineStages(_accountId: string): Promise<PipelineStagesResponse> {
    return { data: [] };
  }

  async listDealsByStage(params: ListDealsByStageParams): Promise<DealsByStageResponse> {
    return {
      stage: {
        id: params.stageId,
        key: params.stageId,
        name: params.stageId,
      },
      data: [],
      page: {
        nextCursor: null,
        hasMore: false,
        limit: 0,
      },
    };
  }

  async getBookingByDeal(_accountId: string, dealId: string): Promise<BookingByDealResponse> {
    return {
      dealId,
      linkState: 'missing',
      booking: null,
    };
  }

  async getManagerCounters(accountId: string): Promise<ManagerCountersResponse> {
    const rawAccountId = rawIdFromStableId('acc', accountId);
    const response = recordFrom(
      await this.request(pathWithQuery(`/accounts/${rawAccountId}/conversations/meta`, { status: 'open' }))
    );
    const meta = recordFrom(response.meta);
    const conversations = await this.listConversations({ accountId, status: 'open', assignment: 'mine' });

    return {
      accountId,
      generatedAt: new Date().toISOString(),
      scope: 'mine',
      counters: {
        openConversations: numberFrom(meta.mine_count) ?? conversations.data.length,
        unreadConversations: conversations.data.filter(conversation => conversation.unreadCount > 0).length,
        activeDeals: 0,
        overdueDeals: 0,
        bookingsToday: 0,
        bookingConflicts: 0,
      },
    };
  }

  private async request<T = unknown>(
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string> | undefined;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const token = await this.tokenProvider?.();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.api_access_token = token;
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
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
      response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch {
      throw new FleexaApiError(0, chatwootErrorEnvelope(0, null));
    }

    const json = await safeJson(response);
    if (!response.ok) {
      throw new FleexaApiError(response.status, chatwootErrorEnvelope(response.status, json));
    }

    return json as T;
  }

  private realtimeUrl(): string {
    const url = new URL(this.baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/cable';
    url.search = '';
    return url.toString();
  }
}

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
  options: FleexaApiClientOptions & { mode?: 'live' | 'mock'; driver?: FleexaApiDriver }
): FleexaApiClient => {
  if (options.mode === 'mock') {
    return new MockFleexaApiClient();
  }

  if (options.driver === 'chatwoot') {
    return new ChatwootFleexaApiClient(options);
  }

  return new HttpFleexaApiClient(options);
};
