# Fleexa Manager Next 30 Days Plan

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Current Status Override

This operational beta plan is **PAUSED** by
`docs/fleexa-manager/CURRENT_STATUS.md`.

The plan below remains useful as the future controlled-beta checklist, but it is
not the current execution order. Current work may continue on product
functionality and interface development, using the app-first policy in
`docs/fleexa-manager/DEVELOPMENT_POLICY.md`.

Resume this staging/beta plan 4-6 weeks before the first client or earlier if
external testing begins.

## Goal

Turn the Stage 4 local hardening checkpoint into a controlled-beta-ready release.
While this plan is paused, do not treat remote staging, iOS, observability,
browser E2E, backup/restore, or rollback as complete.

## Non-Negotiables

- Do not merge to `main` until the controlled beta gate is green.
- Do not deploy production from this branch.
- Do not use mock mode for production acceptance.
- Do not call raw Chatwoot APIs from Expo live mode.
- Keep Chatwoot/Rails changes patch-only through `chatwoot-patches/`.
- Do not enable Booking receiver in production during this plan.
- Do not onboard a paid client until remote staging and rollback are proven.

## Days 1-4: Remote Staging First

Deliverables:

- Provision a real HTTPS staging URL.
- Provision isolated staging PostgreSQL and Redis.
- Serve Manager web in live Manager API mode.
- Run Chat/Rails backend from immutable staging image or existing staging deploy
  mechanism.
- Document staging deployment metadata:
  - commit SHA
  - backend image tag
  - Manager web artifact
  - database name
  - Redis target
  - deployment time

Exit criteria:

- `STAGING_RUNBOOK.md` names the real staging URL.
- Backend health passes remotely.
- Manager web health passes remotely.
- Database isolation proof is recorded.
- Booking receiver is confirmed disabled by default.

## Days 3-7: Remote Browser E2E

Deliverables:

- Add/run browser E2E against staging only:
  - login
  - conversations
  - filters
  - open chat
  - send message
  - verify message appears once
  - linked deal
  - pipeline
  - move stage
  - verify persisted stage
  - logout
- Add test-data ownership and cleanup rules.
- Save safe screenshots/traces only when they help diagnose failures.

Exit criteria:

- `STAGING_E2E_RESULTS.md` records a passing remote run.
- Cleanup proof is countable and repeatable.
- No E2E writes appear in production.

## Days 5-9: ActionCable Reconnect Proof

Deliverables:

- Run staging WebSocket smoke:
  - connect
  - receive same-account event
  - disconnect/reconnect
  - prove no duplicate messages/events
  - prove wrong-account subscription is rejected
- Keep polling only as fallback.

Exit criteria:

- Reconnect proof is recorded against staging `/cable`.
- Client de-duplication evidence is tied to real event IDs/cursors.

## Days 7-11: Sentry Delivery Proof

Deliverables:

- Configure staging-only Sentry DSNs in secret store.
- Prove event delivery for:
  - Manager web
  - iOS
  - Chat/Rails backend
- Verify source-map upload path where applicable.
- Confirm no PII, raw tokens, webhook signatures, passwords, or message text in
  smoke events.

Exit criteria:

- `OBSERVABILITY_RUNBOOK.md` records real event IDs.
- Backend smoke endpoint remains disabled by default and protected.
- `DISABLE_SENTRY_PII=true` and `SENTRY_SEND_DEFAULT_PII=false` are set in
  staging.

## Days 9-14: iOS Smoke

Deliverables:

- Run on a machine with full Xcode and `simctl`.
- Verify:
  - login
  - session restore
  - logout
  - conversation filters
  - open chat
  - send and retry
  - linked deal panel
  - pipeline open and stage move
  - safe areas
  - keyboard
  - scrolling
  - background/foreground restore

Exit criteria:

- `STAGE_4_IOS_SMOKE.md` exists and records simulator/device, commands, and
  results.
- Native SecureStore auth path is proven.

## Days 12-18: Backup, Restore, Rollback

Deliverables:

- Run staging backup with `pg_dump`.
- Restore into isolated restore DB/container.
- Verify count-only data:
  - accounts
  - users
  - conversations
  - messages
  - crm_deals
  - booking credential rows without exposing `token_digest`
- Execute staging rollback to previous known-good backend/web artifacts.
- Verify rollback smoke.
- Restore forward to current candidate.
- Verify forward smoke.

Exit criteria:

- `BACKUP_RESTORE_DRILL.md` records executed commands and count output.
- `ROLLBACK_DRILL.md` records previous/current versions and passing smoke.
- Restore DB/container is cleaned up.

## Days 18-24: Clean CI And Release Candidate

Deliverables:

- Convert the local gate into CI or CI-ready commands:
  - lint
  - typecheck
  - tests
  - Rails specs
  - OpenAPI parse
  - patch-chain build
  - secret scan
  - browser E2E
- Reproduce from a clean checkout of the release candidate commit.
- Keep exact release candidate artifacts immutable.

Exit criteria:

- Clean checkout runs the release gate from committed files only.
- No required proof depends on uncommitted workspace state.

## Days 24-30: Controlled Beta Decision

Deliverables:

- Re-run final Stage 4 regression.
- Update `STAGE_4_REVIEW.md` with final score and GO/NO-GO.
- Freeze the beta scope to:
  - login/session
  - conversations and filters
  - chat send/retry
  - linked deal panel
  - pipeline view/stage move
  - realtime updates
- Prepare account-level access checklist for the first beta customer.

Exit criteria:

- Final decision is `GO_FOR_CONTROLLED_BETA`.
- Merge readiness is explicitly approved.

## Explicitly Deferred

- New pipeline features.
- Booking writes from Expo.
- Broad analytics rebuild.
- CSV/export expansion.
- Push notification production rollout.
- Offline-first behavior.
- Chatwoot/Vue manager feature expansion.
