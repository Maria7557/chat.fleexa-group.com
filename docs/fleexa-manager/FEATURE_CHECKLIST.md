# Fleexa Manager Feature Checklist

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

Use this checklist before implementing any future Fleexa feature.

## Required Pre-Coding Record

Every feature must document:

| Field | Required answer |
| --- | --- |
| Feature classification | Manager / Backoffice / Shared infrastructure |
| Manager or backoffice ownership | Which product surface owns the workflow |
| Backend business logic | What logic must live in backend/domain services |
| API contract impact | OpenAPI/domain/client changes, or `None` |
| Expo web/iOS reuse | Full / Partial / Not applicable |
| Vue dependency | None / Temporary exception / Backoffice-owned |
| Tests | Backend specs, package tests, Expo tests/smoke, patch checks |
| Explicit exceptions | Any reason to use Vue, skip iOS proof, or defer operational proof |

## Classification Rules

Manager:

- Daily manager workflow.
- Must be API-first and Expo-ready.
- Business rules belong backend-side.
- Vue is not the implementation target unless explicitly justified as a
  temporary/backoffice/demo exception.

Backoffice:

- Admin, configuration, legacy data correction, migration support, or internal
  maintenance.
- May remain in Chatwoot/Vue.
- Must not become the hidden source of truth for Manager behavior.

Shared infrastructure:

- Auth, permissions, observability, realtime plumbing, staging, CI, deployment,
  backup/restore, data contracts, shared packages, and safety guardrails.
- Must be reusable by Expo web and iOS where product-facing.

Ambiguous:

- Stop before coding.
- Ask whether this belongs to the Manager product or backoffice.
- Do not ask when the classification rules make the answer clear.

## Contract Checklist

If the feature changes Manager API behavior:

- update `docs/fleexa-manager/openapi.yaml`;
- update `packages/fleexa-domain`;
- update `packages/fleexa-api-client`;
- keep DTOs mobile-ready;
- avoid raw Chatwoot objects;
- include account isolation and stable error behavior;
- include pagination/idempotency/concurrency when relevant.

## UI Checklist

If the feature is Manager-facing:

- implement the surface in Expo Manager;
- design for web and future iPhone from the same codebase;
- keep Zustand only for local UI state;
- avoid frontend-only business rules;
- use Manager API data, not raw Chatwoot routes;
- record any iOS-specific risk if simulator proof is deferred.

If the feature is backoffice-facing:

- keep it in Chatwoot/Vue only when the classification says Backoffice;
- document why it is not a daily-manager product workflow;
- document any future Expo migration path if managers will later use it daily.

## Exception Checklist

A Vue exception is allowed only when explicitly documented as one of:

- temporary urgent demo;
- backoffice/admin workflow;
- legacy shell maintenance;
- migration bridge while backend/API and Expo surface are being prepared.

The exception must state:

- why Expo is not the immediate implementation target;
- what backend contract will own the business logic;
- when or why the behavior should move to Expo;
- what risk exists if it remains in Vue.
