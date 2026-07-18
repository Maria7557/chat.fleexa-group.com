# Fleexa Manager Next 30 Days Plan

Date: 2026-07-18
Branch: `codex/fleexa-manager-foundation`

## Goal

Turn the Week 1 foundation into a real Manager API-backed workspace for chat,
deal context, booking visibility, pipeline reads, source display, and manager
counters.

The next 30 days should reduce reliance on Chatwoot/Vue as the manager surface.
Chatwoot remains the data source and backoffice shell, while Expo Manager
consumes `/api/fleexa-manager/v1` mobile-ready DTOs.

## Guiding Rules

- Real backend acceptance is required.
- Mock mode can support UI development only.
- Business logic belongs backend-side.
- Chatwoot changes must be patch-only through `chatwoot-patches/`.
- Prefer additive Manager API namespace work over editing existing Chatwoot
  controllers.
- Do not implement analytics or exports in this 30-day scope.

## Phase 1: Contract Reconciliation And Manager API Slice

Target: Days 1-6

Deliverables:

- Reconcile OpenAPI and `@fleexa/domain` for counters, source attribution,
  lead qualification, client message ids, and error codes.
- Add `/api/fleexa-manager/v1/session/current`.
- Add conversation list/detail, message list, and send text under the Manager
  namespace.
- Add Manager serializers and error envelope helpers.
- Add permission mapping for the first route set.
- Add backend idempotency behavior for text send.
- Switch Expo live acceptance from `apiDriver=chatwoot` to
  `apiDriver=manager`.

Acceptance:

- API smoke passes against real local backend.
- Expo chat vertical slice works against `/api/fleexa-manager/v1`.
- Chatwoot adapter remains available only as a local fallback.
- Contract tests or serializer snapshots cover the first DTOs.

## Phase 2: Deal Card

Target: Days 5-11

Backend:

- Implement linked deal read:
  `GET /accounts/{accountId}/conversations/{conversationId}/linked-deal`.
- Return `linked`, `missing`, or `inaccessible` without leaking raw CRM rows.
- Include compact `DealSummary`: title, stage, amount, contact, assignee,
  source summary, qualification, last activity, and permissions.
- Keep deal creation/update out of this first deal-card pass unless needed for
  a backend-tested transition.

Expo:

- Render a deal card in the conversation screen.
- Show missing/inaccessible states without blocking chat.
- Disable actions not present in DTO permissions.

Acceptance:

- Real linked and missing states are proven against local CRM data.
- No raw `custom_attributes` dependency in the screen.

## Phase 3: Linked Booking Display

Target: Days 8-15

Backend:

- Implement `GET /accounts/{accountId}/deals/{dealId}/booking`.
- Return booking link states: `linked`, `missing`, `inaccessible`, `conflict`.
- If no booking read model exists yet, create the smallest safe read path or
  document the exact blocker before adding UI that pretends booking is ready.
- Do not implement booking writes from Expo.

Expo:

- Display booking status, external booking id, vehicle, period, and total when
  linked.
- Show `missing` as normal empty state.
- Show `conflict` as a manager attention state.

Acceptance:

- Booking display works with real backend data or the feature is explicitly
  blocked with the missing source named.
- Provider payloads do not reach Expo directly.

## Phase 4: Pipeline Read Surface

Target: Days 12-19

Backend:

- Implement `GET /accounts/{accountId}/pipeline/stages`.
- Implement `GET /accounts/{accountId}/pipeline/stages/{stageId}/deals`.
- Return stage counters and compact deal cards from backend queries.
- Include required field metadata only as read-only transition hints.
- Keep stage configuration and export in Chatwoot backoffice.

Expo:

- Add a compact pipeline view with stage tabs or columns suitable for web and
  iPhone.
- Load paginated deals by stage.
- Reuse the deal card DTO rather than creating a second UI-specific shape.

Acceptance:

- Pipeline reads pass against real CRM data.
- Stage totals come from backend, not client aggregation.

## Phase 5: Answered/Unanswered And Manager Counters

Target: Days 16-23

Backend:

- Define answered/unanswered based on message direction, assignment, read
  state, and reply window rules.
- Add response-state fields to conversation DTOs.
- Implement `GET /accounts/{accountId}/manager/counters`.
- Include conversation counters first: open, mine, unassigned, unread,
  unanswered, overdue first response.
- Add deal and booking counter shells only when their source queries are real.

Expo:

- Add queue filters for unanswered and mine.
- Display manager counters in the shell without client-side business formulas.

Acceptance:

- Counter numbers are backend-owned and stable across refreshes.
- UI does not infer answered/unanswered from local message arrays.

## Phase 6: Source Display

Target: Days 20-26

Backend:

- Resolve source attribution in a backend service.
- Return source fields in deal card DTOs:
  traffic source, lead origin, detection method, confidence, and clarification
  flag.
- Preserve manual attribution semantics.
- Keep raw first-message text and provider payloads out of the DTO unless the
  user has message permission.

Expo:

- Show source labels on deal cards and pipeline rows.
- Show a clear clarification state when the backend says source is unknown or
  uncertain.
- Do not implement source settings in Expo yet.

Acceptance:

- Source display works from real deal/conversation data.
- Contract naming matches OpenAPI and `@fleexa/domain`.

## Phase 7: Push, Deep Links, And Files Foundation

Target: Days 24-30

Push:

- Define notification payloads for conversation and deal targets.
- Add device registration contract if push is in the next production scope.
- Do not send production push until auth, account isolation, and opt-out rules
  are complete.

Deep links:

- Define stable routes for conversation and deal detail.
- Support opening a conversation from a URL with account validation.
- Add fallback behavior when the resource is hidden or missing.

Files:

- Define attachment read DTOs and safe URL rules.
- Decide whether first file scope is read-only or includes send attachment.
- Keep upload/signing logic backend-side.

Acceptance:

- Deep link smoke works on web.
- Push and file behavior have contracts and blockers documented.
- No secrets or provider credentials enter Expo config.

## Cross-Cutting Verification

Run on every implementation slice:

- `git status --short --branch`
- `git diff --check`
- YAML validation when `openapi.yaml` changes
- Ruby syntax for patched Rails files
- targeted Rails/controller/service specs
- `make crm-patch-check` against a clean Chatwoot source when patch-chain
  behavior is touched
- `npm run lint`
- `npm run typecheck`
- `npm test`
- Expo web smoke
- iOS simulator smoke when `simctl` is available, otherwise document blocker
- one real local API smoke for each endpoint added

## 30 Day Exit Criteria

By the end of this plan:

- Expo Manager uses real Manager API routes for chat.
- Conversation screen includes a real deal card.
- Linked booking display has real backend data or a named blocker.
- Pipeline read surface works with real CRM data.
- Answered/unanswered and counters are backend-owned.
- Source display is backend-resolved.
- Push/deep link/file contracts are ready for implementation.
- Chatwoot/Vue usage is reduced to backoffice/legacy and data-source roles.

## Explicit Non-Goals

- No broad analytics rebuild.
- No CSV/export work.
- No Chatwoot/Vue manager feature expansion.
- No production push notification rollout without security review.
- No booking writes from Expo.
- No moving business rules into Expo screens to save time.
