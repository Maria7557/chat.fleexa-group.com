# Fleexa Manager Backend Readiness Plan

Date: 2026-07-18
Branch: `codex/fleexa-manager-manager-api-stage-2`
Status: first Stage 2 chat namespace implemented through
`chatwoot-patches/fleexa-manager-chat-api-backend.patch`

## Purpose

Fleexa Manager needs a mobile-ready API layer that can serve Expo web first and
iPhone later from the same product contract. The API must not expose raw
Chatwoot or rental-provider records. Chatwoot remains the backoffice/admin and
legacy shell while the Manager client consumes account-scoped Fleexa DTOs,
permission-filtered fields, idempotent mutations, and realtime events.

## Inputs Reviewed

- `AGENTS.md`
- `docs/fleexa-manager/CURRENT_STATE_AUDIT.md`
- `docs/fleexa-manager/openapi.yaml`
- `docs/fleexa-manager/EVENTS.md`
- `docs/fleexa-manager/BOOKING_INTEGRATION.md`
- `docs/fleexa-manager/SECURITY_AND_PERMISSIONS.md`
- Current CRM backend patches under `chatwoot-patches/`
- Applied Chatwoot CRM source in `/tmp/fleexa-chatwoot-app-build`
- Current Vue manager-adjacent screens:
  - `MarketingAnalytics.vue`
  - `Pipeline.vue`
  - `DealWorkspace.vue`

## Current Baseline

The existing CRM API lives under `/api/v1/accounts/:account_id/crm`. It already
provides durable CRM storage, account scoping, pipeline stages, deal
filtering/sorting/pagination, field configuration, loss reasons, marketing
dashboard settings, spend aggregation, manual spend entries, and mock Airbyte
normalizers.

The current payloads are still Chatwoot/CRM-shaped and are not suitable as the
long-term Manager contract. They include database ids, nested Chatwoot summaries,
and `custom_attributes` fields that the Vue UI interprets directly. Manager
needs a separate API contract that normalizes these fields before they leave the
backend.

## Stage 2 Chat Namespace Update

The first production-shaped Manager backend slice now exists as a patch-only
Chatwoot adapter under `/api/fleexa-manager/v1`.

Implemented in the Stage 2 chat patch:

- `GET /session/current`
- `GET /accounts/{accountId}/conversations`
- `GET /accounts/{accountId}/conversations/{conversationId}`
- `GET /accounts/{accountId}/conversations/{conversationId}/messages`
- `POST /accounts/{accountId}/conversations/{conversationId}/messages/text`
- `GET /accounts/{accountId}/manager/counters`

The adapter uses existing Chatwoot authentication temporarily, checks account
membership before account-scoped reads/writes, filters conversation visibility
through Chatwoot conversation permissions, returns Manager DTOs instead of raw
Chatwoot objects, and implements message-send idempotency with a persisted key
and PostgreSQL transaction advisory lock. Counters remain limited to reliable
conversation values: `unread`, `assigned`, and `unassigned`.

## Missing Endpoints

The first backend implementation pass needs to cover the OpenAPI surface without
leaking current Chatwoot records directly.

