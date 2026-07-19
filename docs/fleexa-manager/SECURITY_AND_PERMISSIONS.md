# Fleexa Manager Security And Permissions

Fleexa Manager must not inherit Chatwoot UI permissions by accident. It needs an
explicit API permission model that works for Expo web and iPhone clients.

## Security Principles

- Account isolation is mandatory for every account-scoped route.
- DTOs are normalized Manager objects, not raw Chatwoot, database, or provider
  records.
- Business rules and permission checks run on the backend.
- Mobile clients receive only the actions they can perform.
- Mutating requests are auditable and, where practical, idempotent.
- Booking webhooks require signed requests and replay protection.

## Authentication

Stage 3 keeps the accepted Stage 2 Option B strategy: temporary existing
Chatwoot authentication through the Fleexa Manager namespace. The manager-facing
UX no longer asks users to paste tokens. Instead, Expo calls
`POST /api/fleexa-manager/v1/session` with email, password, and an optional
workspace hint.

The login endpoint is a narrow adapter over Chatwoot credentials:

- It verifies the Chatwoot user email/password with Devise.
- It denies inactive, unconfirmed, or otherwise non-authenticatable users.
- It denies users without an active account membership.
- It returns a normalized Manager session DTO and a temporary Chatwoot user
  access token for internal client storage.
- It does not log passwords or tokens.
- It does not expose raw Chatwoot auth responses to Expo.

Accepted authentication inputs:

- `POST /session` with `email`, `password`, and optional `accountHint`
- `Authorization: Bearer <chatwoot_user_access_token>`
- `api_access_token: <chatwoot_user_access_token>`
- existing same-origin Chatwoot Rails session cookie for Expo web when the app
  is served from the same authenticated Chatwoot origin

The Manager API must still return Manager DTOs from `/api/fleexa-manager/v1`.
Production live mode must not call raw Chatwoot `/api/v1` routes directly.

Expo credential storage for Stage 3:

- iPhone/native stores the returned Chatwoot user access token through the
  SecureStore abstraction.
- Expo web stores the returned token through the same storage abstraction using
  session-scoped browser storage with a memory fallback for non-browser render
  contexts.
- The token must never be rendered in the UI, copied by the manager, logged, or
  committed.
- Mock mode can store mock credentials only for UI development and cannot
  satisfy production acceptance.

Refresh and revoke limitations:

- Stage 3 has `POST /session` only.
- No dedicated Manager `POST /session/refresh` or `DELETE /session` endpoints
  exist yet.
- Token refresh depends on Chatwoot's existing token/session lifecycle.
- Sign out clears local Expo storage but cannot revoke the upstream Chatwoot
  user access token by itself.
- Permission changes are detected by `GET /session/current` and future realtime
  session events, not by Manager refresh-token rotation.

Stage 3 expired or invalid session behavior:

- Wrong email/password returns `401 invalid_credentials`.
- Missing, invalid, revoked, expired, or inactive Chatwoot credentials on
  authenticated routes return `401 unauthenticated` with the standard Manager
  error envelope.
- Account membership failures return `403 forbidden`.
- Resource/account mismatches return `404 not_found` when confirming existence
  would leak cross-account data.
- Auth tokens must never be logged, embedded in docs, or committed in local env
  files. Local development must use untracked `.env` files only.

This remains temporary because Chatwoot tokens are not the final Manager auth
boundary. Before production beta, replace this with Manager-owned credentials,
short-lived access tokens, refresh-token rotation, server-side revoke,
device/session inventory, MFA support, and audit coverage for login, refresh,
and logout.

Future Manager auth requirements:

- Tokens must identify the user and active account memberships.
- Access tokens must be short-lived.
- Refresh tokens must be stored with platform-appropriate secure storage.
- `GET /session/current` is the source of truth for current roles,
  permissions, feature flags, and realtime bootstrap data.
- Realtime tokens must be short-lived and account-scoped.

## Account Isolation

Every account-scoped route includes `{accountId}`.

The backend must verify:

