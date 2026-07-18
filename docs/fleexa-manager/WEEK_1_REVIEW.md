# Fleexa Manager Week 1 Readiness Review

Date: 2026-07-18
Branch: `codex/fleexa-manager-foundation`

## Executive Summary

Week 1 established the right product direction: Fleexa Manager is now framed as
the primary Expo React Native manager frontend, web first and iPhone later,
while Chatwoot/Vue is explicitly backoffice/admin/legacy.

The foundation is useful and directionally strong, but it is not production
ready. The real chat vertical slice works against local Chatwoot through a
temporary client adapter, not through the selected `/api/fleexa-manager/v1`
backend namespace from ADR 0004. The next stage should be backend-first and
contract-first before building richer Manager UI.

Decision: Go for the next backend/API stage. No-Go for production rollout or
for expanding Manager UI significantly before the Manager API adapter is real.

## Inputs Reviewed

- `AGENTS.md`
- All documents under `docs/fleexa-manager/`
- Week 1 commits on `codex/fleexa-manager-foundation`
- Current Expo/domain/client implementation
- `DEV_NOTES.md` real local Chatwoot smoke evidence

## Completed

| Area | Status | Evidence |
| --- | --- | --- |
| Architecture guardrails | Complete for Week 1 | `AGENTS.md`, `CURRENT_STATE_AUDIT.md`, ADR 0001-0004. |
| Product direction | Complete for Week 1 | Expo Manager is primary frontend; Chatwoot/Vue is backoffice/legacy. |
| API contract draft | Complete for planning | `openapi.yaml` covers session, conversations, messages, deals, pipeline, booking, counters, errors. |
| Realtime/event contract | Complete for planning | `EVENTS.md` defines envelope, event types, replay, permissions. |
| Booking contract | Complete for planning | `BOOKING_INTEGRATION.md` defines read API, webhooks, idempotency, link rules. |
| Security model | Complete for planning | `SECURITY_AND_PERMISSIONS.md` defines roles, permissions, errors, audit, rate limits. |
| Backend readiness | Complete for planning | `BACKEND_READINESS_PLAN.md` lists missing endpoints, blockers, implementation order. |
| Expo foundation | Complete for scaffold | `apps/fleexa-manager`, shared packages, env validation, Sentry-safe config. |
| Real chat vertical slice | Complete for local proof | Session, conversations, detail, messages, and text send passed against local Chatwoot. |
| Product architecture backfill | Complete | Product scope, system architecture, ownership, and 90-day roadmap are now documented. |

## Production-Grade So Far

These pieces are strong enough to keep:

- Product and architecture direction is explicit and consistent.
- Expo/package workspace is separated from Chatwoot/Vue.
- Environment validation rejects production mock mode.
- Sentry integration is safe when DSN is absent.
- SecureStore abstraction exists for credential storage.
- TanStack Query is the right data-fetching foundation.
- Zustand is limited to local UI state.
- Real local backend smoke proved the basic chat flow can work without mock
  data.
- Tests cover key domain/config/client behavior and the Chatwoot DTO mapping.

## Prototype-Only Or Temporary

These pieces should not be treated as production acceptance:

- `ChatwootFleexaApiClient` is a local bridge. It calls Chatwoot `/api/v1`
  routes and maps payloads client-side.
- Production Manager acceptance still requires `/api/fleexa-manager/v1`.
- Message send currently lacks a real Manager idempotency store.
- Permissions are adapter-level approximations, not backend-enforced Manager
  permissions.
- Manager counters in the Chatwoot adapter are minimal and chat-biased.
- Pipeline, deal, booking, and stage methods are mock/empty/missing in the
  adapter.
- Realtime, push, deep links, and file flows are only contracts/foundation.
- iOS simulator smoke is blocked locally because `simctl` is unavailable.

## Backend Blockers

The next stage is blocked on backend/API work, not more UI:

- No implemented `/api/fleexa-manager/v1` Rails namespace yet.
- No Manager serializers for session, conversations, messages, deals, booking,
  pipeline, counters, or errors.
- No Manager permission mapper from Chatwoot account membership to
  `operator`, `manager`, `marketing_admin`, and `owner` capabilities.