| Contract | Current source | Readiness gap |
| --- | --- | --- |
| `GET /session/current` | Chatwoot session/current user/account membership | Implemented for Stage 2 with temporary Chatwoot auth, Manager memberships, permissions, and realtime bootstrap placeholder. Beta still needs Manager-owned session/refresh/revoke. |
| `GET /accounts/{accountId}/conversations` | Chatwoot conversations finder | Implemented for Stage 2 with Manager serializer, stable cursor, manager-safe filters, linked deal summary when present, and mobile list shape. Booking signal remains limited until booking read model exists. |
| `GET /accounts/{accountId}/conversations/{conversationId}` | Chatwoot conversation show by `display_id` | Implemented for Stage 2 with normalized detail DTO and permission-filtered not-found behavior for inaccessible conversations. |
| `GET /accounts/{accountId}/conversations/{conversationId}/messages` | Chatwoot message finder | Implemented for Stage 2 with mobile message DTO, attachment normalization, cursor resume, and account-scoped conversation access. |
| `POST /accounts/{accountId}/conversations/{conversationId}/messages/text` | Chatwoot `Messages::MessageBuilder` | Implemented for Stage 2 with Manager permission/account gates, text-only validation, idempotency, normalized response, and safe error mapping. |
| `GET /accounts/{accountId}/conversations/{conversationId}/linked-deal` | CRM deal by conversation | Missing dedicated wrapper that returns link state instead of raw deal or `404` ambiguity. |
| `PATCH /accounts/{accountId}/deals/{dealId}/stage` | CRM deals update | Missing stage-transition service, required-field validation DTOs, non-admin permission path, audit event, and realtime emission. |
| `GET /accounts/{accountId}/pipeline/stages` | CRM pipeline stages | Missing Manager stage DTO and permission-filtered stage metadata. |
| `GET /accounts/{accountId}/pipeline/stages/{stageId}/deals` | CRM deal index with `stage_id` | Missing stage-specific mobile pagination, compact deal card DTO, booking summary, source summary, and consistent sort defaults. |
| `GET /accounts/{accountId}/deals/{dealId}/booking` | No durable booking domain confirmed | Missing booking storage/read model, link-state resolver, provider normalization, and permission filtering. |
| `GET /accounts/{accountId}/manager/counters` | Vue and existing CRM/conversation queries | Implemented for Stage 2 only for reliable conversation counters: `unread`, `assigned`, and `unassigned`. Deal, booking, answered/unanswered, and economics counters remain missing. |
| Booking webhook endpoint | Documented contract only | Missing endpoint, signature verification, idempotency store, normalized booking upsert, deal-link resolver, and realtime event publication. |
| Realtime socket/replay | Chatwoot realtime exists, Manager contract missing | Missing Manager event stream, sequence/cursor store, permission filtering, and resume behavior. |

Secondary endpoints are likely needed after the first contract pass:

- Source attribution preview and resolution endpoint for deal/conversation
  records.
- Customer identity lookup/match endpoint for phone/email/external ids.
- Manager-safe deal field metadata read endpoint if stage forms remain dynamic.
- Loss reason read endpoint for non-admin operators if stage transitions require
  loss capture.

## Admin-Only Blockers

The current CRM controllers use coarse read/write gates. This blocks the Manager
role model in `SECURITY_AND_PERMISSIONS.md`.

| Area | Current behavior | Manager blocker |
| --- | --- | --- |
| Deal writes | `create`, `update`, `destroy`, `export`, and `ensure_from_conversation` are account-admin only. | Operators and managers cannot update stage or link/create the deal workflow without being promoted to admin. |
| Deal fields | `GET /deal_fields` is admin-only. | Mobile clients cannot know stage-required fields or allowed values for a transition without admin permission. |
| Stage requirements | `PATCH /deal_fields/stage_requirements` is admin-only. | Admin-only is correct for configuration, but Manager needs a read-only stage requirements DTO for transition validation. |
| Loss reasons | `GET /loss_reasons` is admin-only. | Operators cannot complete loss transitions that require choosing a reason. |
| Manual spend entries | List/create/update are admin-only. | This is acceptable for basic Manager roles, but marketing admin permission must be distinct from Chatwoot account admin. |
| Marketing dashboard config | Reads are any account user, writes are admin-only. | Reads need permission filtering; writes need a dedicated settings permission, not generic admin status. |
| Message send | Chatwoot policy is currently the source. | Manager needs an explicit `messages:send` permission and a normalized error when the underlying channel disallows sending. |
| CSV export | Admin-only in CRM. | Manager should not inherit export behavior by accident; export is outside the first mobile API contract. |

## Frontend Logic To Move Backend-Side

The current Vue screens contain business rules that should become backend/domain
services before they power Expo clients.

