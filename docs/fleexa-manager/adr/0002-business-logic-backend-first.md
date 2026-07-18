# ADR 0002: Business Logic Backend First

Date: 2026-07-18
Status: Accepted

## Context

Current Chatwoot CRM patches include large Vue surfaces that assemble business
logic for analytics, attribution, stage requirements, filters, source display,
and manager performance. That makes results hard to reuse in Expo web and
iPhone, and it risks diverging behavior between old and new UIs.

Fleexa Manager needs stable mobile-ready DTOs and predictable permissions. The
UI should not be the canonical owner of product rules.

## Decision

Business logic belongs in backend/API/domain layers before it becomes Manager
product behavior.

Expo and Vue screens may format, compose, and render data. They may hold local
UI state. They must not own canonical rules for permissions, attribution, KPI
math, stage movement, booking link state, customer identity, idempotency, or
exports.

## Consequences

- Manager APIs return normalized facts and allowed actions.
- Stage transitions are validated backend-side.
- Source attribution returns method, confidence, and clarification state from a
  backend resolver.
- Manager counters and KPI formulas are backend-owned.
- Booking integration normalizes provider payloads before clients see them.
- UI code stays smaller and more portable across web and iPhone.
- Tests can target services and serializers instead of browser-only state.

## Examples

Backend-owned:

- `messages:send` permission and reply eligibility.
- Deal required fields and loss reason requirements.
- Answered/unanswered and stale-response states.
- Lead source detection and source confidence.
- Booking conflict detection.
- Manager counters and marketing economics.

UI-owned:

- selected tab
- draft message text
- loading and empty states
- responsive layout
- display formatting
- optimistic pending indicators

## Non-Goals

- This ADR does not forbid UI helpers for presentation.
- This ADR does not require every legacy Vue helper to move immediately.
- This ADR does not require new database tables before a domain need is proven.
