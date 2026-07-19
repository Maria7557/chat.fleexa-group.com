# AGENTS.md

## Product Direction

Chatwoot/Vue is no longer the long-term primary manager frontend. Treat it as a
backoffice, admin, and legacy shell for the current Fleexa CRM work.

The future product surface is Fleexa Manager on Expo React Native, web first and
iPhone later from the same codebase. New manager features must be API-first,
domain-backed, and portable to Expo.

## Repository Shape

This repository is a wrapper around Chatwoot customization work.

- `chatwoot-patches/` contains durable Chatwoot patch files and SQL migrations.
- `Dockerfile.chatwoot`, `docker-compose*.yml`, and `Makefile` apply and verify
  the patched Chatwoot runtime.
- `docs/` contains project notes and architecture records.
- `waha-poc/` contains WhatsApp/WAHA proof-of-concept material.

Do not assume the root is the upstream Chatwoot application. The upstream
Chatwoot source is copied from the configured Docker image during Makefile
flows, commonly into `/tmp/fleexa-chatwoot-app-build`.

## Editing Rules

- Do not modify upstream Chatwoot source directly in this repository.
- Any Chatwoot code change must be delivered through `chatwoot-patches/`.
- Keep patch changes compact and ordered through `Dockerfile.chatwoot` and
  `Makefile` when they must be applied to the local/custom Chatwoot image.
- Documentation-only changes may live in the repo root or under `docs/`.
- Do not merge to `main` unless the user explicitly requests it.
- When committing, stage only the files intentionally changed for the task.

## Fleexa Manager Guardrails

- Business rules belong in the backend/API/domain layer, not in Vue, React, or
  Expo screens.
- The UI may format and compose data, but it must not be the canonical owner of
  attribution, KPI math, stage semantics, field validation, permissions, or
  export semantics.
- New manager surfaces should consume stable account-scoped APIs with explicit
  request/response contracts.
- Avoid browser-only assumptions such as DOM-only workflows, `localStorage` as a
  source of truth, web-specific routers, or Chatwoot Vue store coupling for new
  product behavior.
- Design new APIs so they can be consumed by Expo web and native without
  Chatwoot route helpers or Vue-specific data shapes.

## Required Baseline Before Work

Before editing, capture:

- `git status --short --branch`
- project structure and package managers
- available checks from this wrapper and from the generated Chatwoot app when
  relevant

For this repo, the common checks are:

- `make crm-patch-check`
- `make crm-vue-check`
- `make crm-assets-build-host`
- `git diff --check`

If a check fails before new work, document it as a pre-existing baseline failure
and do not attribute it to the new change.

## Current Architecture Record

See `docs/fleexa-manager/CURRENT_STATE_AUDIT.md` for the current Chatwoot CRM
patch audit, endpoint map, known risks, and the boundary between legacy
Chatwoot and future Fleexa Manager work.

Use these Fleexa Manager architecture docs as the current source map:

- `docs/fleexa-manager/PRODUCT_SCOPE.md`
- `docs/fleexa-manager/SYSTEM_ARCHITECTURE.md`
- `docs/fleexa-manager/DOMAIN_OWNERSHIP.md`
- `docs/fleexa-manager/ROADMAP_90_DAYS.md`
- `docs/fleexa-manager/adr/0001-manager-frontend-direction.md`
- `docs/fleexa-manager/adr/0002-business-logic-backend-first.md`
- `docs/fleexa-manager/adr/0003-chatwoot-as-backoffice.md`
- `docs/fleexa-manager/adr/0004-manager-api-layer-placement.md`
- `docs/fleexa-manager/adr/0006-manager-session-transport-and-refresh.md`
- `docs/fleexa-manager/CONTROLLED_BETA_GATE.md`
- `docs/fleexa-manager/OPERATIONS_RUNBOOK.md`
- `docs/fleexa-manager/STAGE_4_REVIEW.md`
