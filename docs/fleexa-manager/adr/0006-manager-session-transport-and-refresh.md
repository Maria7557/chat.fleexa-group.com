# ADR 0006: Manager Session Transport And No-Refresh Strategy

Date: 2026-07-19
Status: Accepted for Stage 4

## Context

Stage 3 used temporary Chatwoot user access tokens returned from Manager login
and stored by Expo web in browser session storage. That cannot be the production
Manager path: web sessions need HttpOnly cookies, iOS needs SecureStore, and
logout must revoke server-side session material.

Chatwoot's upstream `access_tokens` table is a long-lived owner token model. It
does not provide Manager-specific expiration, revoke state, transport metadata,
or session inventory.

## Decision

Add a small Manager-owned session table through `chatwoot-patches/`:

- raw session token is shown only once
- server stores only an HMAC digest
- every session has `expires_at`
- logout sets `revoked_at`
- disabled/deactivated users are denied even when a token exists
- web login sets `fleexa_manager_session` as HttpOnly SameSite cookie
- iOS/native login returns a bearer session token for Expo SecureStore
- Expo web does not store bearer tokens in `localStorage` or `sessionStorage`

Stage 4 intentionally has no refresh endpoint. Sessions use a fixed TTL
(`FLEEXA_MANAGER_SESSION_TTL_SECONDS`, default 12 hours). Expired sessions must
return `401 unauthenticated`; managers sign in again.

## Consequences

- The production Manager UX no longer asks users to paste tokens.
- Web session material is not visible to JavaScript.
- iOS can still authenticate via bearer token, but the token is scoped to the
  Manager session table and is revocable.
- Revoke behavior exists now through `DELETE /session`.
- Refresh-token rotation, device/session inventory, MFA session binding, and
  audit enrichment remain future hardening work before broader beta.

## Rejected

- Keep Chatwoot `access_tokens` as the production Manager session: rejected
  because it lacks Manager expiry and revoke semantics.
- Store web bearer tokens in browser storage: rejected because it keeps the
  Stage 3 temporary risk.
- Add refresh tokens in Stage 4: rejected to keep this hardening step small and
  testable; fixed TTL plus re-login is acceptable for this stage.
