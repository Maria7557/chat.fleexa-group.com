# Fleexa Manager Development Policy

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Current Product Decision

Fleexa Manager development is app-first. The product surface is one Expo React
Native codebase for web now and future iPhone from the same codebase.

Remote staging and final iOS/beta hardening are intentionally paused while the
product remains under active functional and interface development. The Stage 4
branch preserves useful production-hardening foundation, but it is not
merge-ready for controlled beta.

Chatwoot/Vue remains the backoffice, admin, and legacy UI. It is not the target
manager frontend for daily manager workflows.

## Feature Classification

Every future feature must be classified before coding:

| Classification | Meaning | Default placement |
| --- | --- | --- |
| Manager | Daily workflow for operators/managers: conversations, reply work, deal context, pipeline movement, counters, source visibility, mobile work. | Backend/API first, Expo Manager UI, shared packages as needed. |
| Backoffice | Admin, configuration, migration, legacy CRM support, internal correction, operational maintenance. | Chatwoot/Vue may remain acceptable. |
| Shared infrastructure | Contracts, auth, permissions, observability, sync plumbing, CI, deployment, data safety, reusable UI/domain packages. | Backend/API, shared packages, docs, scripts/config as appropriate. |

If classification is ambiguous, stop before coding and ask whether it belongs to
the Manager product or backoffice. Do not ask when the rule is clear.

## Placement Rules

Daily manager workflow:

- Design backend/API and domain behavior first.
- Build the user-facing surface in Expo Manager.
- Use Vue only when explicitly justified as a temporary backoffice or urgent
  demo exception.
- Any urgent Vue demo exception must document what will move to Expo and which
  backend contract will support it.

Admin/backoffice functionality:

- May stay in Chatwoot/Vue.
- Must not become the default path for new daily-manager product behavior.
- Must still avoid hiding canonical business logic only in Vue.

Business logic:

- Belongs in backend/domain services.
- Must not be implemented only in Vue or Expo.
- Includes attribution, KPI math, stage semantics, reply-state rules,
  permissions, validation, export semantics, identity matching, booking sync
  decisions, rate limits, and tenant isolation.

Shared contracts:

- Update `docs/fleexa-manager/openapi.yaml` when API request/response contracts
  change.
- Update `packages/fleexa-domain` when DTO/domain types change.
- Update `packages/fleexa-api-client` when client calls or typed responses
  change.
- Keep Manager DTOs independent from raw Chatwoot objects, Rails model rows,
  Vue view models, and upstream Chatwoot response shapes.

## Pre-Coding Output

Before implementing a product feature, Codex must state:

```text
Feature classification:
Manager / Backoffice / Shared infrastructure

Implementation placement:
Backend / Expo / Vue / Shared packages

App reuse:
Full / Partial / Not applicable

Contract changes:
Yes / No
```

Then proceed when the classification is clear. If it is ambiguous, ask the user
before coding.

## Verification Expectations

Manager features should prove:

- backend/domain ownership for business rules;
- Manager API DTO shape and account isolation;
- Expo web behavior;
- iOS reuse readiness, even if simulator proof is deferred;
- no raw Chatwoot API calls in production/live Expo mode;
- no mock mode as production acceptance.

Backoffice features should prove:

- they are truly admin/backoffice or a documented temporary exception;
- they do not introduce canonical manager business logic only in Vue;
- any Manager-facing future path is named if the feature may later move to
  Expo.
