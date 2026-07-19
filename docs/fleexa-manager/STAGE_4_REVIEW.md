# Fleexa Manager Stage 4 Review

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`
Reviewed candidate: `27ce468`

## Final Decision

**NO_GO for controlled beta**

Final score: **70/100**

Stage 4 is strong as a local code and backend safety gate, but it is not a
controlled beta release gate yet. The required operational proofs are missing:
real remote staging, iOS Simulator smoke, Sentry event delivery, remote browser
E2E, staging backup/restore, and staging rollback.

GO_FOR_CONTROLLED_BETA is not allowed because the docs for those gates still
record `DO_NOT_CONTINUE` or are missing.

## Proof Summary

| Gate | Status | Evidence |
| --- | --- | --- |
| Manager API specs | Passed | `make fleexa-manager-rspec`, 113 examples / 0 failures |
| API E2E smoke | Passed locally | `npm run smoke:e2e`, 1 example / 0 failures in isolated RSpec DB |
| Expo web export | Passed | `npm run smoke:web` |
| Chatwoot asset build | Passed | `make crm-assets-build-host` |
| OpenAPI parse | Passed | `npm run openapi:check` |
| Health check | Passed locally | `npm run health:manager` against local Manager API |
| Clean checkout reproduction | Passed for committed candidate | clean worktree at `27ce468` ran `npm ci`, lint, typecheck, tests, OpenAPI parse |
| Patch-chain reproduction | Passed locally | RSpec harness and `crm-assets-build-host` applied patch chain |
| Secret scan | Passed | high-risk token/key scan across 195 git-visible files |
| Migration idempotency | Passed locally | Stage 4 SQL re-applied to isolated `chatwoot_test` DB |
| Booking receiver default-off | Passed locally | request specs prove `SYNC_DISABLED` when receiver flag is absent |
| Remote staging | Missing | `STAGING_RUNBOOK.md` records no staging URL/runtime |
| iOS smoke | Missing | `STAGE_4_IOS_SMOKE.md` is absent; `simctl` unavailable in observed toolchain |
| Sentry delivery | Missing | `OBSERVABILITY_RUNBOOK.md` records no real event IDs |
| Remote browser E2E | Missing | `STAGING_E2E_RESULTS.md` records not run, no staging URL |
| ActionCable reconnect smoke | Missing remotely | specs exist, but no staging `/cable` reconnect proof |
| E2E test-data cleanup | Not applicable | no remote E2E writes were made because staging is missing |
| Backup/restore drill | Missing | `BACKUP_RESTORE_DRILL.md` records not run, no staging DB |
| Rollback drill | Missing | `ROLLBACK_DRILL.md` records only source artifact simulation |

## Production-Shaped Parts

- Expo production/live mode uses `ManagerApiClient` and
  `/api/fleexa-manager/v1`.
- Mock mode is excluded from production config and acceptance.
- Web login uses HttpOnly Manager session cookie.
- iOS/native login uses Manager session bearer token for SecureStore.
- Manager API responses use DTOs, not raw Chatwoot objects.
- Account isolation, wrong-account denial, and foreign resource denial are
  covered by Rails request specs.
- Message send idempotency and retry safety are covered by specs.
- Deal update optimistic concurrency and repeated stage move safety are covered
  by specs.
- Realtime has ActionCable channel and broadcaster specs.
- Booking receiver is default-off and returns `SYNC_DISABLED` unless explicitly
  enabled in account settings.

## NO-GO Blockers

1. No real remote staging URL or isolated staging runtime exists.
2. No isolated staging PostgreSQL/Redis/ActionCable proof exists.
3. iOS Simulator smoke is not proven and `STAGE_4_IOS_SMOKE.md` is missing.
4. Sentry web/iOS/backend delivery is not proven with real event IDs.
5. Remote browser E2E is not run.
6. ActionCable reconnect/de-duplication is not proven against staging.
7. Backup/restore is documented only, not executed against staging.
8. Rollback is simulated with source artifacts only, not executed against
   staging.
9. Current working tree contains uncommitted no-go documentation and
   observability additions, so exact current-tree CI reproduction is not a clean
   committed artifact.

## Exact Checks From Final Regression

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 5 files / 31 tests |
| `make fleexa-manager-rspec` | Pass, 113 examples / 0 failures |
| `npm run smoke:web` | Pass, Expo web export |
| `npm run smoke:e2e` | Pass, 1 example / 0 failures |
| `npm run openapi:check` | Pass, OpenAPI YAML parsed |
| `npm run health:manager` | Pass, local CORS preflight and unauthenticated session check |
| `make crm-assets-build-host` | Pass, CRM host assets built |
| `git diff --check` | Pass |
| secret scan | Pass, high-risk token/key scan across 195 git-visible files |
| clean checkout reproduction | Pass for committed `27ce468` |
| migration idempotency | Pass against isolated local `chatwoot_test` DB |

## Merge Readiness

**DO_NOT_MERGE**

The branch is useful as a hardening checkpoint, but it should not be merged as a
controlled-beta foundation until the operational gates above are proven on a
real remote staging environment.
