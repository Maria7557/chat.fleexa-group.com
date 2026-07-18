export const PERMISSIONS = [
  'session:read',
  'conversations:read',
  'messages:send',
  'deals:read',
  'deals:update_stage',
  'pipeline:read',
  'bookings:read',
  'counters:read',
  'settings:read',
  'settings:write',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type AppRole = 'operator' | 'manager' | 'marketing_admin' | 'owner';
export type IsoDateTime = string;
export type IsoDate = string;

export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  locale?: string;
  timeZone?: string;
}

export interface AccountMembership {
  accountId: string;
  accountName: string;
  role: AppRole;
  permissions: Permission[];
  features?: string[];
}

export interface RealtimeBootstrap {
  url: string;
  token: string;
  tokenExpiresAt: IsoDateTime;
  lastEventCursor?: string | null;
}

export interface CurrentSessionResponse {
  user: ManagerUser;
  activeAccountId?: string | null;
  memberships: AccountMembership[];
  permissions: Permission[];
  realtime: RealtimeBootstrap;
  serverTime: IsoDateTime;
  apiVersion: string;
}

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'snoozed';
export type ChannelType =
  | 'whatsapp'
  | 'instagram'
  | 'web_widget'
  | 'email'
  | 'phone'
  | 'telegram'
  | 'other';

export interface Actor {
  id: string;
  displayName: string;
  type: 'user' | 'contact' | 'system' | 'bot';
  avatarUrl?: string | null;
}

export interface ChannelSummary {
  type: ChannelType;
  displayName: string;
}

export interface ContactSummary {
  id: string;
  displayName: string;
  phone?: string | null;
  email?: string | null;
}

export interface MessagePreview {
  id: string;
  text: string;
  direction: 'incoming' | 'outgoing';
  createdAt: IsoDateTime;
}

export interface ReplyWindow {
  canReply: boolean;
  reason: 'open' | 'expired' | 'missing_channel_permission' | 'unsupported_channel';
  closesAt?: IsoDateTime | null;
}

export interface Money {
  amount: string;
  currency: string;
}

export interface PipelineStageRef {
  id: string;
  key: string;
  name: string;
}

export interface SourceAttribution {
  trafficSourceKey: string | null;
  trafficSourceLabel: string | null;
  leadOriginKey: string | null;
  leadOriginLabel: string | null;
  sourceDetectionMethod: 'click_id' | 'utm' | 'first_message_rule' | 'manual' | 'unknown';
  sourceConfidence: 'auto' | 'manual' | 'unknown';
  needsSourceClarification: boolean;
}

export interface LeadQualification {
  status: 'pending' | 'qualified' | 'unqualified';
  reason?: string | null;
  lostReasonKey?: string | null;
  lostReasonLabel?: string | null;
}

export interface BookingRef {
  bookingId: string;
  status: BookingStatus;
  externalBookingId?: string | null;
}

export interface DealSummary {
  id: string;
  accountId: string;
  title: string;
  stage: PipelineStageRef;
  amount: Money | null;
  bookingRef?: BookingRef | null;
  contact?: ContactSummary | null;
  assignee?: Actor | null;
  sourceAttribution?: SourceAttribution | null;
  qualification?: LeadQualification | null;
  lastActivityAt?: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  permissions: Permission[];
}

export interface ConversationListItem {
  id: string;
  accountId: string;
  title: string;
  status: ConversationStatus;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channel: ChannelSummary;
  contact: ContactSummary;
  assignee?: Actor | null;
  lastMessage?: MessagePreview | null;
  linkedDeal?: DealSummary | null;
  unreadCount: number;
  canReply?: boolean;
  replyWindow?: ReplyWindow | null;
  lastActivityAt: IsoDateTime;
  permissions: Permission[];
}

