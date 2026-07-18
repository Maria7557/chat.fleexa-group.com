# Fleexa Manager Stage 3 Progress

Date: 2026-07-18
Branch: `codex/fleexa-manager-core-stage-3`
Base commit: `1d4844a Close Fleexa Manager stage 2 foundation`

## Goal

Replace developer-facing bearer-token login with manager-facing email/password
login while keeping the accepted Stage 2 temporary Chatwoot auth strategy.

## Implemented

- Added `POST /api/fleexa-manager/v1/session` in the Manager namespace through
  `chatwoot-patches/fleexa-manager-chat-api-backend.patch`.
- The endpoint verifies Chatwoot email/password credentials, active user state,
  MFA requirement, active account membership, and optional workspace/account
  hint before returning a Manager-shaped session response.
- The endpoint returns the existing Chatwoot user access token only as internal
  client credential material. Expo stores it through the SecureStore abstraction
  and never renders it in the UI.
- Web restore uses session-scoped browser storage through the same abstraction,
  with a memory fallback for non-browser render contexts.
- Added typed `LoginSessionRequest` and `LoginSessionResponse` contracts in
  `@fleexa/domain` and `@fleexa/api-client`.
- Added `ManagerApiClient.login()` against `/session`; it deliberately omits
  stale bearer auth on login.
- Kept the `FleexaApiClient` interface stable apart from the small login method
  extension required by the contract.
- Replaced the Expo login screen token field with email, password, and optional
  workspace fields.
- Session restore now verifies `session/current`; invalid or expired sessions
  are cleared and return to login.
- Logout clears local stored credential state and returns to login. Server-side
  token revoke remains a beta auth blocker.

## Security Notes

- Production/live mode still uses `ManagerApiClient` and
  `/api/fleexa-manager/v1`.
- Mock mode remains UI-development only and does not satisfy production
  acceptance.
- Raw Chatwoot API response objects are not exposed to the UI.
- Wrong email/password returns `401 invalid_credentials`.
- Missing, invalid, or expired bearer credentials on authenticated routes return
  `401 unauthenticated`.
- No secrets were committed.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with `--max-warnings=0`. |
| `npm run typecheck` | Pass | All Expo/packages TypeScript workspaces passed. |
| `npm test` | Pass | Vitest: 3 files, 22 tests. |
| OpenAPI YAML parse | Pass | `docs/fleexa-manager/openapi.yaml` parsed successfully. |
| `npm run smoke:web` | Pass | Expo web export produced `dist-web-smoke`; Expo force-exited after export as expected. |
| `make crm-assets-build-host` | Pass | Clean Chatwoot host build applied full patch chain and built Vite assets. |
| Ruby syntax | Pass | `session_controller.rb`, request spec, and routes syntax check passed from `/tmp/fleexa-chatwoot-app-build`. |
| `make crm-patch-check` | Blocked by local container state | The running Rails container is already patched and rejects reapplying existing CRM files such as `app/models/crm_pipeline_stage.rb`. Clean host build is the authoritative patch-chain check for this run. |
| Backend request spec | Blocked by Ruby/RSpec environment | Host run requires Bundler 2.5.16, which is not installed; Rails container reports `bundler: command not found: rspec`. |
| API smoke | Pass | Wrong password `401 invalid_credentials`; wrong workspace `403 forbidden`; login `201`; `session/current` `200`; conversations `200`; Manager DTOs contained no raw Chatwoot fields. |
| Expo web smoke | Pass | `http://127.0.0.1:8082` login -> `session/current` -> `/home` conversations screen; reload restored session; logout returned to login; token text was not visible. |
| iOS simulator smoke | Blocked | `xcrun simctl` is unavailable in this environment. |

## Remaining Beta Auth Work

- Replace the temporary Chatwoot token exchange with Manager-owned auth.
- Add refresh-token rotation.
- Add server-side logout/revoke.
- Add device/session inventory.
- Add production MFA flow.
- Add audit events for login, refresh, logout, and revoke.

## Conversation Filters And Reply State

Added after the email/password login foundation on branch
`codex/fleexa-manager-core-stage-3`.

### Implemented

- Added backend-supported Manager API `filter` query param for conversation
  buckets:
  - `mine`
  - `unassigned`
  - `unread`
  - `all`
  - `waiting_for_reply`
- Kept the older `assignment` query param as temporary compatibility, but the
  Expo app now uses `filter`.
- Added Manager DTO fields:
  - `lastCustomerMessageAt`
  - `lastAgentReplyAt`
  - `replyState`
  - `assignedManager`
  - `unreadCount`
- `replyState` is backend-owned and only exposes:
  - `waiting_for_reply`
  - `replied`
- A customer message after a manager reply returns the conversation to
  `waiting_for_reply`; no `customer_replied_again` state is exposed.
- `Unread` uses the same Chatwoot unread source as `unreadCount`.
- `Waiting for reply` is calculated in the Manager API from customer-visible
  incoming messages and customer-visible outgoing manager replies before
  pagination/cursor slicing.
