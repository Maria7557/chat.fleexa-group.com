# ADR 0001: Manager Frontend Direction

Date: 2026-07-18
Status: Accepted

## Context

The current Chatwoot/Vue CRM work provides important operational coverage, but
it is not the right long-term primary manager frontend. Existing manager-adjacent
Vue screens are large, patch-heavy, and coupled to Chatwoot dashboard state.

The future product must work on web first and iPhone later from one codebase.
It needs stable API contracts, portable UI, secure storage, and backend-owned
business rules.

## Decision

Fleexa Manager will be built as an Expo React Native application. Web is the
first supported surface, and iPhone follows from the same codebase.

Chatwoot/Vue remains the backoffice, admin, and legacy shell. It is not the
target manager frontend for new product behavior.

## Consequences

- New Manager features are designed for Expo and mobile-ready APIs.
- Shared domain, API client, UI, and config packages live under `packages/`.
- Vue screens can remain operational backoffice surfaces during migration.
- Chatwoot-specific route helpers, stores, and raw payload shapes must not leak
  into Manager product contracts.
- Browser-only assumptions are avoided in new Manager code.
- iPhone readiness is considered early, even while web is the first shipped
  surface.

## Alternatives Considered

### Continue In Chatwoot/Vue

Rejected as long-term direction. It is fast for backoffice patches, but it
increases upgrade conflict risk and keeps product logic tied to Chatwoot UI
state.

### Separate Native App Later

Rejected. Building web first without a portable foundation would force a second
implementation for iPhone.

### Expo Web First

Accepted. It gives one product codebase, supports web delivery now, and keeps
native iPhone paths open.

## Non-Goals

- This ADR does not remove Chatwoot.
- This ADR does not require rewriting all existing Vue CRM screens immediately.
- This ADR does not make mock mode acceptable for production readiness.
