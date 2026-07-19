# Fleexa Manager Controlled Beta Gate

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Purpose

This gate defines the commands that must pass before a controlled Fleexa Manager
beta can be considered. It covers Expo web, TypeScript packages, Manager API
request specs, OpenAPI syntax, the patched Chatwoot build path, and an isolated
Manager API E2E smoke.

Mock mode does not satisfy this gate. Production/live mode must use
`ManagerApiClient` against `/api/fleexa-manager/v1`.

## CI Commands

Run the full local gate:

```sh
npm run ci:fleexa-manager
```

Equivalent expanded command list:

```sh
npm run lint
npm run typecheck
npm test
npm run smoke:web
npm run openapi:check
make fleexa-manager-rspec
npm run smoke:e2e
make crm-assets-build-host
git diff --check
```

The GitHub Actions equivalent is
`.github/workflows/fleexa-manager-stage4.yml`.

## Individual Gates

| Gate | Command |
| --- | --- |
| Frontend lint | `npm run lint` |
| Frontend typecheck | `npm run typecheck` |
| Frontend tests | `npm test` |
| Expo web smoke | `npm run smoke:web` |
| OpenAPI YAML parse | `npm run openapi:check` |
| Rails request specs | `make fleexa-manager-rspec` |
| Controlled beta E2E smoke | `npm run smoke:e2e` |
| Patch-chain build | `make crm-assets-build-host` |
| Whitespace | `git diff --check` |

## E2E Smoke Definition

The controlled beta E2E smoke runs in the isolated patched Chatwoot RSpec test
app and test database. It does not require committed credentials and does not
touch local user data.

Command:

```sh
npm run smoke:e2e
```

Flow:

1. `POST /api/fleexa-manager/v1/session` with email/password and
   `clientPlatform=ios`.
2. `GET /session/current`.
3. `GET /accounts/{accountId}/conversations?filter=all`.
4. Verify `mine`, `unread`, `waiting_for_reply`, and `unassigned` filters.
5. Open conversation detail.
6. Read messages.
7. Send a text message with `clientMessageId` and `Idempotency-Key`.
8. Retry the same send and verify no duplicate message is created.
9. Read missing linked deal.
10. Create linked deal from the conversation.
11. Read pipeline stages.
12. Read pipeline deals.
13. Move the deal to another backend stage with `expectedVersion`.

This is an API E2E smoke, not a browser automation smoke. Browser and iOS
interactive smoke remain separate gates.

## Required Environment

Local and CI runs may use:

```sh
cp .env.local.example .env.local
```

No production DSNs, auth tokens, Booking service tokens, or signing secrets may
be committed. Sentry DSNs are configured through environment variables only.

## Merge Rule

Controlled beta can only be marked GO when:

- the full gate passes,
- the iOS simulator smoke has been run on a machine with full Xcode and
  `simctl`, and
- a real staging or controlled-beta backend has validated backup, restore, and
  rollback procedures.
