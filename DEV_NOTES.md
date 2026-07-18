# Fleexa Manager Dev Notes

## 2026-07-18 Manager API Live Mode

Stage 2 live mode now uses `ManagerApiClient` against
`/api/fleexa-manager/v1`.

- Default local live config:
  `EXPO_PUBLIC_FLEEXA_API_MODE=live`,
  `EXPO_PUBLIC_FLEEXA_API_DRIVER=manager`,
  `EXPO_PUBLIC_FLEEXA_API_BASE_URL=http://localhost:3000/api/fleexa-manager/v1`.
- The token field still accepts an existing Chatwoot user access token for
  Stage 2 and sends it as `Authorization: Bearer ...` to the Manager namespace.
- `ChatwootFleexaApiClient` remains only as a legacy local-development adapter
  for raw Chatwoot `/api/v1` routes. It is not the production/live default.
- Mock mode remains available for UI development only and cannot satisfy
  production acceptance.
- The Manager namespace handles local Expo web CORS preflight for
  `http://localhost:8082` and `http://127.0.0.1:8082`, including Chrome
  private-network preflight when requested; production origins must be
  configured through `FLEEXA_MANAGER_CORS_ORIGINS`.
- Local API unavailable states are normalized to safe Manager API messages.
- `ManagerApiClient` binds the runtime `globalThis.fetch` before storing it, so
  Expo web does not depend on a detached fetch implementation.

Local live smoke:

- HTTP smoke passed through `/api/fleexa-manager/v1`: current session,
  conversations, conversation detail, messages, send text, and repeated send
  with the same `clientMessageId` returning one persisted message.
- Browser smoke passed on `http://127.0.0.1:8082`: login, conversation queue,
  open `conv_1`, messages render, and UI send renders the sent message.
- Rails request spec execution is blocked in the local container:
  `bundler: command not found: rspec`.
- A clean `docker build -f Dockerfile.chatwoot` reached Chatwoot `vite:build_all`
  but failed with Node heap OOM at `--max-old-space-size=2560`. The patch was
  applied to the generated app tree and current Rails container for browser
  verification.

## 2026-07-18 Chat Vertical Slice

Local backend inspected:

- Rails container: `fleexa-chatwoot-local-rails-1`
- Chatwoot base: `http://127.0.0.1:3000`
- Auth: `api_access_token` header backed by `AccessTokenAuthHelper`
- Profile: `GET /api/v1/profile`
- Conversations: `GET /api/v1/accounts/:account_id/conversations`
- Conversation detail: `GET /api/v1/accounts/:account_id/conversations/:display_id`
- Messages: `GET /api/v1/accounts/:account_id/conversations/:display_id/messages`
- Send text: `POST /api/v1/accounts/:account_id/conversations/:display_id/messages`

Real local smoke results:

- `GET /api/v1/profile`: `200`, local user `admin@fleexa.com`, account `1`.
- `GET /api/v1/accounts/1/conversations?status=open&page=1`: `200`, 25 rows returned.
- `GET /api/v1/accounts/1/conversations/81`: `200`, `Channel::Api`, `can_reply=true`.
- `GET /api/v1/accounts/1/conversations/81/messages`: `200`.
- `POST /api/v1/accounts/1/conversations/81/messages`: `200`, message `223`, text content saved with `clientMessageId`.
- `ChatwootFleexaApiClient` package smoke: session -> conversations -> detail -> messages -> send, `200`, message `224`, `textSaved=true`.
- iOS simulator smoke blocked locally: `xcrun` cannot find `simctl`; `xcode-select -p` is `/Library/Developer/CommandLineTools`.

Notes:

- One earlier conversations probe returned `500`, but the same endpoint then returned `200` and stayed usable for the inspected slice.
- A first manual send probe produced message `222` with `content=null` because the shell payload omitted the text field. It is not counted as acceptance evidence.
- The Expo app now supports `EXPO_PUBLIC_FLEEXA_API_DRIVER=chatwoot` for local real-backend development.
- Chatwoot objects are mapped into Manager DTOs inside `@fleexa/api-client`; UI does not consume raw Chatwoot payloads directly.
- Chatwoot direct send has no real Manager idempotency wrapper. The adapter passes `Idempotency-Key` and `content_attributes.clientMessageId`, but production-grade idempotency still belongs in the planned Manager API layer.
- Deal, booking, and stage operations remain future Manager API responsibilities. The Chatwoot adapter returns empty/missing read models for non-chat surfaces and rejects deal stage mutation.
