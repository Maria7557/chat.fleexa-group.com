# Fleexa Manager Observability Runbook

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Current Status

Decision: **DO_NOT_CONTINUE** for observability proof.

Reason: Sentry delivery cannot be proven in this local environment because no
Sentry DSN/auth env vars are configured, no real remote staging URL exists, and
iOS Simulator remains unavailable on this machine.

## Sentry Surfaces

| Surface | Runtime package | Runtime DSN | Source-map config | Safe absent-DSN behavior |
| --- | --- | --- | --- | --- |
| Expo Manager web | `@sentry/react-native` | `EXPO_PUBLIC_SENTRY_DSN` | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`, CI-only auth token | `initializeSentry` returns `false`; app still runs. |
| Expo iOS | `@sentry/react-native` | `EXPO_PUBLIC_SENTRY_DSN` | same Expo Sentry plugin config | `initializeSentry` returns `false`; app still runs. |
| Chat/Rails backend | upstream `sentry-ruby`, `sentry-rails`, `sentry-sidekiq` | `SENTRY_DSN` | not applicable | Chatwoot does not require Sentry gems unless `SENTRY_DSN` is present. |

Backend PII must be disabled in staging and production with:

```sh
SENTRY_SEND_DEFAULT_PII=false
DISABLE_SENTRY_PII=true
```

Chatwoot upstream currently enables `send_default_pii` unless
`DISABLE_SENTRY_PII` is set, so Fleexa staging must set both variables above.

## Smoke Trigger

Backend smoke endpoint:

```sh
POST /api/fleexa-manager/v1/observability/sentry-smoke
Authorization: Bearer <manager-session-token>
X-Fleexa-Observability-Smoke-Token: <staging-smoke-token>
```

It is disabled by default and requires all of:

- authenticated Manager session;
- `FLEEXA_MANAGER_OBSERVABILITY_SMOKE_ENABLED=true`;
- `FLEEXA_MANAGER_OBSERVABILITY_SMOKE_TOKEN` set in the staging secret store;
- matching `X-Fleexa-Observability-Smoke-Token`;
- `SENTRY_DSN` configured and Sentry loaded.

The backend event uses a fixed smoke message and safe tags/context only:

- `fleexa_manager.smoke=true`;
- `fleexa_manager.surface=backend`;
- request id.

No customer name, phone, email, raw token, booking payload, message text, or
account name should be attached to the smoke event.

Frontend helper:

- `captureSentrySmokeEvent({ surface: 'web' | 'ios', enabled: true })`
- not wired to a public UI route or button;
- returns `null` unless explicitly enabled and Sentry is already initialized;
- strips the optional marker to `[a-zA-Z0-9_.:-]` and caps it at 80 chars.

## Local/Staging Proof Procedure

Check env without printing secrets:

```sh
node -e "for (const k of ['SENTRY_DSN','EXPO_PUBLIC_SENTRY_DSN','SENTRY_AUTH_TOKEN','SENTRY_ORG','SENTRY_PROJECT']) console.log(k + '=' + (process.env[k] ? 'set' : 'unset'))"
```

Backend delivery proof:

```sh
curl -fsS \
  -X POST \
  -H "Authorization: Bearer $FLEEXA_MANAGER_MONITOR_TOKEN" \
  -H "X-Fleexa-Observability-Smoke-Token: $FLEEXA_MANAGER_OBSERVABILITY_SMOKE_TOKEN" \
  "$FLEEXA_MANAGER_API_BASE_URL/observability/sentry-smoke"
```

Expected response:

```json
{
  "data": {
    "surface": "backend",
    "provider": "sentry",
    "eventId": "event-id-from-sentry",
    "delivered": true,
    "requestId": "request-id"
  }
}
```

Web proof:

1. Build/serve Expo Manager web with `EXPO_PUBLIC_SENTRY_DSN` set by staging
   secrets.
2. Trigger the smoke helper from a protected test harness only.
3. Record the returned Sentry event id.
4. Confirm the event in Sentry under the staging environment.

iOS proof:

1. Use a machine with full Xcode and `simctl`.
2. Run the Expo iOS app with `EXPO_PUBLIC_SENTRY_DSN` from staging secrets.
3. Trigger the smoke helper from the protected test harness.
4. Record the returned Sentry event id and simulator/device name.

## Current Evidence

Local env check on 2026-07-19:

| Env var | Status |
| --- | --- |
| `SENTRY_DSN` | unset |
| `EXPO_PUBLIC_SENTRY_DSN` | unset |
| `SENTRY_AUTH_TOKEN` | unset |
| `SENTRY_ORG` | unset |
| `SENTRY_PROJECT` | unset |

Therefore no web, backend, or iOS Sentry delivery event id is available from
this machine.

iOS toolchain check on 2026-07-19:

| Command | Result |
| --- | --- |
| `xcode-select -p` | `/Library/Developer/CommandLineTools` |
| `xcodebuild -version` | Blocked, active developer directory is Command Line Tools, not full Xcode |
| `xcrun --version` | `xcrun version 64.` |
| `xcrun simctl list devices available` | Blocked, `simctl` is unavailable |

## Latest Local Gate Results

Run on 2026-07-19 from branch `codex/fleexa-manager-stage-4-hardening`:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 5 files and 31 tests |
| `make fleexa-manager-rspec` | Passed, 113 examples and 0 failures |
| `npm run smoke:web` | Passed, Expo web export completed |
| `npm run openapi:check` | Passed, OpenAPI YAML parsed |
| secret scan | Passed, high-risk token/key scan across 192 git-visible files |
| `git diff --check` | Passed |

The backend smoke trigger is covered by request specs with a stubbed Sentry
client. That proves the endpoint guardrails and no-PII payload shape, but it is
not a real Sentry delivery proof.

## Required Before GO

1. Provision real staging Sentry DSNs for Manager web/iOS and backend.
2. Set secrets only in staging host or CI secret store.
3. Verify backend smoke returns a real event id.
4. Verify web smoke returns a real event id.
5. Verify iOS smoke on a full Xcode Simulator and record the event id.
6. Confirm all three events appear in Sentry staging with no PII payload.