- No backend idempotency for message send or future stage updates.
- No linked deal endpoint returning Manager `linkState`.
- No booking read model or booking-by-deal resolver.
- No signed booking webhook receiver or duplicate-event handling.
- No backend-owned answered/unanswered state.
- No backend-owned manager counters.
- No source attribution resolver returning stable source display and
  clarification state.
- No Manager realtime event store, cursor, replay, or permission filter.
- Current CRM writes and several reads still inherit Chatwoot admin-only gates.

## API Contract Changes Required

Before the next implementation pass, reconcile contract drift:

| Topic | Current issue | Required decision |
| --- | --- | --- |
| Manager counters | `openapi.yaml` uses `asOf` and nested `conversations/deals/bookings`; `@fleexa/domain` uses `generatedAt`, `scope`, and flat counters. | Choose one shape and update OpenAPI, domain types, client, and mocks together. |
| Source attribution | OpenAPI uses `detectionMethod` and `needsClarification`; domain types use `sourceDetectionMethod`, `sourceConfidence`, and `needsSourceClarification`. | Normalize naming and nullability before source display work. |
| Lead qualification | OpenAPI uses `unknown/unqualified/qualified`; domain types use `pending/qualified/unqualified`. | Pick product language and keep DTOs aligned. |
| Message client id | OpenAPI marks `clientMessageId` as UUID; current app generates `msg_client_${Date.now()}`. | Either generate UUIDs in the client or relax the schema. |
| Error codes | OpenAPI has `internal_error`; domain/client use `unknown_error` and `network_error`. | Align error enum before contract tests. |
| Chatwoot adapter mode | `apiDriver=chatwoot` is useful locally but not part of the public API contract. | Keep it documented as development-only and prevent production use. |
| Channel mapping | `Channel::Api` maps to `other`. | Decide whether API inbox should surface as `other`, `web_widget`, or a dedicated value. |

## Risks

- The temporary Chatwoot client adapter could become the production API by
  accident.
- Building deal/pipeline/booking UI before backend DTOs would recreate the
  Vue-business-logic problem in Expo.
- Patch chain size can grow if the Manager API namespace is not kept additive
  and isolated.
- Existing Chatwoot admin-only policies do not match Manager roles.
- Contract drift between `openapi.yaml`, `@fleexa/domain`, and backend
  serializers can silently break mobile clients.
- Booking and customer identity matching can link the wrong deal/customer if
  conflict states are skipped.
- Real iPhone readiness remains unverified until simulator tooling is fixed.
- Mock mode can still make UI appear more complete than backend reality.

## Chatwoot/Vue Overuse

Week 1 did not add new Chatwoot/Vue product UI, which is good.

However, the system is still over-dependent on Chatwoot in two ways:

- current production data and CRM operations still live behind Chatwoot patches
- the Expo chat vertical slice currently reaches real data through a Chatwoot
  `/api/v1` adapter instead of the selected Manager API namespace

This is acceptable as a bridge only. The next stage should reduce Chatwoot/Vue
overuse by adding the Manager API namespace, not by expanding Vue screens.

## Go/No-Go

Go:

- Start the next backend/API stage.
- Implement the selected ADR 0004 Manager namespace inside Chatwoot/Rails.
- Keep the first backend slice narrow: session, conversations, messages, send
  text, linked deal read, counters shell.
- Keep Expo work focused on consuming real Manager DTOs.

No-Go:

- No production rollout.
- No mock-only acceptance.
- No major new Vue manager features.
- No direct upstream Chatwoot source edits.
- No expanded pipeline/booking/source UI until contract drift is fixed and the
  required backend DTOs exist.

## Week 2 Entry Criteria

Before building the next visible Manager surface:

1. Resolve OpenAPI/domain drift listed above.
2. Add the Manager API namespace through `chatwoot-patches/`.
3. Add serializer and permission tests for the first endpoint set.
4. Prove Expo live mode against `/api/fleexa-manager/v1`, not only
   `apiDriver=chatwoot`.
5. Keep `DEV_NOTES.md` updated with real backend smoke results.
