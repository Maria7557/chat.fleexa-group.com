# Fleexa Manager Stage 3 Review

Date: 2026-07-18
Branch: `codex/fleexa-manager-core-stage-3`
Reviewed commit before this review commit: `b1999c4 Add manager pipeline UI`

## Decision

**GO for a real local product review.**

**NO-GO for the first paid client or production beta.**

Stage 3 is now demonstrable end-to-end on local web:

1. Manager signs into the Expo Manager shell.
2. Live mode uses `ManagerApiClient` and `/api/fleexa-manager/v1`.
3. Conversations load with backend-owned filters and reply state.
4. A manager can open chat, read messages, send a reply, and see linked deal
   context.
5. Pipeline stages and deals load from the Manager API.
6. A deal can move stage through the UI and persist through the backend.

The foundation is real enough for product review because the current UI is not
a mock-only shell. It is not ready for paid client use because backend request
spec execution is still blocked locally, auth remains the temporary Chatwoot
session strategy, iOS has not been exercised, and production realtime/rate
limits/audit gaps remain.

## Score

Overall Stage 3 readiness: **76/100**.

| Area | Score | Notes |
| --- | ---: | --- |
| Architecture | 86 | Correct product direction: Expo Manager is the primary manager frontend, Chatwoot/Vue stays backoffice, and new routes go through Manager API DTOs. |
| Backend Manager API | 78 | Real chat, filters, linked deal, and pipeline endpoints exist. Request specs are authored but still not executable in the local Chatwoot test environment. |
| Expo integration | 83 | Live shell, chat, deal panel, and pipeline use `FleexaApiClient`/`ManagerApiClient`; no raw Chatwoot API calls were needed in smoke. |
| Security and tenant isolation | 72 | Account scoping and wrong-account denial work in live smoke; production auth, revoke, audit, and throttling are not ready. |
| Idempotency and retry safety | 86 | Repeated text send with the same `clientMessageId`/`Idempotency-Key` returns duplicate and creates one message. UI retry preserves idempotency. |
| Real chat proof | 88 | Browser and API smoke proved session, filters, open chat, messages, send, and linked deal context. |
| Deal and pipeline proof | 76 | Linked deal panel and pipeline move are real. Source filter is page-local for now; booking remains absent. |
| Test coverage | 62 | TypeScript/Vitest pass; backend specs exist in patches but cannot run locally yet. |
| Mobile/iOS readiness | 55 | Responsive web at mobile width passes. Native iOS simulator smoke is blocked because `simctl` is unavailable. |
| Production readiness | 58 | Good foundation, but not beta: temporary auth, no realtime, no production throttle, no executable Rails spec gate, no iOS proof. |

## Production-Ready

- Expo live mode uses `ManagerApiClient` against `/api/fleexa-manager/v1`.
- Production/live mode does not use `MockApiClient`.
- UI consumes `FleexaApiClient` DTOs instead of raw Chatwoot response shapes.
- Backend owns conversation filters:
  - `mine`
  - `unassigned`
  - `unread`
  - `all`
  - `waiting_for_reply`
- Backend owns `replyState`; the UI does not calculate whether a customer is
  waiting for a manager reply.
- Text send uses server-side duplicate protection with
  `clientMessageId`/`Idempotency-Key`.
- Linked deal data is returned through the Manager API and rendered in the chat
  screen.
- Pipeline stages, colors, order, counters, and stage moves come from backend
  endpoints.
- Counters still expose only reliable values:
  - `unread`
  - `assigned`
  - `unassigned`
- Chatwoot/Rails product changes remain patch-only through `chatwoot-patches/`.

## Demo-Only

- `scripts/fleexa-manager-stage3-demo-local.sh` and
  `scripts/fleexa_manager_stage3_demo_seed.rb` are local-only demo data tools.
- The demo runner recreates only records marked with
  `custom_attributes.fleexa_manager_stage3_demo = "true"`.
- Demo data is not a production migration, not a fixture contract, and not a
  customer data import path.
- Local demo users such as `manager-ui-smoke@example.com` are for local review
  only.
- The current session strategy is still temporary Chatwoot auth, not
  Manager-owned production auth.
- Polling remains the temporary chat refresh strategy. ActionCable,
  WebSocket, or SSE is still required before production beta.
- Pipeline source filtering is local to the loaded page of Manager DTOs. It is
  useful for review, but account-wide source filtering needs a backend query
  parameter.
- Booking is not integrated. The Stage 3 UI should not be read as booking-ready.
- Push, deep links, files, offline behavior, and production device management
  are not implemented.

## Demo Data Tooling

Created local-safe tooling:

- `scripts/fleexa-manager-stage3-demo-local.sh`
- `scripts/fleexa_manager_stage3_demo_seed.rb`

Latest local seed result:

| Item | Result |
| --- | ---: |
| Account | `Demo Acc` / `acc_1` |
| Demo manager | `manager-ui-smoke@example.com` |
| Demo conversations | 10 |
| Assigned conversations | 7 |
| Unassigned conversations | 3 |
| Unread conversations | 5 |
| Waiting-for-reply conversations | 5 |
| Linked demo deals | 10 |
| Stages represented | `unassigned`, `in_progress`, `reserved`, `rental`, `closed_won`, `closed_lost` |
| Qualified deals | 6 |
| Unqualified deals | 2 |
| Pending qualification deals | 2 |
| Lost reasons | `No reply after quote`, `Budget mismatch`, `No valid license`, `Vehicle unavailable` |

Safety notes:

- The runner does not delete unmarked contacts, conversations, messages, or
  deals.
- It may merge missing attribution settings and create missing loss reason
  options for the selected local account.
- If `FLEEXA_MANAGER_DEMO_PASSWORD` is absent, it does not create or reset a
  user password.
