# Stage 4 Test Harness

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`
Base commit: `6af8928`

## Goal

Make the existing Fleexa Manager Rails request specs executable against a clean,
patched Chatwoot test app and use that as the Stage 4 merge gate.

## Exact Command

Run:

```sh
make fleexa-manager-rspec
```

This target runs `scripts/fleexa-manager-rspec.sh`.

## Harness Shape

The regular local Rails container uses the production bundle and does not expose
RSpec. The harness therefore builds a separate test path:

- Copies clean Chatwoot source from `chatwoot/chatwoot:v4.14.2` into
  `/tmp/fleexa-chatwoot-rspec-app`.
- Sparse-clones upstream Chatwoot `v4.14.2` test support into
  `/tmp/chatwoot-v4.14.2-test-support`.
- Copies upstream `spec/` and `.rspec` into the temp app before patches.
- Applies the backend patch chain from `chatwoot-patches/`.
- Builds or reuses `fleexa-chatwoot:v4.14.2-patch1-rspec`, which installs the
  test bundle with `bundle config set without ""` and `bundle install`.
- Starts local `postgres` and `redis` only.
- Uses isolated test database `chatwoot_test`.
- Loads `crm-pipeline-migration.sql`,
  `fleexa-manager-booking-sync-foundation.sql`,
  `fleexa-manager-sessions.sql`, and
  `fleexa-manager-concurrency-safety.sql`.

The first run needs network access for the sparse upstream clone and the test
bundle image build. Later runs reuse the cached clone and Docker image unless
they are deleted.

## Spec Files

The harness runs exactly:

```sh
bundle exec rspec \
  spec/requests/api/fleexa_manager/v1/chat_api_spec.rb \
  spec/requests/api/fleexa_manager/v1/booking_sync_foundation_spec.rb \
  spec/requests/api/fleexa_manager/v1/booking_sync_logic_spec.rb \
  spec/requests/api/fleexa_manager/v1/security_rate_limits_spec.rb \
  spec/requests/api/fleexa_manager/v1/session_strategy_spec.rb \
  --format documentation
```

## Resolved Blockers

- Missing RSpec bundle: fixed by using a dedicated RSpec image instead of the
  production Rails container bundle.
- Missing `rails_helper` and factories: fixed by copying upstream Chatwoot
  `v4.14.2` spec support before applying Fleexa patches.
- Missing request helper: `json_response` support is now provided through the
  Fleexa Manager chat API backend patch.
- Missing `access_token` factory: test support is now provided through the
  Fleexa Manager chat API backend patch.
- Conversation id ambiguity: Manager API conversation ids now round-trip
  `conv_<conversation.id>` instead of Chatwoot `display_id`. Chatwoot
  `display_id` is account-local and can collide across accounts, which made
  cross-account mismatch specs hit a same-number conversation in the requested
  account.
- Stage 4B security hardening: added executable specs for auth denial,
  role/permission mapping, tenant isolation, disabled users, Booking service
  scope/account denial, rate limiting, and sensitive log filtering.
- Stage 4C session hardening: added executable specs for web HttpOnly cookie
  sessions, iOS bearer sessions, logout revoke, expired/invalid sessions, and
  disabled-user denial.
- Stage 4D concurrency hardening: added executable specs for Manager message
  retry safety, Booking idempotency retry safety, linked-deal uniqueness, deal
  optimistic concurrency conflicts, repeated stage move no-ops, and stale
  Booking event no-overwrite behavior.

## Latest Result

Command:

```sh
make fleexa-manager-rspec
```

Result:

```text
102 examples, 0 failures
```

## Stage 4 Verification Run

Checked on 2026-07-19:

| Check | Result |
| --- | --- |
| `git fetch origin main --prune` | Pass, `main`, `origin/main`, and branch base are `6af8928`. |
| OpenAPI YAML parse | Pass. |
| Ruby syntax for patched Manager API files | Pass from the RSpec image against `/tmp/fleexa-chatwoot-rspec-app`. |
| `make fleexa-manager-rspec` | Pass, `102 examples, 0 failures`. |
| `make crm-assets-build-host` | Pass, `CRM host assets built`. |
| `git diff --check` | Pass. |

Non-blocking warnings remain from upstream Rails/Chatwoot deprecations:

- `Rails.application.secrets` deprecation.
- singular `fixture_path` deprecation.
- Rack status symbol `:unprocessable_entity` deprecation.
- `assigned_conversations` alias deprecation.

## Merge Gate

`MERGE_READY` for Stage 4 is allowed only when:

- `make fleexa-manager-rspec` passes.
- OpenAPI YAML parses.
- Ruby syntax checks for patched Manager API files pass.
- `make crm-assets-build-host` passes.
- `git diff --check` passes.

Do not treat mock mode, the production Rails bundle, or a partially patched
container as satisfying the backend request spec gate.
