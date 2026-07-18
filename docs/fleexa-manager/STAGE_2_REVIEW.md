# Fleexa Manager Stage 2 Readiness Review

Date: 2026-07-18
Branch: `codex/fleexa-manager-manager-api-stage-2`
Reviewed commit: `29b8111`

## Verdict

Stage 2 is a real Manager API foundation for chat, but it is not yet a clean
GO for linked deal and pipeline implementation.

Strict decision: **NO-GO for starting linked deal or pipeline product code until
backend request specs can run and the existing cross-account/idempotency specs
pass in the local or CI Chatwoot test environment.**

Reason: the production/live Expo path uses `/api/fleexa-manager/v1`, duplicate
send safety is implemented, and real chat smoke passes. However, backend request
spec execution is blocked by the local container missing `rspec`, so the
cross-account tests are present but not proven green in an executable test run.

It is safe to start the next stage only as a readiness slice: fix backend spec
execution, run the Stage 2 specs, then implement the read-only linked deal API.

## Scorecard

| Area | Score | Notes |
| --- | ---: | --- |
| Architecture | 8/10 | Correct direction: Expo Manager, Manager API namespace, patch-only Chatwoot changes, backend-owned rules. Some architecture docs still contain older bridge wording and should be refreshed after this review. |
| Backend Manager API | 7/10 | Real `/api/fleexa-manager/v1` chat endpoints exist and return Manager DTOs. Deal, pipeline, booking, and Manager-owned auth remain missing. |
| Expo integration | 8/10 | Production/live defaults to `ManagerApiClient`; config rejects production mock and non-manager driver. Expo UI still carries development labels for the legacy adapter. |
| Security | 7/10 | Stable error envelope, safe error mapping, no token return, safer send failure logging. Stage 2 still uses temporary Chatwoot token auth and lacks production throttles. |
| Tenant isolation | 7/10 | Backend scopes account and conversations correctly; cross-account request specs are present. Score capped because specs did not execute locally. |
| Idempotency / duplicate-send safety | 8/10 | Server-side advisory lock plus persisted metadata; repeated live smoke reused the same message. Needs executable backend spec run in CI/local test env. |
| Real chat proof | 9/10 | Local smoke passed for session, conversations, detail, messages, send, and retry through `/api/fleexa-manager/v1`. |
| Test coverage | 5/10 | TypeScript and Vitest pass; backend request specs exist but are blocked locally. Coverage is not enough for pipeline/deals yet. |
| iOS readiness | 3/10 | Expo code is portable, but simulator verification is blocked because `simctl` is unavailable. |
| Production readiness | 5/10 | Good foundation path, but not beta-ready: temporary auth, no production rate limiting, backend spec runner blocked, no iOS smoke. |

Overall readiness for pipeline/deals foundation: **6.7/10**.

## Required Answers

1. Does Expo production/live mode avoid raw Chatwoot API?

Yes. `@fleexa/config` defaults `EXPO_PUBLIC_FLEEXA_API_DRIVER` to `manager`,
requires Manager base URLs to end with `/api/fleexa-manager/v1`, rejects
production mock mode, and rejects non-manager production drivers.
`createFleexaApiClient` returns `ManagerApiClient` unless the explicit
development-only `chatwoot` driver is selected.

2. Does UI avoid raw Chatwoot response shapes?

Yes for the production/live Manager path. Expo screens consume the stable
`FleexaApiClient` interface and Manager DTOs. Raw Chatwoot mapping remains
inside `ChatwootFleexaApiClient`, which is documented and guarded as a local
development adapter, not production acceptance.

3. Does real login/session -> conversations -> messages -> send work through
`/api/fleexa-manager/v1`?

Yes. Fresh local smoke passed on 2026-07-18:

