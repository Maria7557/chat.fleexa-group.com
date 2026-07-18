# Fleexa Manager Dev Notes

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
