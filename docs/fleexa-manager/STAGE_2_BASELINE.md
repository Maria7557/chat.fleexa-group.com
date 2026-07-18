# Fleexa Manager Stage 2 Baseline

Date: 2026-07-18

## Branch And Base

- Current branch: `codex/fleexa-manager-manager-api-stage-2`
- Base selected: `main`
- Base commit: `62eb155714cf07ed74650c463f7c0ee49add5749`
- Base reason: `codex/fleexa-manager-foundation` exists and contains the
  Fleexa Manager docs/app/packages, but it has already been fast-forward merged
  into `main`; both branches point at `62eb155`.

Initial status before edits:

```text
## main...origin/main [ahead 9]
```

Recent base history:

```text
62eb155 Review Fleexa Manager week one readiness
74d8a8b Backfill Fleexa Manager product architecture docs
d156eeb Implement Fleexa Manager chat vertical slice
2cf325b Scaffold Fleexa Manager Expo foundation
656d9f1 Plan Fleexa Manager backend readiness
12b1846 Add Fleexa Manager API and event contracts
0fbac86 Add Fleexa Manager architecture guardrails
670f818 Keep monthly spend revenue chart stable
```

## Project Shape Detected

- Package manager: npm workspaces, `package-lock.json`,
  `packageManager: npm@11.8.0`.
- App workspace: `apps/fleexa-manager`.
- Shared package workspaces: `packages/fleexa-api-client`,
  `packages/fleexa-domain`, `packages/fleexa-ui`, `packages/fleexa-config`.
- Chatwoot integration: patch-only files under `chatwoot-patches/`, applied by
  `Dockerfile.chatwoot` and `Makefile`.
- Local Chatwoot source is not owned by this repository; Makefile flows copy it
  from `chatwoot/chatwoot:v4.14.2`, commonly into
  `/tmp/fleexa-chatwoot-app-build`.

## What Already Exists

- `AGENTS.md` defines the current guardrails: Chatwoot/Vue is
  backoffice/admin/legacy; Fleexa Manager Expo is the primary manager frontend;
  new manager behavior must be API-first and backend/domain-owned.
- Product and architecture docs exist under `docs/fleexa-manager/`, including
  product scope, system architecture, domain ownership, 90-day roadmap, events,
  booking integration, security, backend readiness, and ADRs 0001-0004.
- `docs/fleexa-manager/openapi.yaml` defines the intended
  `/api/fleexa-manager/v1` mobile-ready contract for session, conversations,
  messages, linked deals, pipeline stages, deals by stage, booking by deal, and
  manager counters.
- ADR 0004 selects an isolated Fleexa Manager namespace inside Chatwoot/Rails
  for the first backend implementation phase, with future extraction to a
  separate BFF/API left open.
- `apps/fleexa-manager` contains the Expo Router app shell, login screen,
  authenticated layout, conversation list/detail surfaces, TanStack Query
  integration, local UI state via Zustand, SecureStore abstraction, and safe
  Sentry initialization when `SENTRY_DSN` is absent.
- `packages/fleexa-api-client` exposes the existing `FleexaApiClient`
  interface. It has:
  - `HttpFleexaApiClient` for the Manager API contract.
  - `ChatwootFleexaApiClient` as a temporary local bridge to raw Chatwoot
    `/api/v1` routes.
  - `MockFleexaApiClient` for UI development only.
- `packages/fleexa-domain` contains Manager DTO types and helpers for
  permissions, sessions, conversations, messages, deals, pipeline, booking,
  counters, and errors.
- Existing Chatwoot CRM patches provide current backoffice/legacy CRM behavior:
  pipeline stages, deals, deal fields, query/filter/pagination, export,
  conversation-to-deal backfill, marketing spend, marketing analytics, source
  mapping/detection/settings, manual spend attribution, and visible Fleexa
  branding.
- `Dockerfile.chatwoot` and `Makefile` already contain patch application and
  validation flows for the existing CRM and branding patches.

## What Is Missing

- No implemented Rails namespace for `/api/fleexa-manager/v1` exists in
  `chatwoot-patches/`.
- No Manager-specific Rails controllers, serializers, services, permission
  mapper, error envelope mapper, or request specs exist yet.