- `GET /session/current`
- `GET /accounts/acc_1/conversations?limit=1`
- `GET /accounts/acc_1/conversations/conv_1`
- `GET /accounts/acc_1/conversations/conv_1/messages?limit=5`
- `POST /accounts/acc_1/conversations/conv_1/messages/text`
- repeated send with the same key reused the same message

4. Is duplicate-send protection implemented and tested?

Implemented: yes. The backend uses `MessageIdempotencyService`, a transaction
advisory lock scoped by account/conversation/key, persisted idempotency
metadata, request hash comparison, `duplicate: true` replay behavior, and
`409 conflict` for key reuse with different payload.

Tested: partially. Vitest client tests pass and live API smoke proves duplicate
reuse. Backend request specs for duplicate send exist in the patch, but they
could not run locally because `bundle exec rspec` cannot find `rspec`.

5. Are cross-account access tests present and passing?

Present: yes. The backend request spec includes wrong-account list access,
conversation-from-another-account denial, inaccessible-account send denial, and
conversation/account mismatch send denial.

Passing: not proven locally. The Rails container reports
`bundler: command not found: rspec`. This is the main No-Go gate for starting
linked deal or pipeline product code.

6. Are counters only returning reliable values?

Yes. OpenAPI, domain types, client, and backend patch expose only `unread`,
`assigned`, and `unassigned`. `unanswered` is intentionally absent until
backend logic and tests exist.

7. Is mock mode clearly excluded from production acceptance?

Yes. Docs state mock mode is UI-development only, and runtime config rejects
`EXPO_PUBLIC_FLEEXA_API_MODE=mock` in production.

8. Is iOS blocked or ready?

Blocked. `xcrun simctl list devices` returns:

`xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`

9. Is it safe to start linked deal + pipeline stage next?

Not as product implementation yet. It is safe to start the next stage only with
a test-readiness slice: make backend specs executable and prove the current
Stage 2 security/idempotency tests are green. After that, proceed with linked
deal read API first, then pipeline stage reads.

## Verification Results

Run on 2026-07-18:

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | Blocked by baseline | Fails only on pre-existing untracked duplicate files `apps/fleexa-manager/babel.config 2.js` and `apps/fleexa-manager/metro.config 2.js`. |
| `npm run typecheck` | Pass | All workspaces typecheck. |
| `npm test` | Pass | Vitest: 3 files, 21 tests. |
| Backend specs | Blocked | `bundler: command not found: rspec`. |
| `git diff --check` | Pass | No whitespace errors before doc edits. |
| Expo web smoke | Pass | `npm run smoke:web` exported web bundles. Static route output still includes pre-existing untracked `* 2` route files. |
| Local Manager API smoke | Pass | Session, list, detail, messages, send, and duplicate retry all passed through `/api/fleexa-manager/v1`. |
| iOS simulator probe | Blocked | `simctl` unavailable. |

## Risks Before Pipeline/Deals

- Backend spec runner is the biggest immediate risk. Do not build deal/pipeline
  product code on top of unexecuted security specs.
- Stage 2 auth is temporary Chatwoot token auth. It is acceptable for this
  foundation but not production beta.
- Production rate limiting is still documented as a minimal guard, not an
  implemented throttle.
- Some older architecture docs still mention the earlier
  `ChatwootFleexaApiClient` bridge as the current flow. Treat
  `STAGE_2_PROGRESS.md` and this review as newer for Stage 2.
- Pipeline/deal logic in Vue is still too business-heavy. Next implementation
  must move linked-deal resolution, stage semantics, required fields, and source
  attribution into backend/domain services before Expo renders them.

## Go / No-Go

**NO-GO for linked deal + pipeline product code today.**

Required to flip to GO:

- Backend request specs run in local or CI Chatwoot test environment.
- Existing Stage 2 cross-account and duplicate-send specs pass.
- The next endpoints are implemented in `/api/fleexa-manager/v1`, not raw
  Chatwoot `/api/v1`.
- Expo continues to consume `FleexaApiClient` and Manager DTOs only.
