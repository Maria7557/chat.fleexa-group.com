# Fleexa Manager Operations Runbook

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Health Checks

Local Manager API health check:

```sh
npm run health:manager
```

Default behavior:

- sends an Expo web CORS preflight to `/api/fleexa-manager/v1/session/current`;
- verifies unauthenticated `GET /session/current` returns `401` with the stable
  `unauthenticated` error code;
- does not require or print secrets.

Authenticated check:

```sh
FLEEXA_MANAGER_HEALTH_BEARER_TOKEN=... npm run health:manager
```

The token is only sent in an `Authorization` header and is not printed.

Production readiness health checks must include:

- load balancer HTTP health for Chatwoot Rails;
- Redis connectivity;
- PostgreSQL connectivity and migration state;
- `/api/fleexa-manager/v1/session/current` stable unauthenticated response;
- authenticated Manager API synthetic check using a non-human beta monitor user;
- ActionCable `/cable` connection check for Manager realtime;
- Sentry event delivery check in preview before beta.

## Sentry

Expo web and iOS:

- Runtime DSN: `EXPO_PUBLIC_SENTRY_DSN`.
- Trace sample rate: `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.
- Build-time source map upload: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`,
  and the Sentry auth token from CI secrets only.
- The app is safe when DSN is absent; Sentry initialization is skipped.

Backend:

- Runtime DSN: `SENTRY_DSN`.
- Environment: `SENTRY_ENVIRONMENT`.
- Trace sample rate: `SENTRY_TRACES_SAMPLE_RATE`.
- PII default: `SENTRY_SEND_DEFAULT_PII=false`.
- Configure Sentry credentials in hosting secrets, not in git.

Before controlled beta, verify one web event, one iOS event, and one backend
event reach the expected Sentry project without exposing tokens, webhook
signatures, passwords, or raw Booking payloads.

## Safe Logging Rules

Never log:

- Manager bearer tokens;
- `fleexa_manager_session` cookie values;
- Chatwoot `api_access_token`;
- Booking service tokens;
- raw webhook signatures;
- passwords;
- raw request payloads that include renter phone/email or Booking PII;
- full exception traces in Manager API JSON responses.

Allowed production logs:

- request id;
- endpoint name;
- account id only when needed for tenant-scoped operational debugging;
- stable error code;
- class name for unexpected errors;
- idempotency duplicate/conflict outcome without the raw key.

The patched backend includes filter parameters for Manager auth headers,
Booking service tokens, signatures, and booking PII. Any new endpoint must add
its secret-bearing field names to the filter list before beta.

## Backup Checklist

Before beta enablement:

1. Confirm automated PostgreSQL backups are enabled and encrypted.
2. Confirm backup retention covers at least 7 daily points for controlled beta.
3. Confirm the backup includes CRM tables:
   `crm_deals`, `crm_pipeline_stages`, deal activities, field settings,
   Fleexa Manager sessions, Booking credentials, Booking audits, and
   idempotency tables.
4. Confirm Active Storage files are backed up if attachments are part of the
   beta flow.
5. Record restore owner, escalation contact, and storage location.
6. Run one restore drill into a non-production environment.
7. Verify restored Manager API can complete:
   login, conversations, messages, linked deal, pipeline stages, and deal move.

## Restore Checklist

1. Stop writes or put the beta account in maintenance mode.
2. Snapshot the current broken state before restore.
3. Restore PostgreSQL to a new database or recovery instance first.
4. Apply the same Chatwoot image and patch chain used by production.
5. Run migrations and verify schema compatibility.
6. Run `make fleexa-manager-rspec` against the restored app path where possible.
7. Run authenticated health check and controlled beta E2E smoke in the restored
   environment.
8. Switch traffic only after the restored environment passes smoke.
9. Keep the pre-restore snapshot until the incident is closed.

## Rollback Checklist

Rollback unit:

- Chatwoot image version;
- Expo web build/version;
- environment variables;
- database migrations and SQL patches.

Procedure:

1. Identify the last known-good commit and image tag.
2. Stop deploy rollout.
3. Revert Expo web build to last known-good static bundle.
4. Revert Chatwoot image to last known-good patched image.
5. Do not roll back database state blindly if migrations have written customer
   data; decide between forward fix, compensating migration, or restore.
6. Clear CDN/browser cache only after the known-good build is live.
7. Run health checks, Rails request specs where available, and the controlled
   beta E2E smoke.
8. Announce beta status and affected flows.

## Beta Stop Conditions

Stop or pause controlled beta if any of these happen:

- cross-account data exposure;
- duplicate outbound messages after retry;
- Manager login/session revocation failure;
- pipeline stage move writes the wrong account or wrong deal;
- Booking sync overwrites newer state;
- backups or restore drill fail;
- Sentry/logs expose secrets or unnecessary PII.