1. The token is valid.
2. The user belongs to `accountId`.
3. The user has the endpoint permission for `accountId`.
4. The requested resource belongs to `accountId`.

Return `404 not_found` when exposing whether a hidden resource exists would leak
cross-account information.

## Roles

Initial role model:

| Role | Purpose |
| --- | --- |
| `operator` | Handles assigned conversations and basic deal workflow. |
| `manager` | Sees team queues, moves deals, and reads counters. |
| `marketing_admin` | Manages attribution, marketing settings, and spend inputs. |
| `owner` | Full account administration and security-sensitive settings. |

Roles grant permissions; API checks should use permissions, not role names
directly.

## Permissions

Initial permission set:

| Permission | Allows |
| --- | --- |
| `session:read` | Read current session and memberships. |
| `conversations:read` | Read conversation lists, details, and messages. |
| `messages:send` | Send customer-visible text messages. |
| `deals:read` | Read linked deals and pipeline deal cards. |
| `deals:update_stage` | Move deals between stages. |
| `pipeline:read` | Read pipeline stages and stage counters. |
| `bookings:read` | Read booking summary linked to a deal. |
| `counters:read` | Read manager dashboard counters. |
| `settings:read` | Read account manager settings. |
| `settings:write` | Update account manager settings. |

Endpoint mapping:

| Endpoint | Permission |
| --- | --- |
| `POST /session` | Public credential exchange, then account membership required |
| `GET /session/current` | `session:read` |
| `GET /accounts/{accountId}/conversations` | `conversations:read` |
| `GET /accounts/{accountId}/conversations/{conversationId}` | `conversations:read` |
| `GET /accounts/{accountId}/conversations/{conversationId}/messages` | `conversations:read` |
| `POST /accounts/{accountId}/conversations/{conversationId}/messages/text` | `messages:send` |
| `GET /accounts/{accountId}/conversations/{conversationId}/linked-deal` | `deals:read` |
| `PATCH /accounts/{accountId}/deals/{dealId}/stage` | `deals:update_stage` |
| `GET /accounts/{accountId}/pipeline/stages` | `pipeline:read` |
| `GET /accounts/{accountId}/pipeline/stages/{stageId}/deals` | `deals:read` |
| `GET /accounts/{accountId}/deals/{dealId}/booking` | `bookings:read` |
| `GET /accounts/{accountId}/manager/counters` | `counters:read` |

## Error Model

