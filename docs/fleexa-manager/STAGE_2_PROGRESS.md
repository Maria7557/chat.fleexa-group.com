# Fleexa Manager Stage 2 Progress

Date: 2026-07-18
Branch: `codex/fleexa-manager-manager-api-stage-2`

## Current Status

Stage 2 now has a real Manager API path for the chat vertical slice:

- `GET /api/fleexa-manager/v1/session/current`
- `GET /api/fleexa-manager/v1/accounts/:account_id/conversations`
- `GET /api/fleexa-manager/v1/accounts/:account_id/conversations/:id`
- `GET /api/fleexa-manager/v1/accounts/:account_id/conversations/:id/messages`
- `POST /api/fleexa-manager/v1/accounts/:account_id/conversations/:id/messages/text`
- `GET /api/fleexa-manager/v1/accounts/:account_id/manager/counters`

The Expo live client now uses `ManagerApiClient` by default. The UI continues to
consume the stable `FleexaApiClient` interface and Manager DTOs, not raw
Chatwoot response shapes.

## Runtime Modes

| Mode | Config | Purpose | Acceptance |
| --- | --- | --- | --- |
| Live Manager API | `EXPO_PUBLIC_FLEEXA_API_MODE=live`, `EXPO_PUBLIC_FLEEXA_API_DRIVER=manager`, `EXPO_PUBLIC_FLEEXA_API_BASE_URL=http://localhost:3000/api/fleexa-manager/v1` | Default Stage 2 path for local and production-shaped validation. | Required for live acceptance. |
| Mock | `EXPO_PUBLIC_FLEEXA_API_MODE=mock` | UI development without a backend. | Never production acceptance. |
| Legacy Chatwoot adapter | `EXPO_PUBLIC_FLEEXA_API_MODE=live`, `EXPO_PUBLIC_FLEEXA_API_DRIVER=chatwoot`, `EXPO_PUBLIC_FLEEXA_API_BASE_URL=http://localhost:3000`, `EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID=1` | Development-only fallback against raw Chatwoot `/api/v1`. | Not live or production acceptance. |

Production config rejects mock mode and the legacy Chatwoot adapter. Manager
mode also requires a base URL ending in `/api/fleexa-manager/v1` so live mode
does not silently call raw Chatwoot routes.

For local Expo web smoke tests, the Manager namespace answers CORS and Chrome
private-network preflight for `http://localhost:8082` and
`http://127.0.0.1:8082`. Deployed web origins should be supplied explicitly with
`FLEEXA_MANAGER_CORS_ORIGINS`.

## Error Handling

`ManagerApiClient` normalizes backend and network failures into typed
`FleexaApiError` values. UI surfaces use safe user-facing messages and do not
display raw Rails, database, or upstream Chatwoot error internals.

`ManagerApiClient` also binds the runtime `globalThis.fetch` before storing it,
which keeps Expo web live mode compatible with browser fetch implementations
that are sensitive to detached function calls.

## Verification Notes

- HTTP smoke passed through `/api/fleexa-manager/v1`: current session,
  conversations, conversation detail, messages, send text, and repeated send
  with the same `clientMessageId` without duplicate message creation.
- Expo web browser smoke passed on `http://127.0.0.1:8082`: login, conversation
  queue, conversation detail, messages, and UI send.
- Local Rails request specs are blocked because the running container does not
  expose `rspec` through Bundler.
- Clean Docker image rebuild is blocked by Chatwoot `vite:build_all` Node heap
  OOM at the current `--max-old-space-size=2560` setting.

## Still Missing

- Manager-owned login, refresh, logout, token revoke, and device/session audit.
- Linked deal, pipeline, booking, source attribution, answered/unanswered, push,
  deep link, and file endpoints.
- Production beta auth replacement from ADR 0005.
- iOS simulator verification on a host with working `simctl`.
