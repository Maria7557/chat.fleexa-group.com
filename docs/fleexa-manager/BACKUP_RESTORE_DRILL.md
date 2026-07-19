# Fleexa Manager Staging Backup Restore Drill

Date: 2026-07-19
Branch: `codex/fleexa-manager-stage-4-hardening`

## Decision

**DO_NOT_CONTINUE**

The backup/restore drill was not executed because no staging PostgreSQL database
is identified in this repository, environment, or staging runbook. This stage is
staging-only, so localhost and production were not used as substitutes.

## Staging Database Identification

Source checked: `docs/fleexa-manager/STAGING_RUNBOOK.md`

Result: no real staging database host, database name, username, or connection
URL is documented. The runbook explicitly lists missing isolated staging
PostgreSQL/Redis as a current blocker.

Local env presence check:

| Env var | Status |
| --- | --- |
| `STAGING_DATABASE_URL` | unset |
| `FLEEXA_STAGING_DATABASE_URL` | unset |
| `DATABASE_URL` | unset |
| `POSTGRES_HOST` | unset |
| `POSTGRES_DB` | unset |
| `POSTGRES_USERNAME` | unset |
| `POSTGRES_PASSWORD` | unset |

## Safe Backup Command

Use only against the isolated staging database. Do not run this command with
production credentials.

```sh
set -eu
: "${FLEEXA_STAGING_DB_HOST:?required staging host}"
: "${FLEEXA_STAGING_DB_NAME:?required staging database name}"
: "${FLEEXA_STAGING_DB_USER:?required staging user}"
: "${FLEEXA_STAGING_DB_PASSWORD:?required staging password}"

case "$FLEEXA_STAGING_DB_NAME" in
  *staging*|*stage*|*preview*) ;;
  *) echo "Refusing backup: database name does not look like staging" >&2; exit 1 ;;
esac

mkdir -p backups/staging
PGPASSWORD="$FLEEXA_STAGING_DB_PASSWORD" pg_dump \
  --host "$FLEEXA_STAGING_DB_HOST" \
  --port "${FLEEXA_STAGING_DB_PORT:-5432}" \
  --username "$FLEEXA_STAGING_DB_USER" \
  --format custom \
  --no-owner \
  --no-privileges \
  --file "backups/staging/fleexa-manager-staging-$(date -u +%Y%m%dT%H%M%SZ).dump" \
  "$FLEEXA_STAGING_DB_NAME"
```

## Safe Restore Command

Restore only into a separate isolated restore database/container. Never restore
over staging or production.

```sh
set -eu
: "${FLEEXA_RESTORE_DB_HOST:?required restore host}"
: "${FLEEXA_RESTORE_DB_NAME:?required restore database name}"
: "${FLEEXA_RESTORE_DB_USER:?required restore user}"
: "${FLEEXA_RESTORE_DB_PASSWORD:?required restore password}"
: "${FLEEXA_BACKUP_FILE:?required backup file}"

case "$FLEEXA_RESTORE_DB_NAME" in
  *restore*|*drill*|*tmp*) ;;
  *) echo "Refusing restore: database name does not look isolated" >&2; exit 1 ;;
esac

PGPASSWORD="$FLEEXA_RESTORE_DB_PASSWORD" pg_restore \
  --host "$FLEEXA_RESTORE_DB_HOST" \
  --port "${FLEEXA_RESTORE_DB_PORT:-5432}" \
  --username "$FLEEXA_RESTORE_DB_USER" \
  --dbname "$FLEEXA_RESTORE_DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$FLEEXA_BACKUP_FILE"
```

## Verification Query

This query returns counts only. It does not expose booking service
`token_digest` values.

```sh
set -eu
: "${FLEEXA_RESTORE_DB_HOST:?required restore host}"
: "${FLEEXA_RESTORE_DB_NAME:?required restore database name}"
: "${FLEEXA_RESTORE_DB_USER:?required restore user}"
: "${FLEEXA_RESTORE_DB_PASSWORD:?required restore password}"

PGPASSWORD="$FLEEXA_RESTORE_DB_PASSWORD" psql \
  --host "$FLEEXA_RESTORE_DB_HOST" \
  --port "${FLEEXA_RESTORE_DB_PORT:-5432}" \
  --username "$FLEEXA_RESTORE_DB_USER" \
  --dbname "$FLEEXA_RESTORE_DB_NAME" \
  --tuples-only \
  --no-align \
  --command "
    SELECT 'accounts', COUNT(*) FROM accounts
    UNION ALL SELECT 'users', COUNT(*) FROM users
    UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
    UNION ALL SELECT 'messages', COUNT(*) FROM messages
    UNION ALL SELECT 'crm_deals', COUNT(*) FROM crm_deals
    UNION ALL SELECT 'booking_credentials', COUNT(*) FROM fleexa_manager_booking_credentials
    ORDER BY 1;
  "
```

Expected evidence format:

```text
accounts|<count>
booking_credentials|<count>
conversations|<count>
crm_deals|<count>
messages|<count>
users|<count>
```

## Drill Results

| Required proof | Result |
| --- | --- |
| Identify staging Postgres database | Blocked, no staging DB is documented or configured |
| Backup command works | Not run, no staging DB |
| Restore command works into isolated DB | Not run, no staging backup/restore DB |
| Verification query works | Not run, no isolated restore DB |
| Booking credential safety | Query is count-only and does not select `token_digest` |

## Required Before Retry

1. Provision a remote staging PostgreSQL database whose name clearly contains
   `staging`, `stage`, or `preview`.
2. Provision a separate restore-drill database/container whose name clearly
   contains `restore`, `drill`, or `tmp`.
3. Store credentials only in the staging host or CI secret store.
4. Run the backup and restore commands above.
5. Save count-only verification output in this file.
6. Delete the isolated restore database/container after the drill.
