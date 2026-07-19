# Fleexa Manager Current Status

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Status

Fleexa Manager is under active functional and interface development.

Remote staging and final iOS/beta hardening are intentionally **PAUSED**. This
is not a failure. It means the team is choosing to continue product shaping
before spending more time on controlled-beta operational proof.

This also does not mean the product is beta-ready. Stage 4 remains a useful
production-hardening foundation, but the branch is not merge-ready for
controlled beta.

## Preserved Foundation

The Stage 4 code foundation is preserved:

- executable Fleexa Manager Rails request specs;
- production-shaped Manager session strategy;
- rate-limit and permission coverage;
- tenant-isolation tests;
- message idempotency and deal concurrency protections;
- ActionCable-based realtime foundation;
- controlled-beta local gate docs and scripts.

These results remain valuable and should not be reverted just because
operational staging is paused.

## Paused Operational Proofs

The following operational proofs remain paused until remote staging exists:

- real remote staging URL;
- isolated staging PostgreSQL;
- isolated staging Redis;
- staging ActionCable/WSS;
- remote browser E2E;
- Sentry delivery proof;
- iOS Simulator smoke;
- backup/restore drill;
- rollback drill.

Historical Stage 4 result documents remain accurate for the time they were
written. They should not be rewritten as successful beta proof until the proof
actually exists.

## Current Focus

The current focus is product functionality and interface development:

- Manager workflows should be designed app-first for Expo web and future iPhone.
- Chatwoot/Vue should stay backoffice/admin/legacy unless explicitly documented
  as a temporary demo or backoffice exception.
- Backend/API/domain services should own business logic.
- Shared contracts should stay current across OpenAPI, domain types, and API
  client code.

## When To Resume Staging

Staging must resume **4-6 weeks before the first client** or earlier if any
external testing begins.

Resume staging immediately if:

- a real external tester or client will use Fleexa Manager;
- data will leave local/dev environments;
- Sentry, backup/restore, rollback, or iOS proof becomes a release gate again;
- a demo environment needs to be shared outside the team.

Until then, controlled beta status remains **DO_NOT_MERGE** and
**not beta-ready**.
