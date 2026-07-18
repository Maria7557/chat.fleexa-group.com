# Fleexa Manager Next Stage Plan

Date: 2026-07-18
Branch: `codex/fleexa-manager-manager-api-stage-2`
Scope: linked deal and pipeline foundation after Stage 2 chat

## Decision

Do not start deal or pipeline product code until the Stage 2 backend request
specs run and pass.

The next stage should begin with test-readiness and contract-preserving backend
work, then add the smallest real linked-deal read slice. Pipeline reads can
follow only after linked deal DTOs and account isolation are proven.

## Non-Negotiable Guardrails

- Production/live Expo mode must use `ManagerApiClient` and
  `/api/fleexa-manager/v1`.
- Production/live Expo mode must not call raw Chatwoot `/api/v1`.
- UI must not receive raw Chatwoot, CRM row, `custom_attributes`, or provider
  payload shapes.
- Chatwoot/Rails changes remain patch-only through `chatwoot-patches/`.
- Every endpoint must be account scoped and permission checked.
- Cross-account resource ids must be denied by tests before UI integration.
- Mock mode remains UI-development only and cannot satisfy acceptance.
- No answered/unanswered, booking, push, files, analytics, exports, or pipeline
  mutations until their backend rules and tests exist.

## Exact Implementation Order

1. Unblock backend request specs.

   - Make `bundle exec rspec spec/requests/api/fleexa_manager/v1/chat_api_spec.rb`
     executable in the local or CI Chatwoot test environment.
   - Do not change product behavior in this step.
   - Acceptance: existing Stage 2 request specs run and pass.

2. Add Stage 2 regression gate.

   - Keep tests for unauthenticated access, invalid token envelope, own-account
     access, wrong-account denial, conversation/account mismatch denial,
     invalid payload denial, pagination, DTO shape, and duplicate send.
   - Acceptance: this gate must pass before every deal/pipeline patch.

3. Implement linked deal read backend.

   - Add `GET /api/fleexa-manager/v1/accounts/:account_id/conversations/:conversation_id/linked-deal`.
   - Resolve deal by conversation inside the account boundary only.
   - Return `linked`, `missing`, or `inaccessible`.
   - Return compact `DealSummary`; do not expose CRM table rows or raw
     `custom_attributes`.
   - Acceptance: request specs prove linked, missing, inaccessible, wrong
     account, wrong conversation, unauthenticated, and DTO shape.

4. Align contracts after linked deal backend.

   - Update `openapi.yaml`, `@fleexa/domain`, and `@fleexa/api-client` together
     if the implementation reveals contract drift.
   - Keep the `FleexaApiClient` interface stable unless the contract requires a
     small typed correction.
   - Acceptance: TypeScript tests prove the client calls the Manager endpoint
     and maps only Manager DTOs.

5. Add read-only Expo deal card.

   - Render the linked deal card in the existing conversation detail screen.
   - Keep states simple: linked, missing, inaccessible, loading, error.
   - Disable absent actions based on DTO permissions.
   - Acceptance: no raw Chatwoot/CRM fields in the screen, no UI-owned deal
     stage or source business logic.

6. Implement pipeline stages read backend.

   - Add `GET /api/fleexa-manager/v1/accounts/:account_id/pipeline/stages`.
   - Return stable stage ids, keys, names, order, terminal flags, and reliable
     counters only when backend-owned.
   - Acceptance: request specs prove account isolation, permission denial, sort
     order, and DTO shape.

7. Implement deals by stage backend.

   - Add `GET /api/fleexa-manager/v1/accounts/:account_id/pipeline/stages/:stage_id/deals`.
   - Return paginated compact deal cards.
   - Include backend-owned totals in metadata when the query can compute them
     reliably.
   - Keep required field and source attribution hints backend-owned.
   - Acceptance: request specs prove pagination, wrong account, wrong stage,
     hidden deal denial, and no raw CRM fields.

8. Add read-only Expo pipeline surface.

   - Add stage tabs or columns suitable for web and iPhone.
   - Load deals by stage through `FleexaApiClient`.
   - Reuse `DealSummary` instead of inventing a UI-only deal shape.
   - Acceptance: Expo web smoke passes against real Manager API data.

9. Defer stage mutation until backend rules are ready.

   - Do not implement drag/drop or stage update UI until backend owns transition
     validation, required fields, loss reasons, permission checks, idempotency,
     and audit events.
   - Acceptance for mutation work must include `PATCH /deals/{dealId}/stage`
     request specs before any UI action is enabled.

## Stop Conditions

Stop and mark the stage blocked if any of these happen:

- Backend request specs still cannot run after the test-readiness slice.
- Cross-account tests fail or cannot prove denial before returning data.
- Linked deal data can only be delivered by exposing raw CRM rows to Expo.
- Pipeline stage semantics remain in Vue or Expo instead of backend/domain
  services.
- Production/live config needs `apiDriver=chatwoot` to work.
- Mock data is required to pass acceptance.

## Acceptance For Starting Pipeline/Deals

The next product implementation can start only when all are true:

- `npm run lint` is either green or its failure is limited to documented
  pre-existing untracked duplicate files.
- `npm run typecheck` passes.
- `npm test` passes.
- Backend Stage 2 request specs pass.
- `git diff --check` passes.
- Local Manager API smoke passes through `/api/fleexa-manager/v1`.
- iOS simulator smoke passes, or the exact `simctl` blocker is documented for
  the slice.

## Recommended First Commit For Next Stage

`Enable Fleexa Manager backend request specs`

Expected contents:

- no product feature code
- test environment or Makefile updates needed to run the existing request specs
- documentation of the backend spec command
- proof that Stage 2 chat security/idempotency specs pass

Only after that commit should linked deal and pipeline work begin.