All errors use:

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have permission to send messages.",
    "requestId": "req_01J5N2",
    "details": {}
  }
}
```

Rules:

- `401 invalid_credentials`: email/password login failed.
- `401 unauthenticated`: token missing, expired, or invalid.
- `403 forbidden`: user is authenticated but lacks permission.
- `404 not_found`: resource missing or hidden by account isolation.
- `409 conflict`: version conflict or idempotency key conflict.
- `422 validation_failed`: domain rule blocked the requested operation.
- `429 rate_limited`: client exceeded rate limits.
- `unknown_error`: unexpected server-side failure with safe messaging.
- `network_error`: client-side SDK error when no HTTP response was received;
  the server must not emit this code.

Error messages must be safe to show in mobile UI and must not include secrets,
raw SQL, provider payloads, or internal Chatwoot exception text.

## Mutations

Message send:

- Requires `messages:send`.
- Requires a UUID `clientMessageId`.
- Accepts `Idempotency-Key`; Stage 2 SDKs send it with the same UUID as
  `clientMessageId`.
- Uses `Idempotency-Key` when present, otherwise `clientMessageId`, as the
  idempotency key.
- Rejects empty text and text longer than 4000 characters.
- Must store `(accountId, conversationId, idempotencyKey, requestBodyHash,
  createdMessageId)`.
- Repeating the same request with the same key must return the original
  normalized Manager message DTO and `idempotency.duplicate: true`.
- Reusing the same key with a different payload must return `409 conflict`.
- Must check channel reply eligibility on the backend.
- Must return the normalized Manager message DTO and idempotency metadata.

Deal stage update:

- Requires `deals:update_stage`.
- Should accept `Idempotency-Key`.
- Must validate stage exists in the account.
- Must validate required fields and blocked transitions on the backend.
- Must audit old stage, new stage, actor, timestamp, and client mutation id.

## Booking Webhook Security

Booking webhooks require:

- HMAC-SHA256 signature.
- Timestamp freshness window.
- Idempotency key.
- Source event id.
- Provider allowlist per account.

Reject unsigned requests with `401 invalid_webhook_signature`.

Webhook secrets must never be available to Expo clients.

## Realtime Security

Realtime connections use short-lived account-scoped tokens.

The server must:

- Verify account membership before connection.
- Filter each event by permission.
- Stop delivery immediately after membership or permission changes.
- Emit `permissions.changed` when the client should refresh session state.
- Emit `session.revoked` when credentials must be cleared.

## Data Minimization

DTOs should include only what Manager screens need:

- Use `ContactSummary` instead of full contact records.
- Use `ChannelSummary` instead of raw inbox/channel config.
- Use `DealSummary` instead of full CRM database rows.
- Use `BookingSummary` instead of provider payloads.
- Keep internal IDs, provider credentials, raw webhook bodies, and Chatwoot
  implementation details server-side.

## Audit Logging

Audit these actions:

- login and refresh-token rotation
- message sends
- deal stage changes
- booking webhook acceptance, duplicate detection, and rejection
- permission or role changes
- realtime session revocation

Audit logs should store account id, actor id, action, target id, timestamp,
request id, and safe metadata.

## Rate Limits

Stage 4 adds server-side fixed-window rate limits on the first production
mutation paths that can create user-visible or booking-visible side effects.
Limiter identities are hashed before being stored in Rails cache keys.

Current limits:

| Path | Bucket | Default |
| --- | --- | --- |
| `POST /api/fleexa-manager/v1/session` | `login` | 10 attempts per 60 seconds per remote IP and normalized email |
| `POST /accounts/{accountId}/conversations/{conversationId}/messages/text` | `message_send` | 60 sends per 60 seconds per account, manager, and conversation |
| `POST /accounts/{accountId}/bookings/sync` | `booking_sync` | 120 requests per 60 seconds per account, credential, and endpoint |
| `POST /accounts/{accountId}/bookings/{bookingId}/relink-deal` | `booking_relink` | 120 requests per 60 seconds per account, credential, and endpoint |

Environment overrides:

- `FLEEXA_MANAGER_LOGIN_RATE_LIMIT`
- `FLEEXA_MANAGER_LOGIN_RATE_LIMIT_WINDOW`
- `FLEEXA_MANAGER_MESSAGE_SEND_RATE_LIMIT`
- `FLEEXA_MANAGER_MESSAGE_SEND_RATE_LIMIT_WINDOW`
- `FLEEXA_MANAGER_BOOKING_SYNC_RATE_LIMIT`
- `FLEEXA_MANAGER_BOOKING_SYNC_RATE_LIMIT_WINDOW`
- `FLEEXA_MANAGER_BOOKING_RELINK_RATE_LIMIT`
- `FLEEXA_MANAGER_BOOKING_RELINK_RATE_LIMIT_WINDOW`

Rate-limited responses return `429 rate_limited`, the standard Manager error
envelope, and `Retry-After`. A blocked message send, Booking sync, or Booking
relink request must not perform the side effect.

Still required before production beta:

- read-path limits for session refresh, conversation/message reads, pipeline
  reads, and deal reads
- deal mutation limits
- realtime reconnect limits
- a distributed limiter backend with production observability if Rails cache is
  not backed by Redis

## Sensitive Log Filtering

Manager Rails patches add filter parameters for:

- bearer and `api_access_token` credentials
- login passwords and password confirmations
- Booking service tokens
- Booking webhook signatures
- booking client id, name, phone, and communication phone

Logs must not include raw bearer tokens, service tokens, webhook signatures,
passwords, or unnecessary customer PII. Request specs assert the configured
filter list contains the Manager auth, Booking token/signature, and Booking PII
keys.
