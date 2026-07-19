# Fleexa Manager Stage 4 Review

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`
Reviewed commit before this gate: `4ebe450`

## Current Readiness

Current readiness: **84%**

Stage 4 is now shaped like a controlled beta gate instead of a collection of
manual checks. The Manager API path has request specs, rate-limit specs,
session specs, concurrency specs, realtime specs, and an isolated controlled
beta API E2E smoke. Expo web exports cleanly, and production/live config is
guarded against mock mode and raw Chatwoot API usage.

## Controlled Beta Decision

Decision: **NO-GO for controlled beta until the remaining operational blockers
below are closed.**

The technical gate is CI-ready, but controlled beta should not start yet because
iOS Simulator smoke is still blocked by missing full Xcode/`simctl`, backup and
restore have not been drilled on a beta-like environment, and Sentry event
delivery has not been verified against real web/iOS/backend projects.

## What Is Production-Shaped

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
- Patch-chain build has a documented command.
- CI-ready workflow and local `npm run ci:fleexa-manager` gate exist.

## What Is Still Demo-Only Or Not Yet Beta-Proven

- iOS Simulator smoke is not verified on this machine.
- Browser UI E2E is not automated yet; current controlled beta smoke is API E2E
  in the patched Rails test app.
- Booking receiver remains guarded; Booking production enablement is not part of
  this gate.
- Sentry event delivery is configured but not proven against real projects.
- Backup/restore and rollback are documented but not drilled.
- Production health checks need a deployed beta environment and monitor user.
- Push notifications, deep links, files, and production mobile background
  behavior remain outside this gate.

## Remaining Blockers Before First Paid Client

1. Install/select full Xcode and run real iOS Simulator smoke:
   login, conversations, filters, chat, send, linked deal, pipeline, move stage.
2. Add browser automation against a seeded staging/beta environment.
3. Verify Sentry event delivery for web, iOS, and backend with source maps.
4. Complete a backup/restore drill and record evidence.
5. Define production monitor credentials and authenticated health checks.
6. Run rollback drill for Chatwoot image, Expo web build, and env rollback.
7. Confirm production Booking sync/relink enablement plan before exposing
   Booking to beta users.

## Exact Checks

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 29 tests |
| `make fleexa-manager-rspec` | Pass, 109 examples / 0 failures |
| `npm run smoke:web` | Pass, Expo web export |
| `npm run smoke:e2e` | Pass, 1 example / 0 failures |
| `npm run openapi:check` | Pass, OpenAPI YAML parsed |
| `npm run health:manager` | Pass, CORS preflight and stable unauthenticated health |
| `git diff --check` | Pass |
| `make crm-assets-build-host` | Pass, CRM host assets built |

## Controlled Beta Gate Files

- `.github/workflows/fleexa-manager-stage4.yml`
- `docs/fleexa-manager/CONTROLLED_BETA_GATE.md`
- `docs/fleexa-manager/OPERATIONS_RUNBOOK.md`
- `scripts/fleexa-manager-health-check.sh`
- `chatwoot-patches/fleexa-manager-controlled-beta-smoke-backend.patch`

## Score

Stage 4 score: **8/10**

The architecture and automated backend safety net are strong. The score is not
higher because controlled beta still needs real iOS smoke, browser UI E2E,
Sentry event proof, and backup/restore evidence.
