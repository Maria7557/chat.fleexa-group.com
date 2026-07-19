# Fleexa Manager Realtime Events

This document defines the realtime contract for Fleexa Manager clients. It is
the mobile/web event facade, not a direct mirror of Chatwoot ActionCable events
or database callbacks.

## Transport

Stage 4 production path:

- WebSocket endpoint: Chatwoot ActionCable `/cable`
- Channel: `FleexaManager::V1::RealtimeChannel`
- Subscription identifier: `{ "accountId": "acc_1" }`
- Web auth: existing Manager HttpOnly session cookie
- Native/dev fallback auth: short-lived realtime token returned by
  `GET /session/current`, sent inside the ActionCable subscription identifier
- Scope: one account per subscription and one user-specific stream per manager
- Delivery: at-least-once
- Ordering: best effort for Stage 4; persisted `sequence` is reserved for a
  future event log
- Resume: client reconnects with the last seen `cursor` when present and always
  dedupes by `eventId`

The contract-level endpoint
`/api/fleexa-manager/v1/accounts/{accountId}/realtime` remains reserved for a
future dedicated gateway. Server-sent events can be added later with the same
envelope and cursor rules.

## Envelope

Every event uses this envelope:

```json
{
  "eventId": "evt_01J5N2C9X3H3STQW1MGJ8B6RWD",
  "eventType": "message.created",
  "accountId": "acc_01J5N2C9X3H3STQW1MGJ8B6RWD",
  "sequence": 18422,
  "cursor": "acct-seq-18422",
  "occurredAt": "2026-07-18T09:10:00Z",
  "actor": {
    "id": "user_01J5N2",
    "displayName": "Manager",
    "type": "user"
  },
  "payload": {}
}
```

Rules:

- `eventId` is globally unique and stable across retries.
- `cursor` is opaque; clients store it but do not parse it.
- `accountId` must match the active realtime account.
- `payload` must use the same Manager DTO family as `openapi.yaml`.
- Raw Chatwoot payloads must not be sent to Manager clients.
- Events that the user is not permitted to read must not be delivered. Stage 4
  streams to `account + user` stream names after checking account membership and
  conversation visibility.

## Event Types

Conversation events:

- `conversation.updated`
- `conversation.assigned`

Message events:

- `message.created`

Deal events:

- `deal.linked_to_conversation`
- `deal.updated`
- `deal.stage_changed`
- `deal.required_fields_blocked`

Pipeline events:

- `pipeline.stage.created`
- `pipeline.stage.updated`
- `pipeline.stage.reordered`
- `pipeline.stage.deleted`

Booking events:

- `booking.upserted`
- `booking.status_changed`
- `booking.linked_to_deal`
- `booking.sync_failed`

Counter and access events:

- `manager.counters.updated`
- `permissions.changed`
- `session.revoked`

Stage 4 implements the chat subset: `message.created`,
`conversation.updated`, `conversation.assigned`, and
`manager.counters.updated`. Deal, pipeline, booking, permission, and session
events stay contractual until backend broadcasters are added for those domains.

## Payload Contracts

`conversation.*` payloads should include:

```json
{
  "conversation": {
    "id": "conv_01J5N2",
    "accountId": "acc_01J5N2",
    "title": "WhatsApp client",
    "status": "open",
    "channel": {
      "type": "whatsapp",
      "displayName": "Main WhatsApp"
    },
    "contact": {
      "id": "contact_01J5N2",
      "displayName": "Client"
    },
    "unreadCount": 1,
    "lastActivityAt": "2026-07-18T09:10:00Z"
  }
}
```

`message.*` payloads should include:

```json
{
  "conversationId": "conv_01J5N2",
  "message": {
    "id": "msg_01J5N2",
    "conversationId": "conv_01J5N2",
    "direction": "incoming",
    "visibility": "customer",
    "type": "text",
    "text": "Hello",
    "deliveryStatus": "delivered",
    "createdAt": "2026-07-18T09:10:00Z"
  }
}
```

`deal.stage_changed` payloads should include:

```json
{
  "deal": {
    "id": "deal_01J5N2",
    "accountId": "acc_01J5N2",
    "title": "Range Rover rental",
    "stage": {
      "id": "stage_reserved",
      "key": "reserved",
      "name": "Reserved"
    }
  },
  "transition": {
    "fromStage": {
      "id": "stage_new",
      "key": "new",
      "name": "New"
    },
    "toStage": {
      "id": "stage_reserved",
      "key": "reserved",
      "name": "Reserved"
    },
    "changedAt": "2026-07-18T09:10:00Z"
  }
}
```

`booking.*` payloads should include:

```json
{
  "booking": {
    "id": "booking_01J5N2",
    "accountId": "acc_01J5N2",
    "dealId": "deal_01J5N2",
    "externalBookingId": "BK-2048",
    "status": "confirmed",
    "sourceSystem": "fleetly",
    "version": 3
  }
}
```

`manager.counters.updated` payloads should include the same object returned by
`GET /accounts/{accountId}/manager/counters`.

## Dedupe And Reconnect

Clients must dedupe by `eventId`.

On reconnect in Stage 4:

1. Reopen the ActionCable subscription for the active account.
2. Send the last stored `cursor` when one exists.
3. Dedupe all received events by `eventId`.
4. Keep REST polling enabled only while realtime is disconnected.
5. Refresh affected REST queries after reconnect if the connection was down
   long enough to miss visible messages.

Stage 4 does not yet persist an event log, so server-side replay is not a
production guarantee. A persisted account event log is required before mobile
background replay can be considered complete.

## Permission Changes

When `permissions.changed` arrives, clients must refresh `GET /session/current`
and discard screens/actions no longer allowed. When `session.revoked` arrives,
clients must clear local credentials and return to sign-in.

## Event Storage

The event log should store:

- `eventId`
- `accountId`
- `eventType`
- `sequence`
- `payloadVersion`
- `payload`
- `occurredAt`
- `createdAt`

Retention can be short for high-volume message events, but the reconnect window
must be long enough for normal mobile backgrounding.
