# ADR 0005: Stage 2 Auth And Session Strategy

Date: 2026-07-18
Status: Accepted for Stage 2

## Context

Fleexa Manager needs authenticated mobile-ready APIs before the backend adapter
is implemented. The long-term product needs Manager-owned login, refresh, and
logout endpoints, but Stage 2 is intentionally focused on the first API adapter
inside Chatwoot/Rails.

The current Expo foundation already stores an access token through the
SecureStore abstraction and calls `GET /session/current` to verify credentials.
The real local vertical slice can authenticate with existing Chatwoot user
access tokens, but production live mode must not call raw Chatwoot `/api/v1`
routes directly.

## Decision

Use Option B for Stage 2: the `/api/fleexa-manager/v1` Rails namespace accepts
existing Chatwoot authentication temporarily.

Accepted inputs:

- `Authorization: Bearer <chatwoot_user_access_token>`
- `api_access_token: <chatwoot_user_access_token>`
- existing same-origin Chatwoot Rails session cookie for Expo web when served
  from the authenticated Chatwoot origin

`GET /api/fleexa-manager/v1/session/current` remains the only Stage 2 Manager
session endpoint. Do not implement `POST /session`, `POST /session/refresh`, or
`DELETE /session` until the Manager-owned auth boundary is designed for beta.

## Why Not Option A Now

Implementing real Manager session endpoints now would require token issuance,
refresh-token rotation, server-side revoke, device/session inventory, and audit
behavior. That is the right beta direction, but it is larger than the narrow
Stage 2 adapter and would add security-sensitive code before the first Manager
DTOs are proven against local Chatwoot data.

## Rules

- The Manager API must return Manager DTOs, never raw Chatwoot objects.
- Expo live production acceptance must use `apiDriver=manager` and
  `/api/fleexa-manager/v1`.
- The temporary `apiDriver=chatwoot` bridge remains development-only.
- iPhone/native stores the temporary Chatwoot access token through SecureStore.
- Expo web keeps manually entered tokens in memory; same-origin deployments may
  rely on the existing Chatwoot Rails session cookie.
- Sign out clears Expo-held credentials but does not revoke the upstream
  Chatwoot token.
- Permission changes are reflected by `GET /session/current`; no Manager
  refresh-token rotation exists in Stage 2.

## Replacement Required Before Production Beta

Before production beta, replace this with Manager-owned session lifecycle:

1. `POST /api/fleexa-manager/v1/session`
2. `POST /api/fleexa-manager/v1/session/refresh`
3. `DELETE /api/fleexa-manager/v1/session`
4. `GET /api/fleexa-manager/v1/session/current`

The replacement must include short-lived access tokens, refresh-token rotation,
server-side revoke, account-scoped permissions, device/session inventory, audit
events for login/refresh/logout, and realtime revocation.

## Consequences

- Stage 2 can focus on DTO mapping, permissions, account isolation, and
  idempotent message sending.
- The first backend patch stays smaller and safer.
- Chatwoot auth remains a temporary dependency and must be tracked as a beta
  blocker.
- Security documentation and OpenAPI must continue to mark this strategy as
  temporary.
