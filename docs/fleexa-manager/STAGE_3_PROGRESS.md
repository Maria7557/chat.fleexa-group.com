# Fleexa Manager Stage 3 Progress

Date: 2026-07-18
Branch: `codex/fleexa-manager-core-stage-3`
Base commit: `1d4844a Close Fleexa Manager stage 2 foundation`

## Goal

Replace developer-facing bearer-token login with manager-facing email/password
login while keeping the accepted Stage 2 temporary Chatwoot auth strategy.

## Implemented

- Added `POST /api/fleexa-manager/v1/session` in the Manager namespace through
  `chatwoot-patches/fleexa-manager-chat-api-backend.patch`.
- The endpoint verifies Chatwoot email/password credentials, active user state,
  MFA requirement, active account membership, and optional workspace/account
  hint before returning a Manager-shaped session response.
- The endpoint returns the existing Chatwoot user access token only as internal
  client credential material. Expo stores it through the SecureStore abstraction
  and never renders it in the UI.
- Web restore uses session-scoped browser storage through the same abstraction,
  with a memory fallback for non-browser render contexts.
- Added typed `LoginSessionRequest` and `LoginSessionResponse` contracts in
  `@fleexa/domain` and `@fleexa/api-client`.
- Added `ManagerApiClient.login()` against `/session`; it deliberately omits
  stale bearer auth on login.
- Kept the `FleexaApiClient` interface stable apart from the small login method
  extension required by the contract.
- Replaced the Expo login screen token field with email, password, and optional
  workspace fields.
- Session restore now verifies `session/current`; invalid or expired sessions
  are cleared and return to login.
- Logout clears local stored credential state and returns to login. Server-side
  token revoke remains a beta auth blocker.

## Security Notes

- Production/live mode still uses `ManagerApiClient` and
  `/api/fleexa-manager/v1`.
- Mock mode remains UI-development only and does not satisfy production
  acceptance.
- Raw Chatwoot API response objects are not exposed to the UI.
- Wrong email/password returns `401 invalid_credentials`.
- Missing, invalid, or expired bearer credentials on authenticated routes return
  `401 unauthenticated`.
- No secrets were committed.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with `--max-warnings=0`. |
| `npm run typecheck` | Pass | All Expo/packages TypeScript workspaces passed. |
| `npm test` | Pass | Vitest: 3 files, 22 tests. |
| OpenAPI YAML parse | Pass | `docs/fleexa-manager/openapi.yaml` parsed successfully. |
| `npm run smoke:web` | Pass | Expo web export produced `dist-web-smoke`; Expo force-exited after export as expected. |
| `make crm-assets-build-host` | Pass | Clean Chatwoot host build applied full patch chain and built Vite assets. |
| Ruby syntax | Pass | `session_controller.rb`, request spec, and routes syntax check passed from `/tmp/fleexa-chatwoot-app-build`. |
| `make crm-patch-check` | Blocked by local container state | The running Rails container is already patched and rejects reapplying existing CRM files such as `app/models/crm_pipeline_stage.rb`. Clean host build is the authoritative patch-chain check for this run. |
| Backend request spec | Blocked by Ruby/RSpec environment | Host run requires Bundler 2.5.16, which is not installed; Rails container reports `bundler: command not found: rspec`. |
| API smoke | Pass | Wrong password `401 invalid_credentials`; wrong workspace `403 forbidden`; login `201`; `session/current` `200`; conversations `200`; Manager DTOs contained no raw Chatwoot fields. |
| Expo web smoke | Pass | `http://127.0.0.1:8082` login -> `session/current` -> `/home` conversations screen; reload restored session; logout returned to login; token text was not visible. |
| iOS simulator smoke | Blocked | `xcrun simctl` is unavailable in this environment. |

## Remaining Beta Auth Work

- Replace the temporary Chatwoot token exchange with Manager-owned auth.
- Add refresh-token rotation.
- Add server-side logout/revoke.
- Add device/session inventory.
- Add production MFA flow.
- Add audit events for login, refresh, logout, and revoke.
