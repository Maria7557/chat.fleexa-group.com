# Fleexa Manager Domain Ownership

Date: 2026-07-18
Branch: `codex/fleexa-manager-foundation`

## Rule

Business logic belongs in backend/API/domain layers. Fleexa Manager screens
render and compose data, but they are not the canonical owner of product rules.

Chatwoot/Vue remains a backoffice and legacy shell. It must not become the
target manager frontend or the place where new Manager behavior is designed.

## Ownership Matrix

| Domain | Source of truth | Manager API responsibility | Expo responsibility | Chatwoot/Vue responsibility |
| --- | --- | --- | --- | --- |
| Session | Backend auth and account membership | Return current user, active account, permissions, features, realtime bootstrap. | Store token securely, request session, route authenticated screens. | Existing backoffice auth remains separate. |
| Accounts and permissions | Backend membership and policy mapping | Enforce account isolation and endpoint permissions. | Hide unavailable actions based on response permissions. | Continue admin/backoffice role handling. |
| Conversations | Chatwoot conversation records | Return mobile-ready list/detail DTOs and safe filters. | Render queues, conversation headers, local selection state. | Operate legacy inbox and admin workflows. |
| Messages | Chatwoot message records and channel send path | Return normalized messages, enforce send permission, idempotency, reply eligibility. | Render bubbles and composer, submit text. | Continue existing inbox message UI. |
| Contacts and identity | Chatwoot contacts plus future identity resolver | Return safe contact summaries and identity match state. | Show display fields and ambiguity states. | Keep contact backoffice data entry. |
| Deals | CRM deal records | Return deal cards, linked deal state, transition validation, audit. | Render deal card and allowed actions. | Keep legacy CRM pages until migrated. |
| Pipeline | CRM pipeline stages | Return stage DTOs, counters, required fields, allowed transitions. | Render board/list and stage labels. | Backoffice/admin stage settings. |
| Booking | Booking provider/read model | Normalize provider data, expose link state, handle webhook idempotency. | Display linked booking, conflicts, and missing state. | No target ownership. |
| Source attribution | Backend attribution resolver and settings | Resolve source/origin/confidence, return explanation and clarification flag. | Display source and collect manual clarification when allowed. | Legacy visibility only. |
| Manager counters | Backend aggregation services | Compute conversation, deal, booking, and later economics counters. | Render counters and refresh states. | Legacy reports only until replaced. |
| Realtime | Manager event facade | Publish filtered events with cursors and replay semantics. | Subscribe, dedupe, refresh stale data. | Existing ActionCable remains internal source/backoffice. |
| Local UI state | Client only | None beyond returning canonical server state. | Zustand for local UI state only. | Legacy Vue local state stays legacy. |

## Backend-Owned Rules

These rules must not be implemented as canonical logic in Vue or Expo:

- whether a message can be sent
- account and permission checks
- message idempotency
- deal stage transition rules
- required fields and loss reason requirements
- linked booking state and conflict handling
- source attribution detection and confidence
- answered/unanswered and stale-response semantics
- customer identity matching
- manager counters and KPI math
- export semantics

## UI-Owned Behavior

Expo can own:

- navigation state
- selected tabs and filters before submission
- responsive layout
- input drafts
- optimistic pending indicators
- display formatting
- offline or loading presentation

If UI state changes business meaning, the backend contract must own the final
interpretation.

## Chatwoot Boundary

Chatwoot remains useful and important, but as a source/backoffice system:

- Keep Chatwoot changes patch-only.
- Prefer additive Manager API namespaces over editing upstream controllers.
- Do not expose raw Chatwoot payloads to Manager clients.
- Do not add new daily-manager product logic to Vue unless it is temporary and
  documented as legacy/backoffice.

## Mock Boundary

Mock mode is for UI development and design iteration only.

Mock responses can prove component behavior, but final acceptance requires a
real backend path with account isolation, permissions, persistence, and safe
errors.
