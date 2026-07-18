# Fleexa Manager Stage 2 Final Review

Date: 2026-07-18
Current branch: `codex/fleexa-manager-manager-api-stage-2`
Reviewed commit before final-close commit: `87ff965`

## Decision

**GO to close Stage 2 foundation and start the next foundation stage.**

This is not a GO for production beta. It is also not a GO to jump straight into
large product/UI work. The next stage should start with backend test-runner
readiness, then the smallest linked-deal read API slice.

Stage 2 now has the required foundation shape:

- Expo live mode uses `ManagerApiClient`.
- Live Manager API base URL points at `/api/fleexa-manager/v1`.
- Production config rejects mock mode and non-manager drivers.
- The chat vertical slice works against the real local Manager API namespace.
- Manager DTOs are returned instead of raw Chatwoot payloads.
- Wrong-account and cross-account conversation access are denied in live smoke.
- Duplicate send with the same `clientMessageId`/`Idempotency-Key` does not
  create a second message.
- Counters expose only reliable values: `unread`, `assigned`, `unassigned`.

## Duplicate File Cleanup

Initial status contained untracked OS/cloud-style duplicate files with suffix
` 2`, including root config, Expo app files, and Fleexa Manager docs.

Result:

- 28 source/doc/config duplicate files were inspected and deleted.
- 22 were byte-for-byte identical to the real file.
- 6 differed, but the duplicate was older and would have reverted Stage 2
  Manager API updates if preserved:
  - `DEV_NOTES 2.md`
  - `apps/fleexa-manager/.env 2.example`
  - `apps/fleexa-manager/README 2.md`
  - `docs/fleexa-manager/BACKEND_READINESS_PLAN 2.md`
  - `docs/fleexa-manager/SECURITY_AND_PERMISSIONS 2.md`
  - `docs/fleexa-manager/openapi 2.yaml`
- 3 ignored generated Expo export artifacts under
  `apps/fleexa-manager/dist-web-smoke/* 2.html` were also removed.
- No useful unique work was found in the duplicate files.
- Final duplicate scan found no remaining `* 2*` files outside ignored
  dependencies.

Cleanup impact:

- `npm run lint` no longer fails on duplicate Metro/Babel configs.
- Expo web export no longer creates static routes for `/index 2`, `/login 2`,
  or `/_layout 2`.

## Test Results

Run on 2026-07-18 after cleanup:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | Duplicate config files removed. |
| `npm run typecheck` | Pass | All workspaces typecheck. |
| `npm test` | Pass | Vitest: 3 files, 21 tests. |
| `git diff --check` | Pass | No whitespace errors before this doc. |
| `npm run validate:env` | Pass | Development live mode resolves to manager driver and `/api/fleexa-manager/v1`; Sentry disabled safely when no DSN is present. |
| `npm run smoke:web` | Pass | Expo web export completed with 8 expected static routes and no ` 2` duplicate routes. |
| `make crm-assets-build-host` | Pass | Full Chatwoot patch chain applied to a clean `/tmp/fleexa-chatwoot-app-build` copy and Vite production build completed. |
| Ruby syntax checks | Pass | Generated Manager controller, base controller, idempotency service, and request spec are syntax-valid. |
| Backend request specs | Blocked | Local container still reports `bundler: command not found: rspec`. Specs exist in the patch but cannot run in this container. |
| iOS simulator probe | Blocked | `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`. |

## Local Smoke Results

Smoke target:

`http://127.0.0.1:3000/api/fleexa-manager/v1`

Validated flow:

1. `GET /session/current`
2. `GET /accounts/acc_1/conversations?limit=1`
3. `GET /accounts/acc_1/conversations/conv_1`
4. `GET /accounts/acc_1/conversations/conv_1/messages?limit=5`
5. `POST /accounts/acc_1/conversations/conv_1/messages/text`
6. Repeat the same send with the same `clientMessageId` and `Idempotency-Key`
7. `GET /accounts/acc_1/manager/counters`
8. Wrong-account and cross-account denial probes

Observed results:

