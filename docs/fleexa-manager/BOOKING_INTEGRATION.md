# Fleexa Manager Booking Integration

Booking is a domain integration behind Fleexa Manager. Manager clients read a
normalized booking DTO and never depend on a rental system payload directly.

## Goals

- Link CRM deals to bookings without making Chatwoot the booking source of
  truth.
- Accept booking changes through idempotent webhooks.
- Emit realtime booking events for Expo web and iPhone clients.
- Keep booking reads account-scoped and permission-filtered.

## Identifiers

Use separate identifiers for each boundary:

- `bookingId`: Fleexa internal booking identifier.
- `dealId`: Fleexa CRM deal identifier.
- `accountId`: Fleexa account identifier.
- `sourceSystem`: provider key, for example `fleetly` or `rental_core`.
- `externalBookingId`: booking identifier in the provider.
- `sourceEventId`: provider event identifier.
- `Idempotency-Key`: unique delivery key per webhook attempt family.

Do not expose raw Chatwoot IDs or raw provider records to Manager clients.

## Read API

The mobile read path is:

`GET /api/fleexa-manager/v1/accounts/{accountId}/deals/{dealId}/booking`

The response returns:

- `linkState`: `linked`, `missing`, `inaccessible`, or `conflict`
- `booking`: normalized booking DTO or `null`

Missing booking is a normal state and should not force a mobile error screen.

## Webhook Endpoint

Booking providers send changes to:

`POST /api/fleexa-manager/v1/integrations/booking/webhooks/{sourceSystem}`

Required headers:

- `Idempotency-Key`: stable unique key for this source event delivery.
- `X-Fleexa-Booking-Timestamp`: UTC timestamp used in signature validation.
- `X-Fleexa-Booking-Signature`: HMAC-SHA256 signature over timestamp,
  idempotency key, and raw request body.

Required payload fields:

- `accountId`
- `sourceSystem`
- `sourceEventId`
- `eventType`
- `occurredAt`
- `booking.externalBookingId`
- `booking.status`
- `booking.period`

Accepted event types:

- `booking.created`
- `booking.updated`
- `booking.status_changed`
- `booking.cancelled`

## Idempotency

Webhook processing is idempotent at two layers:

- `(accountId, sourceSystem, Idempotency-Key)`
- `(accountId, sourceSystem, sourceEventId)`

Same key and same payload:

- Return `202 Accepted`
- Mark response as `duplicate: true`
- Do not create duplicate booking rows, deal links, or events

Same key and different payload:

- Return `409 Conflict`
- Do not process the new payload
- Record a security/audit warning

Same provider event delivered with a new idempotency key:

- Treat it as a duplicate if `sourceEventId` already exists
- Return `202 Accepted`
- Do not emit duplicate realtime events

## Processing Flow

1. Verify signature and timestamp freshness.
2. Resolve `accountId` and provider configuration.
3. Check idempotency keys.
4. Normalize provider payload into the booking domain DTO.
5. Upsert booking by `(accountId, sourceSystem, externalBookingId)`.
6. Link to a deal by explicit `dealId`, then by `externalBookingId`, then by
   configured booking reference fields.
7. Persist the source event result.
8. Emit `booking.upserted` or `booking.status_changed`.
9. Recompute and emit `manager.counters.updated` when counters changed.

## Deal Linking Rules

Preferred link order:

1. Explicit `dealId` in the webhook payload.
2. Existing booking link by `bookingId`.
3. Existing deal booking reference matching `externalBookingId`.
4. Account-specific resolver configured for the provider.

If multiple deals match, do not guess. Mark the booking link as `conflict` and
emit `booking.sync_failed` with a non-sensitive reason.

## State Mapping

Provider statuses must map into the Manager enum:

- `draft`
- `pending`
- `confirmed`
- `active`
- `completed`
- `cancelled`
- `no_show`

Unknown statuses should be rejected with `422 validation_failed` unless the
provider adapter explicitly maps them.

## Retries

Providers may retry any non-2xx response.

Recommended behavior:

- `202`: accepted or duplicate, no retry needed
- `400`: malformed payload, retry only after provider-side fix
- `401`: bad signature, retry only after credential fix
- `409`: idempotency key conflict, do not retry with the same key
- `422`: domain validation failed, retry only after payload fix
- `500`: transient failure, retry with the same idempotency key

## Audit Fields

Store enough metadata to debug safely:

- source system
- source event id
- idempotency key hash
- payload hash
- signature verification result
- normalized booking id
- linked deal id when present
- processing status
- error code and safe error message

Do not store secrets in audit fields.

## Realtime Effects

Successful booking changes may emit:

- `booking.upserted`
- `booking.status_changed`
- `booking.linked_to_deal`
- `booking.sync_failed`
- `manager.counters.updated`

Events must use Manager DTOs and must be filtered by account and permission.