| Vue area | Logic currently in UI | Backend target |
| --- | --- | --- |
| `MarketingAnalytics.vue` KPI registry | Leads, qualified leads, successful deals, spend, CPL, CPLQ, conversion rates, pipeline ROAS, completed ROAS. | Manager counters/economics service with stable formulas and currency/date handling. |
| `MarketingAnalytics.vue` lead grouping | Leads are deduplicated into lead records before economics are computed. | Backend cohort builder with explicit identity key rules and pagination-safe aggregation. |
| `MarketingAnalytics.vue` success/loss semantics | Stage types define successful, completed, lost, unqualified lost, and sales lost behavior. | Pipeline domain service with stage semantics, not UI conditionals. |
| `MarketingAnalytics.vue` source economics | Spend rows and deals are classified by source, then merged into source tables. | Attribution/economics query that joins normalized spend and CRM lead cohorts. |
| `MarketingAnalytics.vue` lost reason summaries | Lost reason category buckets, top reasons, and source loss rows. | Backend loss analytics endpoint or counter source, permission-filtered by role. |
| `MarketingAnalytics.vue` manager performance | Manager grouping, average first response minutes, qualification rate, revenue ranking. | Manager performance service backed by conversation/deal timestamps. |
| `MarketingAnalytics.vue` funnels and stage reach | Funnel steps, stage reach cards, and monthly spend/revenue chart rows. | Backend aggregation endpoints that return chart-ready DTOs. |
| `MarketingAnalytics.vue` attribution settings | Sanitizing traffic sources, lead origins, detection rules, priorities, visibility, and board validation. | Settings service with validation, uniqueness, priority normalization, and audit logging. |
| `DealWorkspace.vue` attribution detection | Built-in click-id/UTM detection, custom rules, source confidence, manual override, clarification flag. | Source attribution resolver with traceable reasons and deterministic write-back behavior. |
| `DealWorkspace.vue` required fields | Required keys by active stage, missing-field display, and stage requirement editing. | Stage transition validator returning `missingRequiredFields` and allowed next actions. |
| `DealWorkspace.vue` customer fields | Contact/deal/conversation attribute merging and display priority. | Customer summary DTO with explicit identity and display fields. |
| `Pipeline.vue` deal filters | Query hydration, custom/system filter mapping, list preferences, source labels, export scope. | Backend filter schema and Manager-safe list defaults; export remains backoffice unless separately contracted. |
| `Pipeline.vue` stage totals | Stage grouping, count, amount totals, and loaded/has-more summaries. | Deals-by-stage endpoint with authoritative totals in `meta`. |

## Answered Plan

The following decisions are already clear enough to guide implementation:

- Manager API is a facade contract, not a pass-through to Chatwoot payloads.
- All routes are account scoped and must reject cross-account ids.
- DTOs are mobile-ready and must use stable ids, pagination metadata, safe
  timestamps, compact nested summaries, and typed error responses.
- Realtime events use Manager event envelopes and DTO payloads, not raw
  Chatwoot or provider objects.
- Booking writes enter through signed, idempotent webhooks.
- Booking reads return link state (`linked`, `missing`, `inaccessible`, or
  `conflict`) instead of forcing every absence into an exception.
- Stage changes must be validated backend-side before the Manager client sees
  success.
- Business formulas for Manager counters, marketing economics, source
  detection, stage reach, and customer matching must be backend/domain-owned.
- Existing Chatwoot/Vue screens stay as backoffice/admin/legacy shell while
  new Manager features consume the Manager API.

## Unanswered Plan

These questions should be resolved before or during the first backend slice:

- Whether the first implementation uses Chatwoot session cookies only, API
  tokens, or a short-lived Manager session token for Expo web.
- How Manager stable ids map to existing Chatwoot display ids and CRM database
  ids, especially for conversations and deals.
- Where the idempotency store and realtime event cursor store live in the first
  Rails-hosted phase.
- Whether booking read models are stored in Chatwoot database tables first or
  owned by a separate rental/booking service from day one.
- Which exact Chatwoot roles map to `operator`, `manager`, `marketing_admin`,
  and `owner`.
- Which stage transitions are operator-safe, manager-only, or backoffice-only.
- Whether source attribution should write back to `crm_deals.custom_attributes`
  immediately or keep a separate attribution read model.
- Which customer identifiers are authoritative when phone, email, WhatsApp
  sender id, and rental-provider customer id disagree.
- How much historical event replay is required for mobile reconnect behavior.
- Which Manager counters are personal by default and which are team/account
  counters.

## Source Detection Plan

Source detection should move from UI helpers to a backend attribution resolver.
It should be deterministic, testable, and explainable.

1. Inventory existing inputs:
   - Deal `custom_attributes`.
   - Contact `custom_attributes` and `additional_attributes`.
   - Conversation `custom_attributes` and `additional_attributes`.
   - First inbound message text when available and permitted.
   - Tracking fields: `gclid`, `fbclid`, `yclid`, `utm_source`, `utm_medium`,
     `utm_campaign`, `utm_content`, `utm_referrer`, `referrer`, and `from`.
2. Normalize settings:
   - Read traffic sources, lead origins, and detection rules from the account
     marketing dashboard config.
   - Enforce unique keys, active flags, and priority ordering backend-side.
3. Resolve attribution:
   - Prefer high-confidence click ids and UTM fields.
   - Apply custom active detection rules by priority.
   - Fall back to `unknown` with `needsSourceClarification: true`.
   - Preserve manual attribution as `sourceDetectionMethod: manual`.