- Expo live production acceptance is still blocked because live mode must not
  call raw Chatwoot `/api/v1` routes directly.
- `ChatwootFleexaApiClient` is still a development bridge and must not become
  the production API path.
- Backend-owned idempotency for `sendTextMessage` does not exist.
- Backend-owned Manager permissions are not implemented; current CRM endpoints
  still inherit Chatwoot/admin-oriented gates in several places.
- Linked deal lookup is not exposed through a Manager DTO endpoint.
- Manager counters are not backend-owned through the Manager namespace.
- Pipeline, deal-by-stage, booking-by-deal, realtime replay, push/deep links,
  files, booking webhooks, and analytics remain outside the Stage 2 backend
  slice unless explicitly added later.
- Week 1 contract drift is still unresolved:
  counters shape, source attribution field names, lead qualification values,
  `clientMessageId` UUID expectations, error code names, and local Chatwoot
  adapter mode semantics.

## Current Test Status

Baseline checks run before this document was added:

| Command | Status | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | `eslint . --max-warnings=0` completed cleanly. |
| `npm run typecheck` | Pass | TypeScript passed for manager app and all workspaces. |
| `npm test` | Pass | Vitest: 3 test files, 14 tests passed. |
| `git diff --check` | Pass | No whitespace errors before edits. |
| `make crm-patch-check` | Baseline fail | Running Rails container already has CRM backend files such as `app/models/crm_pipeline_stage.rb`, `app/models/crm_deal.rb`, `app/models/crm_deal_activity.rb`, and `app/models/crm_loss_reason_option.rb`; `git apply --check` reports them as already existing. |
| `make crm-vue-check` | Baseline fail | Running Rails container already has several Vue CRM files and some upstream hunks no longer apply there, including `crmPipeline.js`, `CrmDealWidget.vue`, `Pipeline.vue`, `routes.js`, `Sidebar.vue`, `ContactPanel.vue`, and `dashboard.routes.js`. |

The Makefile failures are pre-existing container/patch-state baseline failures
observed before any Stage 2 edits. They are not caused by this document.

## Exact Next Implementation Order

1. Reconfirm the first Stage 2 backend scope: session/current manager,
   conversations list, conversation detail, messages list, send text message,
   linked deal read, and a minimal manager counters shell.
2. Resolve the contract drift that affects the first slice while preserving the
   `FleexaApiClient` interface: error enum, `clientMessageId` format,
   counters shape, and source/qualification naming used by returned DTOs.
3. Add one additive Chatwoot patch for the Manager API namespace and route
   mount: `/api/fleexa-manager/v1`.
4. Add Manager API base behavior in the patch: account isolation, current
   account loading, permission checks, normalized error envelope, request ID
   propagation, and pagination helpers.
5. Implement `GET /session/current` using current Chatwoot session/account
   membership data mapped into Manager roles and permissions.
6. Implement conversation list and detail serializers from Chatwoot
   conversations, contacts, inbox/channel data, assignee, unread count, reply
   window, and linked deal summary when available.
7. Implement messages list serializer from Chatwoot messages with only
   mobile-ready fields, preserving cursor pagination and customer/private/system
   visibility.
8. Implement send text message through Chatwoot's existing message creation
   path, wrapped by Manager permissions, Manager DTO response, and backend
   idempotency handling.
9. Implement linked deal read by conversation using existing `CrmDeal` records,
   returning explicit link state rather than raw CRM/Chatwoot objects.
10. Implement the minimal counters endpoint from backend-owned queries for
    unread, assigned, and unassigned conversation counts only. Do not add
    answered/unanswered or reply-risk counters until that backend logic is
    implemented and tested.
11. Add Ruby syntax checks and request/serializer specs for the new patch files,
    including account isolation, forbidden account access, unauthenticated
    access, missing records, and send-message validation errors.
12. Wire the new patch into `Dockerfile.chatwoot` and `Makefile` only after the
    patch validates cleanly against a clean Chatwoot source copy.
13. Point Expo live Manager mode at `/api/fleexa-manager/v1` without rewriting
    screens and run the existing lint, typecheck, tests, web smoke, API smoke,
    `git diff --check`, and patch-chain validation.
