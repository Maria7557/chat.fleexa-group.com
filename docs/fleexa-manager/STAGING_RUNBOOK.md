# Fleexa Manager Remote Staging Runbook

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`
Current local candidate commit: `5726f12`

## Current Status

Decision: **DO_NOT_CONTINUE** for controlled beta staging validation.

Reason: no real remote staging URL or isolated staging runtime is configured in
this repository or GitHub project yet. Local-only staging is not enough for
controlled beta readiness.

Evidence checked:

- `git remote -v` points to `origin`
  `https://github.com/Maria7557/chat.fleexa-group.com.git`.
- Local branch `codex/fleexa-manager-stage-4-hardening` is ahead of `origin` by
  one docs-only blocker commit, `5726f12`.
- `git ls-remote --heads origin codex/fleexa-manager-stage-4-hardening main`
  shows the remote feature branch at `27ce468` and `main` unchanged at
  `6af8928`; remote does not yet contain local blocker-doc commit `5726f12`.
- GitHub repo metadata has default branch `main`.
- GitHub environments API returned no configured environments.
- `gh workflow list` and `gh run list --branch
  codex/fleexa-manager-stage-4-hardening --limit 5` returned no remote
  workflows/runs.
- GitHub auth is available for repo/workflow access, but no staging
  environment, deployment target, runner workflow, secrets, or environment
  protection exists in the repository.
- Docker contexts are local only: Docker Desktop/default Unix sockets. No remote
  Docker context or registry target is configured.
- `kubectl` is installed but has no current context, clusters, auth info, or
  namespaces configured.
- Common cloud/deploy CLIs are not available in this environment:
  `aws`, `gcloud`, `az`, `doctl`, `flyctl`, `heroku`, `railway`, `render`,
  `dokku`, and `kamal`.
- No staging-related environment variable names are present in the local shell.
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

Chosen method for this pass: **no remote delivery used**.

Why: pushing the feature branch alone would update source code on GitHub, but it
would not create a staging URL, isolated database, isolated Redis, WSS
ActionCable endpoint, deployment environment, registry image, or health checks.
Since no remote staging consumer exists yet, branch push is not enough to
advance controlled beta validation.

Once real staging infrastructure exists, the safest source delivery method is to
push only `codex/fleexa-manager-stage-4-hardening` to `origin` and build
staging from that branch or an immutable image tag. Never force push this branch
for staging validation. Use a new commit instead.

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

   Status: not run in this pass. The remote feature branch currently points to
   `27ce468`; the local candidate is `5726f12`. Push `5726f12` only after a
   real remote staging mechanism is ready to consume the branch.

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

## Missing Access And Infrastructure Checklist

Controlled beta staging cannot be provisioned from this checkout until these
items exist outside the repository:

1. DNS/domain access for a dedicated staging host, for example
   `staging.chat.fleexa-group.com`.
2. HTTPS/TLS termination for that staging host.
3. A remote runtime target, such as a VM, Kubernetes cluster, PaaS app, or
   container hosting service, explicitly marked staging.
4. A safe deployment mechanism for the patched Chatwoot backend from this
   branch or an immutable staging image tag.
5. A safe deployment mechanism for the Expo Manager web artifact from this
   branch.
6. Isolated staging PostgreSQL host, database name, user, password, and backup
   access. The database must not be production or a writable production replica.
7. Isolated staging Redis host/database index for Rails cache, Sidekiq, and
   ActionCable.
8. WSS-capable ActionCable routing for `/cable`.
9. Staging secret store or GitHub `staging` environment secrets for Rails,
   Postgres, Redis, Manager web, Sentry, and monitor credentials.
10. Staging-only storage bucket/path or isolated local volume for Chatwoot
    uploads.
11. Staging monitor Manager account/session for authenticated health checks.
12. Explicit proof that Booking receiver is default-off in staging and that no
    production Booking credentials are present.
13. Rollback target metadata: current backend image, previous known-good backend
    image, current Manager web artifact, and previous known-good Manager web
    artifact.

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