4. Return an explanation:
   - Include source, origin, confidence, method, matched field, matched rule id,
     and a safe reason string.
   - Do not include raw message text unless a Manager role can view that message.
5. Write-back strategy:
   - First implementation may write normalized attribution fields to
     `custom_attributes` for compatibility.
   - Add an internal service boundary so the storage target can move later
     without changing Manager clients.

## Booking Sync Plan

Booking remains a domain integration behind the Manager API, not a Chatwoot UI
feature.

1. Create a booking provider adapter contract for normalized provider payloads.
2. Add signed webhook handling for
   `/api/fleexa-manager/v1/integrations/booking/webhooks/{sourceSystem}`.
3. Store idempotency results for both `(accountId, sourceSystem,
   Idempotency-Key)` and `(accountId, sourceSystem, sourceEventId)`.
4. Upsert a normalized booking record by `(accountId, sourceSystem,
   externalBookingId)`.
5. Link bookings to deals by explicit `dealId`, existing booking link, booking
   reference field, then configured provider resolver.
6. Mark ambiguous matches as `conflict`; do not guess.
7. Emit `booking.upserted`, `booking.status_changed`,
   `booking.linked_to_deal`, or `booking.sync_failed` events with Manager DTOs.
8. Recompute affected counters after successful sync.
9. Expose booking state through `GET /deals/{dealId}/booking` with
   permission-filtered data.

## Customer Identity Matching Plan

Customer identity matching should be strict in the first mobile API release.
The goal is to prevent incorrect cross-customer linking while still giving
operators useful context.

1. Normalize deterministic identifiers:
   - Phone numbers to E.164 where country context is available.
   - Emails to lowercase trimmed values.
   - WhatsApp sender ids to provider-scoped handles.
   - Rental-provider customer ids to `(sourceSystem, externalCustomerId)`.
2. Build candidate sets inside the account boundary only.
3. Score candidates by identifier strength:
   - Exact provider customer id match: highest confidence.
   - Exact normalized phone match: high confidence.
   - Exact email match: high confidence.
   - WhatsApp sender id match: high confidence within the same inbox/provider.
   - Name-only matches: hint only, never automatic.
4. Return match state:
   - `matched`
   - `multiple_matches`
   - `missing_identifier`
   - `conflict`
   - `unmatched`
5. Avoid automatic merges when strong identifiers disagree.
6. Record audit metadata for automatic matches and manual overrides.
7. Keep customer identity output as a normalized DTO, not raw Chatwoot contact
   data.

## Implementation Order

1. Confirm the API placement decision in ADR 0004.
2. Add a small Manager API namespace and shared response envelope helpers.
3. Implement permission mapping from Chatwoot account memberships to Manager
   permissions.
4. Add Manager serializers for session, conversations, messages, deals, stages,
   bookings, counters, and errors.
5. Implement `GET /session/current` first so Expo can bootstrap capabilities.
6. Wrap conversation list/detail/message list/send text with Manager DTOs.
7. Wrap linked deal, pipeline stages, deals by stage, and stage update with
   backend stage-transition validation.
8. Move required-field and loss-reason read support behind Manager-safe
   permissions.
9. Move attribution detection into a backend service and return explanation DTOs.
10. Move manager counters and economics formulas backend-side.
11. Add booking read model, booking-by-deal endpoint, webhook receiver,
    idempotency store, and booking events.
12. Add customer identity matching service and expose only safe identity
    summaries.
13. Add realtime event publication, cursor persistence, and replay.
14. Add contract tests against `openapi.yaml`, permission tests, account
    isolation tests, idempotency tests, and serializer snapshot tests.
15. Point the Expo Manager web client to the Manager API and keep the current Vue
    surfaces as backoffice/admin/legacy.

## Verification Plan For Future Backend Work

- Keep every Chatwoot code change in `chatwoot-patches/`.
- Run `make crm-patch-check` against a clean Chatwoot source tree when the
  running local container is already patched.
- Run available backend specs for the touched controllers/services.
- Run available frontend checks only for compatibility when Vue surfaces are
  touched.
- Validate `openapi.yaml` after every contract change.
- Exercise one happy path and one permission-denied path per Manager endpoint.
- Treat existing lint and patch-check failures documented in
  `CURRENT_STATE_AUDIT.md` as baseline until they are intentionally fixed.
