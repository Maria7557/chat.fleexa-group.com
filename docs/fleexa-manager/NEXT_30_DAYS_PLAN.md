# Fleexa Manager Next 30 Days Plan

Date: 2026-07-18
Branch: `codex/fleexa-manager-core-stage-3`
Starting point: Stage 3 local product review is demonstrable, but not
production beta-ready.

## Goal

Turn the current local-review foundation into a paid-client-ready beta path
without drifting back into Chatwoot/Vue as the manager frontend.

Expo Manager remains the primary manager surface. Chatwoot remains the
backoffice/admin/legacy shell and patched data source. New product behavior must
continue through `/api/fleexa-manager/v1`, typed domain contracts, and
backend-owned business rules.

## Non-Negotiables

- Do not use mock mode for production acceptance.
- Do not call raw Chatwoot APIs from Expo live mode.
- Do not expose raw Chatwoot or CRM model objects to the UI.
- Do not put business logic into Expo screens.
- Keep Chatwoot/Rails changes patch-only through `chatwoot-patches/`.
- Do not add booking, pipeline, source, or reply-state UI unless the backend is
  the source of truth.
- Do not onboard a paid client until backend specs, auth, realtime, and iOS
  gates are addressed.

## Days 1-5: Test And Contract Gate

Priority: make the current foundation provable.

Deliverables:

- Make backend request specs executable in a local or CI Chatwoot test image.
- Run Stage 2 and Stage 3 request specs for:
  - auth/session
  - tenant isolation
  - conversation filters
  - reply state
  - message send idempotency
  - linked deal access and mutations
  - pipeline stages/deals/stage moves
- Reconcile response envelope drift:
  - either wrap `session/current` and linked-deal responses consistently
  - or document top-level DTOs explicitly in OpenAPI and client tests
- Add contract smoke tests that compare OpenAPI examples to TypeScript domain
  DTOs where practical.

Exit criteria:

- Backend specs run and pass.
- OpenAPI, `@fleexa/domain`, `@fleexa/api-client`, and Manager API responses
  agree.
- No new feature work starts until this gate is green.

## Days 4-10: Production Auth And Session Safety

Priority: stop treating local Chatwoot token auth as beta-ready.

Deliverables:

- Decide the minimum beta auth plan:
  - Manager-owned session endpoints with refresh/revoke
  - or a strictly time-boxed hardened Chatwoot-token bridge
- Add server-side logout/revoke behavior.
- Add session expiry behavior that is consistent in API and Expo.
- Add login/send throttles.
- Add audit events for login, logout, revoke, send, deal update, and stage move.
- Ensure no bearer tokens, passwords, or raw backend errors appear in logs.

Exit criteria:

- Expired/invalid session paths are tested.
- Logout clears local state and invalidates server-side state when available.
- Production abuse guard is implemented, not only documented.

## Days 7-14: Realtime Chat Foundation

Priority: replace polling before beta.

Deliverables:

- Add account-scoped realtime event stream for:
  - `conversation.updated`
  - `message.created`
  - `message.updated`
  - `deal.updated`
  - `pipeline.stage_changed`
- Use ActionCable if it can be safely scoped to Manager auth; otherwise add a
  small Manager-owned SSE/WebSocket adapter.
- Include reconnect cursor semantics and event ordering notes.
- Keep polling as fallback only.

Exit criteria:

- New customer message changes `replyState` without waiting for the next poll.
- Sent manager message appears once and remains idempotent on retry.
- Cross-account events are not delivered.

## Days 10-17: Deal And Pipeline Hardening

Priority: turn demo-ready deal/pipeline into manager-ready workflow.

Deliverables:

- Add backend query params for pipeline source filtering and, if needed,
  qualification/stage filtering.
- Add backend-owned validation for qualification transitions and lost reasons.
- Add stronger deal mutation audit records.
- Keep stage colors/order/terminal semantics backend-owned.
- Add UI empty/error/loading states for large account data and pagination.
- Add deep link from pipeline deal back to the linked conversation.

Exit criteria:

- Source filtering is account-wide, not only a client filter over the loaded
  page.
- Moving a deal to lost/cancelled enforces lost reason with tests.
- Deal detail and chat deal panel stay consistent after mutation/realtime
  refresh.

## Days 14-22: Booking Read Integration

Priority: show booking only from a real source.

Deliverables:

- Identify the booking source of truth.
- Add `GET /api/fleexa-manager/v1/accounts/:account_id/deals/:deal_id/booking`
  only after the source is confirmed.
- Return booking link states:
  - `linked`
  - `missing`
  - `inaccessible`
  - `conflict`
- Display booking read-only in chat/deal context when linked.
- Do not add booking writes from Expo in this window.

Exit criteria:

- Booking display is real or explicitly blocked with the missing source named.
- No fake booking placeholders ship to beta.

## Days 18-24: iOS And Native Readiness

Priority: prove the Expo codebase is actually portable.

Deliverables:

- Restore `simctl`/Xcode command line tooling or run on an available iOS
  simulator host.
- Smoke:
  - login
  - session restore
  - logout
  - conversation filters
  - open chat
  - send and retry
  - linked deal panel
  - pipeline open and stage move
- Validate SecureStore on native.
- Check safe-area, keyboard, tap targets, and mobile navigation.
- Define push/deep-link routes even if production push is not enabled yet.

Exit criteria:

- iOS smoke is not blocked.
- Native auth storage and logout are proven.
- No layout overlap on iPhone-sized screens.

## Days 22-30: Beta Release Gate

Priority: prepare a small paid-client-ready release instead of adding breadth.

Deliverables:

- Staging deployment with production-shaped env validation.
- Sentry enabled through env vars, no committed secrets.
- Operational runbook:
  - deploy
  - rollback
  - patch-chain verification
  - seed/demo reset for non-production only
  - backup/restore notes
- Data access checklist for first account.
- Security review of Manager API auth, account scoping, DTO shape, logging, and
  idempotency.
- Product review checklist for manager workflows:
  - conversation queue
  - waiting-for-reply handling
  - linked deal context
  - pipeline movement
  - lost reason handling
  - source visibility

Exit criteria:

- Green backend specs.
- Green Expo lint/typecheck/tests.
- Green web and iOS smoke.
- Staging smoke passes against real data.
- Product owner signs off on the reduced beta scope.

## Explicitly Not In The Next 30 Days

- Broad analytics rebuild.
- CSV/export expansion.
- Chatwoot/Vue manager feature expansion.
- Booking writes from Expo.
- Production push notification rollout before auth/device/permission review.
- Offline-first behavior.
- Multi-account switching beyond the current session membership model unless it
  is needed for the first beta account.

## First Paid Client Gate

Do not onboard the first paid client until all of these are true:

- Backend request specs are executable and passing.
- Auth/session lifecycle has a production-safe revoke/expiry path.
- Message send idempotency is covered by backend tests and live smoke.
- Tenant isolation is covered by backend tests and live smoke.
- Expo live mode uses only the Manager API.
- iOS simulator/device smoke passes.
- Realtime or an explicitly accepted temporary polling SLA is signed off.
- Sentry and operational runbooks are in place.
- Booking UI is either real or absent.
- Demo data scripts are clearly local-only and never run against production.
