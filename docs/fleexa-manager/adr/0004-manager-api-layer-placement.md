# ADR 0004: Manager API Layer Placement

Date: 2026-07-18
Status: Accepted for first implementation phase

## Context

Fleexa Manager is moving to Expo React Native, web first and iPhone later, while
Chatwoot/Vue remains the backoffice/admin and legacy shell. The Manager client
needs stable mobile-ready APIs for session, conversations, messages, deals,
pipeline stages, bookings, counters, realtime events, permissions, and errors.

The existing CRM work is patch-driven inside Chatwoot. Current endpoints under
`/api/v1/accounts/:account_id/crm` are useful data sources, but their payloads
are not the Manager contract. They expose CRM/Chatwoot-shaped records and leave
important business rules in Vue screens.

## Decision

Start with an isolated Fleexa Manager namespace inside Chatwoot/Rails for the
first backend implementation phase.

Use a new API surface such as `/api/fleexa-manager/v1` with additive patches,
Manager-specific controllers, serializers, permission checks, service objects,
error mapping, idempotency helpers, and event publication. Do not extend current
Chatwoot or CRM endpoints to become the Manager contract.

A separate Fleexa BFF/API layer remains the preferred future extraction path
once the Manager DTOs, permissions, events, and booking read models are stable.

## Options Compared

| Criteria | Fleexa namespace inside Chatwoot/Rails | Separate Fleexa BFF/API layer | Extend existing Chatwoot endpoints |
| --- | --- | --- | --- |
| Upgrade conflicts | Medium. Still patch-based, but conflict surface can stay mostly additive and isolated. | Low for Chatwoot upgrades, because Manager code lives outside Chatwoot. | High. Existing controllers/routes/serializers become more customized and harder to rebase. |
| Permissions | Good for first phase. Can reuse account context and add Manager permission mapping close to source data. | Strong long term, but requires its own auth/session bridge and policy synchronization. | Weak. Current endpoints use broad Chatwoot/admin gates and would mix backoffice and mobile permissions. |
| Patch size | Medium. New namespace, serializers, services, tests, and routes add files but avoid deep edits. | Low in Chatwoot, high total system size due deployment, auth, network, and data-access work. | Initially small, then grows as exceptions, params, and serializers accumulate in upstream-owned endpoints. |
| Development speed | Fast. Data, account context, conversation APIs, CRM models, and message builder are already local. | Slower. Requires service deployment, credentials, data access, and operational paths first. | Fastest for first endpoint, but speed degrades as mobile DTO and permission needs diverge. |
| Production safety | Good if additive, tested, and behind Manager routes. Shares existing Rails runtime and avoids a new moving part. | Mixed for first phase. Cleaner isolation, but adds a new production service and auth/data failure modes. | Poor. Mobile behavior can regress backoffice Chatwoot behavior and vice versa. |

## Option 1: Fleexa Namespace Inside Chatwoot/Rails

This option adds a dedicated Manager API namespace inside the patched Chatwoot
Rails app. The namespace reads from existing Chatwoot conversations and CRM
tables, then returns Manager DTOs.

Benefits:

- Fastest safe path to an API-first Manager without duplicating data access.
- Reuses existing account scoping, session context, conversation finder,
  message builder, and CRM models.
- Allows permission and DTO normalization to live next to the current source
  data.
- Keeps current Chatwoot/Vue endpoints stable for backoffice.
- Can be built as mostly additive patches.

Costs:

- Still carries Chatwoot upgrade conflict risk because it is patched into the
  Rails app.
- Can grow patch size if service boundaries are not kept tight.
- Must avoid slowly turning Chatwoot into the permanent product boundary.

Risk controls:

- Put Manager code under clearly named namespaces such as
  `Api::FleexaManager` and `FleexaManager`.
- Keep serializers and service objects Manager-specific.
- Touch upstream Chatwoot files only for the smallest route/mount hooks needed.
- Add account-isolation and permission tests before broadening the endpoint set.
- Keep OpenAPI and event contracts as the public source of truth.

## Option 2: Separate Fleexa BFF/API Layer

This option creates a standalone API service that fronts Chatwoot, CRM data,
booking data, and future Manager-specific read models.

Benefits:

- Best long-term separation from Chatwoot upgrades.
- Clean ownership for Manager DTOs, realtime events, idempotency, booking sync,
  and mobile-specific permissions.
- Easier to evolve independently from Chatwoot release cadence.

Costs:

- Slower first delivery because auth, account context, data access, and
  production deployment must be solved before basic screens work.
- Requires a safe bridge to Chatwoot conversations, messages, and CRM data.
- Adds operational failure modes, monitoring, secrets, and migrations earlier.
- Risk of duplicating business rules before the contract is stable.

Fit:

- Preferred once Manager contracts are proven and the team is ready to own a
  dedicated production service.
- Not the first implementation target for the current repository because the
  existing data and auth boundaries are still inside Chatwoot.

## Option 3: Extending Existing Chatwoot Endpoints

This option adds Manager params, fields, and behavior to current Chatwoot and
CRM endpoints.

Benefits:

- Lowest initial code volume for a single narrow feature.
- Reuses existing routes and clients.

Costs:

- Highest upgrade conflict risk because upstream-owned controllers and
  serializers become product-specific.
- Encourages raw Chatwoot object exposure to Expo clients.
- Mixes Manager permissions with backoffice/admin policies.
- Makes it hard to version mobile contracts independently.
- Keeps business logic split between Vue, Chatwoot controllers, and ad hoc
  serializer conditionals.
- Increases production regression risk for existing Chatwoot screens.

Fit:

- Rejected for the Manager API contract.
- Existing endpoints can remain internal data sources, but Manager clients
  should not call them directly.

## Consequences

- First backend work should create isolated Manager routes and serializers
  inside Chatwoot/Rails.
- Current CRM and Chatwoot endpoints stay available for legacy/backoffice use.
- Expo clients consume only `/api/fleexa-manager/v1` contracts.
- Business rules move into backend services before they become mobile product
  behavior.
- Booking webhooks, idempotency, and realtime events can start inside Rails but
  must keep clean boundaries for later extraction.
- The separate BFF/API option should be revisited after the first Manager
  endpoint set is implemented, tested, and used by the Expo web client.

## Non-Goals

- No backend code is implemented by this ADR.
- No merge to `main` is implied.
- No direct upstream Chatwoot source edits are permitted outside the patch
  workflow.
- No Manager client should depend on raw Chatwoot, CRM, or booking-provider
  payloads.
