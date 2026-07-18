# Fleexa Manager Stage 2 Security Review

Date: 2026-07-18
Branch: `codex/fleexa-manager-manager-api-stage-2`
Base commit before hardening: `9aa5baa`

## Verdict

Stage 2 is production-shaped for the chat vertical slice, but not ready for
production beta.

The live Expo path now targets `/api/fleexa-manager/v1`, the backend returns
Manager DTOs instead of raw Chatwoot objects, account isolation is enforced in
the backend namespace, and text message retries use real idempotency protection.

Production beta remains blocked until Manager-owned session lifecycle replaces
temporary Chatwoot tokens, production rate limiting is added, backend request
specs can run in CI/local containers, and iOS simulator validation is available.

## Authentication And Session Behavior

Stage 2 intentionally uses ADR 0005 Option B. The Manager namespace accepts
existing Chatwoot credentials only as a temporary bridge:

- `Authorization: Bearer <chatwoot_user_access_token>`
- `api_access_token: <chatwoot_user_access_token>`
- same-origin Chatwoot Rails session cookies for web deployments served from an
  authenticated Chatwoot origin

Only `GET /api/fleexa-manager/v1/session/current` exists in Stage 2. Dedicated
Manager login, refresh, revoke, logout, device/session inventory, and audit
events are required before production beta.

Current failure behavior:

- Missing, invalid, revoked, or inactive credentials return
  `401 unauthenticated`.
- Account membership failures return `403 forbidden`.
- Hidden or cross-account resources return `404 not_found` when revealing
  existence would leak tenant data.
- Error responses use the stable Manager envelope:
  `{ "error": { "code", "message", "requestId", "details" } }`.

Secrets posture:

- No auth token is returned by `session/current`.
- Local dev uses untracked env files; committed examples contain no secrets.
- The message-send fallback logger records request id and exception class only,
  not bearer tokens, request bodies, or raw exception messages.

## Tenant Isolation

The backend adapter scopes every account route through
`set_current_account_from_params`.

Enforced checks:

- The URL `account_id` must be a stable `acc_N` id.
- The account must exist and be active.
- The authenticated user must have an `account_user` membership for that
  account.
- Conversation reads and message sends use `Current.account.conversations`
  filtered by Chatwoot's `Conversations::PermissionFilterService`.
- Conversation/account mismatches are denied before message creation.

Request specs in `chatwoot-patches/fleexa-manager-chat-api-backend.patch`
cover:

- authenticated manager can access own account
- unauthenticated request denied
- invalid bearer token denied with stable error envelope
- wrong account denied
- conversation from another account denied
- message send through inaccessible account denied
- message send to a conversation from another account denied

## Message Sending

Text message send stays inside the Manager API namespace:

`POST /api/fleexa-manager/v1/accounts/:account_id/conversations/:id/messages/text`

Hardening in place:

- Requires non-empty `text`.
- Rejects text longer than 4000 characters, matching OpenAPI.
- Requires either `clientMessageId` or `Idempotency-Key`.
- Validates `clientMessageId` as a UUID when provided.
- Limits idempotency key length to 16-120 characters.
- Uses a Postgres advisory transaction lock scoped by account, conversation,
  and idempotency key before creating the Chatwoot message.
- Stores idempotency metadata on the created message.
- Repeating the same request returns the original message with
  `idempotency.duplicate: true`.
- Reusing the same key with a different payload returns `409 conflict`.

Stage 2 minimal abuse guard is documented in
`SECURITY_AND_PERMISSIONS.md`: authentication, account scoping, conversation
scoping, payload limits, idempotency key limits, and duplicate retry protection.
This is not a substitute for production rate limiting. Add dedicated throttles
for session reads, read-heavy lists, and message sends before beta.

## Response Contracts

The adapter must keep UI and clients away from raw Chatwoot response objects.

Current contract shape:

- Session returns normalized manager, membership, permissions, and feature flag
  data.
- Conversation list/detail returns Manager conversation DTOs.
- Messages return Manager message DTOs.
- Send text returns a Manager message DTO plus idempotency metadata.
- Counters return only reliable `unread`, `assigned`, and `unassigned` values.
- `unanswered` is intentionally not returned until backend logic and tests
  exist.

Unexpected message-send failures now return safe user-facing text:
`Message could not be sent.`

## Patch And Build Reliability

Chatwoot/Rails changes remain patch-only:

- Durable backend code lives in
  `chatwoot-patches/fleexa-manager-chat-api-backend.patch`.
- No upstream Chatwoot source files in the wrapper repository were edited
  directly.
- `make crm-assets-build-host` applied the full patch chain to a clean Chatwoot
  app copy in `/tmp/fleexa-chatwoot-app-build` and completed the Chatwoot Vite
  production build.

## Verification Results

Run on 2026-07-18:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Blocked by baseline | Fails only on pre-existing untracked duplicate files `apps/fleexa-manager/babel.config 2.js` and `apps/fleexa-manager/metro.config 2.js`. |
| `npm run typecheck` | Pass | All workspaces typecheck. |
| `npm test` | Pass | Vitest: 3 files, 21 tests. |
| `npm run validate:env` | Pass | Development live manager mode validates with Sentry disabled when no DSN is present. |
| OpenAPI YAML parse | Pass | `Psych.load_file` parsed `docs/fleexa-manager/openapi.yaml`. |
| `npm run smoke:web` | Pass | Expo web export completed. Static routes still include pre-existing untracked `* 2` route files. |
| `make crm-assets-build-host` | Pass | Full patch chain applied and Chatwoot Vite production build completed. |
| Ruby syntax checks | Pass | Changed/generated controller, base controller, idempotency service, and request spec are syntax-valid. |
| Backend request specs | Blocked | Local Rails container returns `bundler: command not found: rspec`. Spec coverage is present in the patch but could not be executed in this container. |
| Local Manager API smoke | Pass | `session/current`, conversations, detail, messages, send, repeated send duplicate reuse, and invalid token `401` all passed. |
| iOS simulator smoke | Blocked | `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`. |
| `git diff --check` | Pass | No whitespace errors. |

## Go/No-Go

Go for the next Stage 2 chat-hardening iteration:

- Add CI-capable backend request spec execution.
- Add production rate limiting for Manager API reads and sends.
- Decide the beta replacement for Chatwoot token auth.

No-Go for production beta:

- Temporary Chatwoot auth is still in place.
- No Manager-owned refresh/revoke/session inventory exists.
- Rate limiting is documented as a minimal guard, not implemented as a
  production throttle.
- Backend request specs are not runnable in the current local container.
- iOS simulator validation is unavailable on this host.
