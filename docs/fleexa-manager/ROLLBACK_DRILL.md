# Fleexa Manager Staging Rollback Drill

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Decision

**DO_NOT_CONTINUE**

Rollback is not proven. The repository still has no real remote staging URL,
deployment environment, staging image registry target, or staging host script.
Therefore there is no live staging version to roll back, no staging health
endpoint to verify, and no safe way to execute login/conversations/chat smoke
against staging.

Production was not touched. `main` was not merged or pushed.

## Version Identification

| Item | Value | Status |
| --- | --- | --- |
| Current deployed staging version | Unknown | Blocked, no staging deployment exists |
| Current source candidate | `27ce468` | From `docs/fleexa-manager/STAGING_RUNBOOK.md` and branch HEAD at inspection |
| Previous known-good candidate | `4ebe450` | Previous local Stage 4 commit, not proven deployed |

`4ebe450` is a rollback source candidate only. It is not a confirmed deployed
staging version because no staging deployment metadata exists.

## Artifact Simulation

Because remote staging is unavailable, only immutable source artifact selection
was simulated. No production or staging runtime was changed.

Generated artifacts:

```text
/tmp/fleexa-manager-rollback-drill/current-27ce468.tar
/tmp/fleexa-manager-rollback-drill/previous-4ebe450.tar
```

Artifact checksums:

```text
6548f03bf910563ea42a840824a3705b8dd9c2e7c617454a7ef21591ecd6b0ce  current-27ce468.tar
1f41c73d395bbc536bc7c79cf6443e3b6e7048a0ffb6bb5a77709195f22b2a40  previous-4ebe450.tar
```

Archive sanity check:

- `current-27ce468.tar` contains `Dockerfile.chatwoot`, `Makefile`,
  `package.json`, and `docs/fleexa-manager/STAGE_4_REVIEW.md`.
- `previous-4ebe450.tar` contains `Dockerfile.chatwoot`, `Makefile`, and
  `package.json`.

This proves only that source artifacts can be selected deterministically. It
does not prove rollback safety.

## Required Rollback Commands Once Staging Exists

These commands are intentionally env-driven and contain no secrets.

```sh
set -eu
: "${FLEEXA_STAGING_DEPLOY_TARGET:?required staging deploy target}"
: "${FLEEXA_STAGING_CURRENT_IMAGE:?required current staging image tag}"
: "${FLEEXA_STAGING_PREVIOUS_IMAGE:?required previous known-good staging image tag}"
: "${FLEEXA_STAGING_MANAGER_WEB_CURRENT:?required current Manager web artifact}"
: "${FLEEXA_STAGING_MANAGER_WEB_PREVIOUS:?required previous Manager web artifact}"

echo "Rollback target: $FLEEXA_STAGING_DEPLOY_TARGET"
echo "Backend image rollback: $FLEEXA_STAGING_CURRENT_IMAGE -> $FLEEXA_STAGING_PREVIOUS_IMAGE"
echo "Manager web rollback: $FLEEXA_STAGING_MANAGER_WEB_CURRENT -> $FLEEXA_STAGING_MANAGER_WEB_PREVIOUS"
```

The actual deploy invocation must be the staging host or CI mechanism once it
exists. It must not target production.

## Rollback Smoke Status

| Verification | Result |
| --- | --- |
| Backend health after rollback | Not run, no staging URL/runtime |
| Manager web health after rollback | Not run, no staging URL/runtime |
| Login after rollback | Not run, no staging URL/runtime |
| Conversations after rollback | Not run, no staging URL/runtime |
| Chat send after rollback | Not run, no staging URL/runtime |

## Forward Restore Smoke Status

| Verification | Result |
| --- | --- |
| Restore staging forward to current candidate | Not run, no staging deploy mechanism |
| Backend health after forward restore | Not run, no staging URL/runtime |
| Manager web health after forward restore | Not run, no staging URL/runtime |
| Login after forward restore | Not run, no staging URL/runtime |
| Conversations after forward restore | Not run, no staging URL/runtime |
| Chat send after forward restore | Not run, no staging URL/runtime |

## Required Before Retry

1. Provision a real remote staging URL.
2. Publish immutable backend image tags for current and previous known-good
   versions.
3. Publish immutable Manager web artifacts for current and previous known-good
   versions.
4. Record staging deployment metadata: backend image tag, Manager web artifact,
   commit SHA, database migration version, and deployment time.
5. Run rollback to previous known-good in staging.
6. Verify backend health, Manager web health, login, conversations, and chat
   send.
7. Restore staging forward to current candidate.
8. Verify the same smoke again.
