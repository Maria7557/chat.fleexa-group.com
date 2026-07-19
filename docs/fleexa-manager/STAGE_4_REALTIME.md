# Stage 4 Realtime Hardening

## Decision

Manager chat realtime now uses Chatwoot ActionCable as the primary production
path:

`Expo web -> ActionCable /cable -> FleexaManager::V1::RealtimeChannel -> Manager DTO events`

Polling remains only as a fallback while the ActionCable subscription is
disconnected or rejected.

## Implemented Scope

- `message.created` for new incoming and outgoing customer-visible messages.
- `conversation.updated` for unread and reply-state changes.
- `conversation.assigned` for assignment changes.
- `manager.counters.updated` payloads embedded in chat events.
- Account + user stream names to avoid broad raw Chatwoot room delivery.
- Wrong-account ActionCable subscription rejection.
- Expo web cache updates with event-id and message-id/client-message-id dedupe.

## Security Notes

- Web uses the HttpOnly Manager session cookie when possible.
- Native/dev fallback may use the realtime token from `GET /session/current`,
  but the token is not placed in the WebSocket URL.
- Events are built from Manager DTO serializers and do not expose raw Chatwoot
  objects.
- Conversation visibility is checked before broadcasting to a manager stream.

## Limits

- There is no persisted event log yet.
- `cursor` and `sequence` are nullable until the event log exists.
- Server-side replay after mobile backgrounding is not guaranteed in Stage 4.
- Reconnect rate limiting still needs a production limiter.
- `permissions.changed` and `session.revoked` remain reserved events until live
  permission/session revocation broadcasters are added.

## Verification Target

Stage 4 realtime is mergeable only if:

- frontend lint/typecheck/tests pass,
- backend specs pass including realtime channel and broadcaster specs,
- `npm run smoke:web` exports the app,
- the patch chain applies cleanly, and
- local smoke confirms the app can connect to `/cable` and receive Manager DTO
  chat events through `/api/fleexa-manager/v1` session data.