| Probe | Result |
| --- | --- |
| Session DTO has user and membership and no token payload | Pass |
| Conversation list DTO omits raw Chatwoot fields | Pass |
| Conversation detail DTO omits raw Chatwoot fields | Pass |
| Message DTO omits raw Chatwoot fields | Pass |
| Send response DTO omits raw Chatwoot fields | Pass |
| Repeated send returned `idempotency.duplicate: true` | Pass |
| Repeated send returned the same Manager message id | Pass |
| Counters keys are exactly `assigned`, `unassigned`, `unread` | Pass |
| Wrong account list access | `403` |
| Conversation from another account requested through own account | `404` |
| Message send to conversation from another account | `404` |
| Cross-account send created no message in the other conversation | Pass |

## Required Stage 2 Checks

Expo production/live mode avoids raw Chatwoot API:

- `@fleexa/config` defaults to `apiDriver=manager`.
- Manager mode requires a base URL ending in `/api/fleexa-manager/v1`.
- Production config rejects `apiDriver=chatwoot`.
- The legacy `ChatwootFleexaApiClient` remains an explicit development-only
  adapter.

Production/live mode does not use `MockApiClient`:

- Production config rejects `apiMode=mock`.
- Mock remains only for UI development and cannot satisfy acceptance.

Manager API returns Manager DTOs:

- Live smoke checked session, conversation list, conversation detail, messages,
  and send response for raw Chatwoot fields such as `custom_attributes`,
  `additional_attributes`, `display_id`, `uuid`, `identifier`, `source_id`, and
  `content_attributes`.

Tenant isolation:

- Account membership failure returns `403`.
- Cross-account conversation lookup through an accessible account returns
  `404`.
- Cross-account send returns `404`.
- Cross-account send did not create a message.
- Request specs for these cases are present in
  `chatwoot-patches/fleexa-manager-chat-api-backend.patch`, but spec execution
  is blocked locally by the missing `rspec` executable.

Idempotency:

- Message send requires `clientMessageId` or `Idempotency-Key`.
- Stage 2 SDKs send both with the same UUID.
- Backend idempotency uses persisted metadata plus a Postgres advisory
  transaction lock scoped by account, conversation, and idempotency key.
- Repeating the same request returns the original message and
  `idempotency.duplicate: true`.
- Reusing the same key with a different payload returns `409 conflict`.

Counters:

- Only `unread`, `assigned`, and `unassigned` are exposed.
- `unanswered` remains intentionally excluded until backend logic and tests
  exist.

## Security Status

Stage 2 is production-shaped but not beta-ready:

- Temporary Chatwoot token auth is still in use by ADR 0005.
- Dedicated Manager login, refresh, revoke, logout, device/session inventory,
  and audit events do not exist yet.
- Error responses use the Manager envelope and safe UI messages.
- Send failure logging avoids bearer tokens, request bodies, and raw exception
  messages.
- Production throttling is not implemented; Stage 2 has only the documented
  minimal abuse guard of auth, account scoping, payload limits, idempotency key
  limits, and duplicate retry protection.

## Remaining Blockers

Blockers before production beta:

- Manager-owned session lifecycle is not implemented.
- Production rate limiting is not implemented.
- Backend request specs cannot run in the current local container because
  `rspec` is unavailable through Bundler.
- iOS simulator validation is blocked by missing `simctl`.

Blocker before larger deal/pipeline UI work:

- Existing backend request specs should be made executable and green first, so
  linked deal and pipeline work has a reliable security regression gate.

## Exact Next Stage

Next stage: **Enable Fleexa Manager backend request specs**, then implement the
read-only linked deal API.

Recommended order:

1. Make `bundle exec rspec spec/requests/api/fleexa_manager/v1/chat_api_spec.rb`
   runnable in local or CI Chatwoot test environment.
2. Prove current Stage 2 auth, tenant isolation, DTO shape, pagination, and
   duplicate-send request specs pass.
3. Add `GET /api/fleexa-manager/v1/accounts/:account_id/conversations/:conversation_id/linked-deal`.
4. Keep the linked deal implementation backend-first and DTO-only.
5. Add Expo deal-card rendering only after the real Manager endpoint is proven.
6. Add pipeline stages and deals-by-stage read endpoints after linked deal
   isolation and DTO tests are green.

Do not implement pipeline mutation, booking, answered/unanswered, push, files,
or analytics in the next slice.
