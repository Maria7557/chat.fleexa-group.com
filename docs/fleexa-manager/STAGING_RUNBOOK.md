# Fleexa Manager Remote Staging Runbook

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`
Candidate commit: `27ce468`

## Current Status

Decision: **DO_NOT_CONTINUE** for controlled beta staging validation.

Reason: no real remote staging URL or isolated staging runtime is configured in
this repository or GitHub project yet. Local-only staging is not enough for
controlled beta readiness.

Evidence checked:

- `git remote -v` points to `origin`
  `https://github.com/Maria7557/chat.fleexa-group.com.git`.
- `git push -u origin codex/fleexa-manager-stage-4-hardening` published only
  this feature branch as the staging candidate.
- `git ls-remote --heads origin codex/fleexa-manager-stage-4-hardening main`
  shows the feature branch at `27ce468` and `main` unchanged at `6af8928`.
- GitHub repo metadata has default branch `main`.
- GitHub environments API returned no configured environments.
- `gh workflow list` and `gh run list --branch
  codex/fleexa-manager-stage-4-hardening --limit 5` returned no remote
  workflows/runs.
- Repository deploy files are limited to local Docker/Makefile flows:
  `Dockerfile.chatwoot`, `docker-compose.local.yml`,
  `docker-compose.chatwoot-override.yml`, and `Makefile`.
- Existing docs reference production `https://chat.fleexa-group.com` and WAHA
  `https://waha.fleexa-group.com`; no staging URL is documented.
- DNS/curl checks for likely staging hostnames did not resolve:
  `staging.chat.fleexa-group.com`, `chat-staging.fleexa-group.com`,
  `beta.chat.fleexa-group.com`, `manager-staging.fleexa-group.com`, and
  `staging-manager.fleexa-group.com`.

## Safe Delivery Method

Chosen method: **push only
`codex/fleexa-manager-stage-4-hardening` to `origin`**.

Why: branch push is the smallest reversible remote candidate. It does not merge
`main`, does not push `main`, does not deploy production, does not overwrite a
registry image, and does not enable Booking receiver.

Never force push this branch for staging validation. Use a new commit instead.

## Required Remote Staging Shape

Remote staging must be production-like but isolated:

| Component | Requirement |
| --- | --- |
| Staging URL | Dedicated HTTPS URL, for example `https://staging.chat.fleexa-group.com`. |
| Manager web | Expo web build served with `EXPO_PUBLIC_FLEEXA_API_DRIVER=manager`. |
| Chat backend | Patched Chatwoot image built from this branch or immutable staging tag. |
| Database | Dedicated PostgreSQL database, not production and not a production replica with writes enabled. |
| Redis | Dedicated Redis instance or isolated Redis database index for staging. |
| ActionCable | `/cable` reachable over WSS and account-scoped Manager channel works. |
| Storage | Dedicated staging Active Storage bucket/path or isolated local volume. |
| Secrets | Managed by host/CI secret store only; none committed to the repo. |
| Booking receiver | Disabled by default; production Booking receiver must not be enabled. |
| Health checks | Anonymous and authenticated Manager API checks plus web and cable checks. |

## Required Environment Variables

The required remote staging environment variable names are defined in
`docs/.env.example` with placeholders only. Put real values in the staging host
or CI secret store, not in git.

Do not set `EXPO_PUBLIC_FLEEXA_API_MODE=mock` for staging acceptance. Do not set
`EXPO_PUBLIC_FLEEXA_API_DRIVER=chatwoot` for staging acceptance.

## Deployment Candidate Steps

1. Run the full local gate:

   ```sh
   npm run lint
   npm run typecheck
   npm test
   make fleexa-manager-rspec
   npm run smoke:web
   npm run openapi:check
   git diff --check
   ```

2. Push only the feature branch:

   ```sh
   git push -u origin codex/fleexa-manager-stage-4-hardening
   ```

   Status: completed for candidate commit `27ce468`.

3. Build staging from the branch using one of these future remote mechanisms:

   - GitHub Actions workflow bound to a `staging` environment;
   - immutable image tag such as
     `fleexa-chatwoot:stage4-27ce468-staging`;
   - existing host deploy script once documented.

4. Apply SQL patches only to the isolated staging database.
5. Start isolated staging Redis.
6. Start patched Chatwoot Rails and Sidekiq against staging DB/Redis.
7. Serve Expo Manager web against the staging Manager API URL.

## Verification Checklist

Backend health:

```sh
FLEEXA_MANAGER_HEALTH_API_BASE_URL=https://<staging-host>/api/fleexa-manager/v1 \
FLEEXA_MANAGER_HEALTH_ORIGIN=https://<staging-host> \
npm run health:manager
```

Manager web health:

- `GET https://<staging-host>/login` returns a Manager web shell.
- Expo runtime config reports `preview`, `live API`, and Manager API driver.
- Production mock mode is not active.

Database isolation:

- `POSTGRES_DB` is a staging database name.
- Database host is not production.
- A staging-only marker row or account exists and is absent from production.
- Writes during E2E smoke do not appear in production.

Redis/ActionCable:

- Redis URL points to staging Redis.
- `/cable` upgrades over WSS.
- Manager ActionCable subscription accepts own account.
- Wrong-account subscription is rejected.

Booking receiver:

- Booking sync feature flag defaults to disabled.
- No production Booking credentials are present in staging.
- Production Booking receiver remains unchanged.

## Current Blockers

1. No real remote staging URL exists yet.
2. No isolated staging PostgreSQL/Redis is documented or provisioned.
3. No remote deployment workflow, staging environment, registry target, or host
   script is present in the repo.
4. No authenticated staging monitor user is available.
5. iOS simulator validation remains blocked until a machine with full Xcode and
   `simctl` runs the smoke.

Until these are closed, controlled beta validation must remain
`DO_NOT_CONTINUE`.

## Latest Local Gate Results

Run on 2026-07-19 from branch `codex/fleexa-manager-stage-4-hardening`:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 4 files and 29 tests |
| `make fleexa-manager-rspec` | Passed, 109 examples and 0 failures |
| `npm run smoke:web` | Passed, Expo web export completed |
| `npm run openapi:check` | Passed, OpenAPI YAML parsed |
| `git diff --check` | Passed |

Remote staging verification was not possible because no remote staging URL,
isolated database, isolated Redis, or ActionCable endpoint exists yet.
