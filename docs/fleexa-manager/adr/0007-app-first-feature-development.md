# ADR 0007: App-First Feature Development

Date: 2026-07-19
Status: Accepted

## Context

Fleexa Manager is one Expo React Native product surface for web first and future
iPhone from the same codebase. Chatwoot/Vue remains important as the
backoffice, admin, and legacy UI, but it is not the target frontend for daily
manager workflows.

Stage 4 created useful production-hardening foundation. Remote staging and
final iOS/beta proof are now intentionally paused while the product remains
under active functional and interface development. This pause should not push
new product work back into Vue by default.

Without an explicit rule, urgent feature work can drift into Chatwoot/Vue
because it is familiar and available. That would increase migration cost,
duplicate business logic, and weaken iOS reuse.

## Decision

Adopt app-first feature development for all future Fleexa work.

Every feature must be classified before coding:

- Manager
- Backoffice
- Shared infrastructure

Daily manager workflows are backend/API first and Expo Manager UI by default.
Admin/backoffice functionality may remain in Chatwoot/Vue. Business logic must
live in backend/domain services and must not be implemented only in Vue or Expo.

Shared contracts must stay synchronized across:

- `docs/fleexa-manager/openapi.yaml`
- `packages/fleexa-domain`
- `packages/fleexa-api-client`

Manager DTOs must stay independent from raw Chatwoot objects, Rails rows, Vue
view models, and upstream Chatwoot response shapes.

If classification is ambiguous, stop before coding and ask whether the feature
belongs to the Manager product or backoffice. If the classification is clear,
do not ask just to restate the rule.

## Consequences

- New daily manager workflows are reusable by Expo web and future iPhone.
- Chatwoot/Vue remains available for admin/backoffice and legacy safety.
- Temporary Vue/demo exceptions are still possible, but must be explicit.
- Backend/domain services remain the source of truth for business behavior.
- OpenAPI/domain/client drift becomes visible at feature planning time.
- Stage 4 operational pause does not become a reason to make Vue the new
  Manager product surface.

## Temporary Vue Exceptions

If an urgent demo requires Vue, document it as a temporary/backoffice exception.
The exception must name:

- why Vue is required now;
- what business logic stays backend-side;
- whether Expo web/iOS reuse is full, partial, or not applicable;
- what contract or UI work is needed to remove the exception.

## Relationship To Stage 4

This ADR does not change historical Stage 4 results. Stage 4 remains
`DO_NOT_MERGE` for controlled beta until remote staging and operational proof
resume and pass.

This ADR changes the product development priority while that hardening work is
paused: continue Manager functionality and interface work app-first, and resume
staging 4-6 weeks before the first client or earlier if external testing begins.
