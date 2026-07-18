# Fleexa Manager 90 Day Roadmap

Date: 2026-07-18
Branch: `codex/fleexa-manager-foundation`

## Roadmap Principles

- Expo Manager is the primary manager frontend.
- Chatwoot/Vue stays backoffice/admin/legacy shell.
- API contracts and backend domain rules lead UI work.
- Mock mode can support UI development, but real backend acceptance is required.
- Keep Chatwoot changes patch-only and mostly additive.

## Days 0-30: Backend Contract And Chat Workspace

Goal: replace the temporary Chatwoot client bridge with the first Manager API
contract slice and expand the product surface around chat.

Deliverables:

- Implement `/api/fleexa-manager/v1/session/current`.
- Implement conversations list/detail, messages list, and send text through the
  Manager API namespace.
- Preserve the current Expo chat vertical slice while switching live mode from
  `apiDriver=chatwoot` to `apiDriver=manager`.
- Add deal card DTO and render it on the conversation screen.
- Add linked booking display with `linked`, `missing`, `inaccessible`, and
  `conflict` states.
- Add pipeline stage read API and compact pipeline list/board shell.
- Add answered/unanswered state and reply eligibility from backend fields.
- Add manager counters for open, mine, unassigned, unread, active deals, and
  booking basics.
- Add source display fields and source clarification state to deal card DTOs.
- Define push, deep link, and file attachment foundations, but do not make them
  production-critical yet.

Exit criteria:

- Expo web chat flow passes against real Manager API routes.
- Manager API does not expose raw Chatwoot objects.
- Message send has backend idempotency and safe error mapping.
- Account isolation and permission tests exist for the first route set.
- Chatwoot/Vue remains unchanged except patch-only API additions.

## Days 31-60: Pipeline, Booking, And Source Readiness

Goal: make the daily manager workflow useful beyond chat while keeping rules
backend-owned.

Deliverables:

- Implement deals by stage with pagination, compact cards, source summary,
  booking summary, and permission-filtered actions.
- Implement deal stage update with backend validation, required fields, loss
  reason handling, idempotency, and audit metadata.
- Implement booking by deal and booking read model.
- Implement signed booking webhook receiver with idempotency and conflict
  handling.
- Move source attribution detection from UI helpers into a backend resolver.
- Add source explanation DTOs and manual clarification flow.
- Add customer identity matching plan implementation for strong identifiers.
- Add manager counters for stale deals, overdue responses, pickup/return today,
  and booking conflicts.
- Add initial realtime event facade for message, deal, booking, and counter
  changes.
- Add iPhone simulator smoke once local Xcode tooling supports `simctl`.

Exit criteria:

- Pipeline and booking display work on Expo web with real backend data.
- Stage movement rules are tested backend-side.
- Booking webhook duplicates do not create duplicate records or events.
- Source attribution output is deterministic and explainable.
- Realtime events use Manager DTOs and permission filtering.

## Days 61-90: Production Hardening And Migration Path

Goal: prepare Manager for production usage and reduce dependency on legacy Vue
for daily workflows.

Deliverables:

- Add contract tests against `openapi.yaml`.
- Add serializer snapshot tests for session, conversations, messages, deals,
  pipeline, booking, counters, and errors.
- Add rate limits and audit logging for Manager mutations.
- Add session refresh and realtime token refresh strategy.
- Add file attachment read/send rules if required by manager workflow.
- Add push notifications and deep links for conversation and deal targets.
- Add offline-safe refresh/resync behavior for mobile backgrounding.
- Validate iPhone layout and interaction patterns against the web surface.
- Decide whether to keep Manager API inside Chatwoot/Rails or begin BFF/API
  extraction.
- Mark Chatwoot/Vue CRM screens as legacy/backoffice in operator workflows once
  Manager covers chat, deal card, booking display, and pipeline basics.

Exit criteria:

- Production acceptance uses real backend, not mock mode.
- Manager web is usable for daily chat and deal workflow.
- iPhone build has a tested smoke path.
- Security review covers tokens, permissions, account isolation, idempotency,
  webhooks, and realtime.
- Remaining Vue CRM usage is explicitly backoffice/legacy, not target product
  direction.

## Risks To Watch

- Chatwoot adapter becoming a permanent production API by accident.
- Large Vue screens continuing to receive new manager product logic.
- API contract drift between `openapi.yaml`, `@fleexa/domain`, and backend
  serializers.
- Missing idempotency around message sends and stage updates.
- Coarse Chatwoot admin permissions leaking into Manager roles.
- Booking identity conflicts linking the wrong deal or customer.
- Realtime event payloads accidentally exposing raw Chatwoot/provider data.
