# Fleexa Manager Product Scope

Date: 2026-07-18
Branch: `codex/fleexa-manager-foundation`

## Purpose

Fleexa Manager is the primary manager frontend for Fleexa operators and
managers. It is an Expo React Native product, web first and iPhone later from
the same codebase.

Chatwoot/Vue remains the backoffice, admin, and legacy shell. It continues to
carry current operational CRM visibility while Manager moves to a stable
API-first product surface.

## Current Product State

Completed foundation:

- Architecture guardrails and current-state audit.
- Mobile-ready OpenAPI, realtime event, booking, and security contracts.
- Backend readiness plan and ADR 0004 for Manager API layer placement.
- Expo workspace foundation under `apps/fleexa-manager`.
- Shared packages for API client, domain types, UI, and config.
- Real local chat vertical slice through `ChatwootFleexaApiClient`:
  session -> conversations -> detail -> messages -> send text.

The current chat slice proves that Expo can use the local Chatwoot backend, but
it is still a bridge. The target production contract is
`/api/fleexa-manager/v1`, not raw Chatwoot routes.

## Primary Users

| User | Needs |
| --- | --- |
| Operator | See assigned conversations, understand the linked deal, answer quickly, and move simple workflows forward. |
| Manager | See team queues, pipeline health, stale work, counters, and handoff risks. |
| Marketing admin | Review source attribution, source clarification, and marketing settings once APIs are ready. |
| Owner | Manage account-level settings, permissions, and backoffice operations. |

## In Scope

Near-term Manager product scope:

- Current session and account membership bootstrap.
- Conversation queue, conversation detail, messages, and text send.
- Deal card attached to a conversation.
- Linked booking display on deal cards and deal detail.
- Pipeline stage list and deals by stage.
- Answered/unanswered state and reply eligibility.
- Manager counters for conversations, deals, and bookings.
- Source attribution display and clarification flags.
- Push notification, deep link, and file attachment foundations after the
  first web surface is stable.

All new Manager features must be API-first and Expo-ready.

## Out Of Scope

For this product foundation phase:

- Rebuilding all Chatwoot inbox/admin settings in Expo.
- Treating Chatwoot/Vue as the target Manager frontend.
- Direct Vue-to-Expo ports that copy frontend business logic.
- Pipeline writes, booking writes, push, analytics, and exports before their
  backend contracts are ready.
- Raw Chatwoot objects, raw CRM rows, or booking-provider payloads in Manager
  screens.
- Mock-only acceptance for production readiness.

## Acceptance Rules

Real backend acceptance is required. Mock mode is only for UI development and
cannot satisfy final acceptance.

For every Manager feature:

1. Define or update the backend/API/domain contract first.
2. Return mobile-ready DTOs with account isolation and permission filtering.
3. Keep business rules backend-side.
4. Build Expo web against the same contract intended for iPhone.
5. Verify against a real local or staging backend before calling the feature
   ready.

## Product Boundaries

Chatwoot keeps:

- inboxes, conversations, contacts, and message history as current source data
- backoffice and admin workflows
- existing CRM patch surfaces until Manager replaces the daily workflow
- emergency operational visibility

Fleexa Manager owns:

- the daily operator and manager workspace
- portable web/iPhone screens
- Manager DTO consumption
- local UI state only
- product flows that should outlive Chatwoot/Vue

Backend/API/domain owns:

- permissions
- account isolation
- idempotency
- stage rules and validation
- source attribution
- counters and KPI formulas
- booking normalization and link state
- customer identity matching
- realtime event filtering