export interface ConversationDetail extends ConversationListItem {
  participants: Actor[];
  tags: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageVisibility = 'customer' | 'private_note' | 'system';
export type ManagerMessageType = 'text' | 'attachment' | 'template' | 'system';
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageAttachment {
  id: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'other';
  fileName?: string | null;
  url: string;
  contentType?: string | null;
}

export interface ManagerMessage {
  id: string;
  conversationId: string;
  clientMessageId?: string | null;
  direction: MessageDirection;
  visibility: MessageVisibility;
  type: ManagerMessageType;
  text?: string | null;
  sender?: Actor | null;
  deliveryStatus?: DeliveryStatus;
  failureReason?: string | null;
  attachments?: MessageAttachment[];
  createdAt: IsoDateTime;
  updatedAt?: IsoDateTime | null;
}

export interface PipelineStage {
  id: string;
  key: string;
  name: string;
  position: number;
  kind: 'intake' | 'active' | 'successful' | 'lost';
  isTerminal: boolean;
  counters?: {
    dealCount: number;
    totalAmount: Money;
  } | null;
  requiredFields?: Array<{
    key: string;
    label: string;
  }>;
}

export type BookingStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface BookingPeriod {
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  timeZone?: string;
}

export interface VehicleSummary {
  id?: string | null;
  label: string;
  plateNumber?: string | null;
}

export interface BookingSummary {
  id: string;
  accountId: string;
  dealId?: string | null;
  externalBookingId?: string | null;
  status: BookingStatus;
  customer: ContactSummary;
  vehicle?: VehicleSummary | null;
  period: BookingPeriod;
  total?: Money | null;
  sourceSystem: string;
  lastSyncedAt?: IsoDateTime | null;
  version: number;
}

export interface CursorPage {
  nextCursor: string | null;
  previousCursor?: string | null;
  hasMore: boolean;
  limit: number;
}

export interface ConversationListResponse {
  data: ConversationListItem[];
  page: CursorPage;
}

export interface ConversationDetailResponse {
  data: ConversationDetail;
}

export interface MessageListResponse {
  data: ManagerMessage[];
  page: CursorPage;
}

export interface MessageSendResponse {
  data: ManagerMessage;
  idempotency: {
    key: string;
    duplicate: boolean;
    originalMessageId?: string | null;
  };
}

export interface LinkedDealResponse {
  conversationId: string;
  linkState: 'linked' | 'missing' | 'inaccessible';
  deal: DealSummary | null;
}

export interface DealStageTransition {
  fromStage: PipelineStageRef | null;
  toStage: PipelineStageRef;
  changedAt: IsoDateTime;
  changedBy: Actor;
}

export interface DealStageUpdateResponse {
  data: DealSummary;
  transition: DealStageTransition;
  emittedEventId?: string | null;
}

export interface PipelineStagesResponse {
  data: PipelineStage[];
}

export interface DealsByStageResponse {
  stage: PipelineStageRef;
  data: DealSummary[];
  page: CursorPage;
}

export interface BookingByDealResponse {
  dealId: string;
  linkState: 'linked' | 'missing' | 'inaccessible' | 'conflict';
  booking: BookingSummary | null;
}

export interface ManagerCountersResponse {
  accountId: string;
  generatedAt: IsoDateTime;
  counters: {
    unread: number;
    assigned: number;
    unassigned: number;
  };
}

export type ServerApiErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_failed'
  | 'rate_limited'
  | 'invalid_webhook_signature'
  | 'unknown_error';

export type ApiErrorCode = ServerApiErrorCode | 'network_error';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: ApiErrorBody;
}

export const hasPermission = (
  permissions: readonly Permission[],
  permission: Permission
): boolean => permissions.includes(permission);

export const membershipForAccount = (
  session: CurrentSessionResponse,
  accountId: string
): AccountMembership | undefined =>
  session.memberships.find(membership => membership.accountId === accountId);

export const activeAccountIdForSession = (
  session: CurrentSessionResponse
): string | null =>
  session.activeAccountId ?? session.memberships[0]?.accountId ?? null;

export const visiblePermissionsForAccount = (
  session: CurrentSessionResponse,
  accountId: string
): Permission[] => membershipForAccount(session, accountId)?.permissions ?? [];

export const assertStableIdPrefix = (value: string, prefix: string): void => {
  if (!value.startsWith(`${prefix}_`)) {
    throw new Error(`Expected ${prefix} stable id`);
  }
};