- Added request-spec coverage in the patch for every filter bucket, invalid
  filter rejection, wrong-account isolation, DTO shape, and reply-state
  transitions.
- Added Expo conversation filter chips and compact reply/unread state display.
  The UI sends the selected bucket to `ManagerApiClient`; it does not calculate
  reply state or filter conversations locally.

### Verification Notes

Closeout verification for the conversation-filter and reply-state change:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with `--max-warnings=0`. |
| `npm run typecheck` | Pass | Expo app and workspace packages typechecked. |
| `npm test` | Pass | Vitest: 3 files, 23 tests. |
| OpenAPI YAML parse | Pass | `docs/fleexa-manager/openapi.yaml` parsed successfully. |
| Ruby syntax | Pass | Generated Manager API controller, serializer, and request spec syntax checked. |
| `make crm-assets-build-host` | Pass | Clean Chatwoot host build applied the full patch chain, including the new conversation-filter patch, and built Vite assets. |
| `make crm-patch-check` | Blocked by local container state | The running Rails container is already patched and rejects reapplying existing CRM files. Clean host build remains the authoritative patch-chain validation for this run. |
| Backend request specs | Authored, runner blocked | Request specs are included in the patch, but host execution requires Bundler 2.5.16 and the running Rails container reports `bundler: command not found: rspec`. |
| Manager API smoke | Pass | `session/current`, filter buckets, conversation detail, messages, send text, repeat send idempotency, wrong-account denial, conversation/account mismatch denial, reliable counters, and DTO shape were verified against `/api/fleexa-manager/v1`. |
| Expo web smoke | Pass | Browser smoke confirmed filter chips call Manager API filters, conversation detail opens, send reply succeeds, and reply state updates from `Waiting` to `Replied`. |

The local smoke confirmed that production/live mode remains on
`ManagerApiClient` and does not downgrade to mock mode or the raw Chatwoot API.

## Chat Workflow Polish

Added after backend-owned filters and reply state on branch
`codex/fleexa-manager-core-stage-3`.

### Implemented

- Increased conversation list density with compact rows, stable row spacing,
  avatar initials, last-message preview, last-message time, and clearer
  unread highlighting.
- Kept conversation filtering backend-owned. The Expo list still sends
  Manager API `filter` values and does not calculate bucket membership locally.
- Displayed assigned/unassigned state from the Manager DTO through a compact
  assignment chip.
- Displayed backend-owned `replyState` through compact `Waiting` and `Replied`
  badges in the list and conversation detail.
- Improved message bubbles for desktop and mobile widths, including sender,
  time, delivery status, and responsive max widths.
- Improved the composer with mobile stacking, clear send loading state, and a
  visible failure state.
- Changed send mutation inputs so the UI creates the `clientMessageId` before
  the request. Retry uses that same `clientMessageId` and `Idempotency-Key` so
  backend duplicate-send protection remains intact.
- Added local failed-send recovery controls:
  - `Retry` resends the exact same text with the original `clientMessageId`.
  - `Edit` returns the text to the composer and clears the failed local draft;
    the next send creates a new idempotency key.
- Added temporary polling until production realtime is implemented:
  - conversation list every 7 seconds
  - conversation detail every 7 seconds
  - messages every 5 seconds
  - counters every 10 seconds

### Production Realtime Gap

Polling is acceptable for Stage 3 polish but is not the production-beta realtime
strategy. Before production beta, the Manager API path needs ActionCable or a
Manager-owned WebSocket/SSE stream with account-scoped auth, reconnect cursors,
and event ordering guarantees.

### Verification Notes

Closeout verification for the chat-polish change:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with `--max-warnings=0`. |
| `npm run typecheck` | Pass | Expo app and workspace packages typechecked. |
| `npm test` | Pass | Vitest: 3 files, 23 tests. |
| `npm run smoke:web` | Pass | Expo web export produced `dist-web-smoke`; Expo force-exited after export as expected. |
| `git diff --check` | Pass | No whitespace errors. |
| Desktop web smoke | Pass | `http://localhost:8082/home` restored the live session, showed Manager API conversation filters, unread state, reply-state badges, and no horizontal overflow at `1280x720`. |
| Mobile web smoke | Pass | `390x844` viewport showed mobile nav, filters, unread/reply state, conversation detail, composer, and no horizontal overflow. |
| Send failure smoke | Pass | Rails was stopped for one send attempt; the UI showed a safe Manager API unavailable message plus failed local bubble with `Retry` and `Edit`. |
| Retry smoke | Pass | Rails was restarted and `Retry` resent the failed draft with the original client idempotency input path. The message appeared once in the UI, and backend `Message.where(content: ...)` returned `1`. |

The app still uses `ManagerApiClient` for production/live mode. No raw Chatwoot
API calls were added to the UI. Polling remains a temporary Stage 3 strategy;
ActionCable/WebSocket remains required before production beta.