- If a specific local reviewer should own `My` conversations, run it with
  `FLEEXA_MANAGER_DEMO_EMAIL=<email>`.

## Verification Results

Run on 2026-07-18:

| Check | Result | Notes |
| --- | --- | --- |
| Demo seed runner syntax | Pass | `ruby -c scripts/fleexa_manager_stage3_demo_seed.rb`; `bash -n scripts/fleexa-manager-stage3-demo-local.sh`. |
| Demo seed local run | Pass | Created 10 demo conversations and 10 linked deals with assigned/unassigned/unread/waiting examples. |
| Unauthenticated Manager API | Pass | `GET /session/current` without auth returned `401`. |
| Manager API smoke | Pass | Session, filters, detail, messages, send, duplicate send, linked deal, stages, deals, stage move, wrong-account denial, and raw-shape checks passed. |
| Duplicate send smoke | Pass | Two sends with the same UUID returned one visible text message and `duplicate: true` on the replay. |
| Web smoke | Pass | `localhost:8082` restored a live Manager session, showed filters, opened chat, sent a message, showed linked deal, opened pipeline, moved stage, and restored the stage. |
| Desktop responsive smoke | Pass | Default desktop browser width showed shell, chat/deal panel, and pipeline without page-level horizontal overflow. |
| Mobile responsive smoke | Pass | `390x844` showed mobile nav, conversation queue, pipeline stage tabs, deal detail, and no horizontal overflow. |
| iOS simulator smoke | Blocked | `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`. |
| Backend request specs | Blocked | `bundle exec rspec spec/requests/api/fleexa_manager/v1` fails because `rspec-core` is not included in the running production container bundle. |
| `npm run lint` | Pass | ESLint completed with `--max-warnings=0`. |
| `npm run typecheck` | Pass | Expo app and workspace packages typechecked. |
| `npm test` | Pass | Vitest: 3 files, 25 tests. |
| `npm run smoke:web` | Pass | Expo web export completed with 8 static routes; Expo force-exited after export as expected. |
| `git diff --check` | Pass | No whitespace errors. |
| `make crm-patch-check` | Blocked | The running local Rails container is already patched and rejects reapplying existing files such as `app/models/crm_pipeline_stage.rb`. |
| `make crm-assets-build-host` | Pass | Clean Chatwoot host build applied the full patch chain and built Vite assets. |

Manager API smoke details:

```json
{
  "accountId": "acc_1",
  "session": 200,
  "sessionWrappedInData": false,
  "filters": {
    "mine": 9,
    "unassigned": 4,
    "unread": 25,
    "all": 45,
    "waiting_for_reply": 7
  },
  "detail": 200,
  "sendStatuses": [201, 201],
  "duplicateSend": true,
  "duplicateTextCount": 1,
  "linkedDealStatus": 200,
  "linkedDealWrappedInData": false,
  "linkedDealState": "linked",
  "stageCount": 6,
  "dealCount": 54,
  "wrongAccountStatus": 403,
  "rawShapeLeak": false
}
```

## Remaining Backend Risks

- Backend request specs are not proven green in local/CI. This is the highest
  priority before paid client use.
- In-place `make crm-patch-check` remains unsuitable against the already
  patched local Rails container. Clean host build is the reliable patch-chain
  check for this local state.
- The Manager API response envelope is inconsistent today:
  `session/current` and conversation `deal` return top-level DTOs while many
  list/detail endpoints return `{ data, page }`. The API client adapts this,
  but the OpenAPI/implementation shape should be reconciled before beta.
- Temporary Chatwoot token auth lacks Manager-owned refresh, revoke, session
  inventory, device trust, and audit events.
- Production rate limiting is still not implemented beyond auth, account
  scoping, payload limits, and idempotency.
- Polling can become stale or expensive; production realtime needs scoped event
  delivery and reconnect semantics.
- Pipeline source filtering is not account-wide until the backend accepts
  source query params.
- Booking data has no stable read model in Manager API yet.
- Patch-chain verification depends on clean-build checks because the running
  local Rails container is already patched and cannot reapply the full chain in
  place.

## Remaining Mobile And iOS Risks

- iOS simulator validation is blocked because `simctl` is unavailable.
- Native SecureStore behavior for the temporary Chatwoot token has not been
  exercised on a simulator/device in this run.
- Mobile web layout passes at 390px, but native touch ergonomics, keyboard
  handling, safe areas, and navigation transitions are not proven.
- There is no push registration, deep-link routing validation on iOS, or file
  attachment handling.
- No offline/poor-network behavior has been tested beyond basic safe error
  states.

## Before First Paid Client

Required before the first paid client:

1. Make backend request specs executable in CI or a local Chatwoot test image
   and prove Stage 2/3 security, tenant isolation, DTO, and idempotency specs
   pass.
2. Reconcile Manager API response envelopes and OpenAPI examples.
3. Replace temporary Chatwoot auth with Manager-owned session lifecycle or
   implement the minimum production-safe refresh/revoke/audit layer.
4. Add production rate limiting and abuse monitoring for login and message
   send.
5. Add scoped realtime events for messages, conversation state, deal updates,
   and stage moves.
6. Add backend source filters for pipeline/deals and keep validation
   backend-owned.
7. Implement booking read integration only when a real booking source is
   available.
8. Run iOS simulator smoke for login, restore, chat, deal panel, pipeline, and
   logout.
9. Add staging deployment with Sentry DSN, no committed secrets, and documented
   env validation.
10. Prepare migration/rollback and backup notes for customer data.

## Final Verdict

Stage 3 is ready for a real local product review with the demo seed runner.

Stage 3 is not ready for paid client onboarding. The next work should harden
the backend test/release path and close production safety gaps before adding
new feature breadth.
