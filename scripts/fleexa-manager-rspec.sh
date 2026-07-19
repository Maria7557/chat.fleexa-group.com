#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

ENV_FILE=${CHATWOOT_ENV_FILE:-.env.local}
BASE_IMAGE=${CHATWOOT_BASE_IMAGE:-chatwoot/chatwoot:v4.14.2}
RSPEC_IMAGE=${CHATWOOT_RSPEC_IMAGE:-fleexa-chatwoot:v4.14.2-patch1-rspec}
TMP_APP=${CHATWOOT_RSPEC_APP_DIR:-/tmp/fleexa-chatwoot-rspec-app}
SUPPORT_DIR=${CHATWOOT_TEST_SUPPORT_DIR:-/tmp/chatwoot-v4.14.2-test-support}
TEST_DB=${CHATWOOT_TEST_DB:-chatwoot_test}
TEST_NETWORK=${CHATWOOT_TEST_NETWORK:-fleexa-chatwoot-local_default}

test -f "$ENV_FILE" || {
  echo "$ENV_FILE is missing. Run: make setup"
  exit 1
}

if [ ! -d "$SUPPORT_DIR/.git" ]; then
  rm -rf "$SUPPORT_DIR"
  git clone --filter=blob:none --sparse --depth 1 --branch v4.14.2 \
    https://github.com/chatwoot/chatwoot.git "$SUPPORT_DIR"
  git -C "$SUPPORT_DIR" sparse-checkout set spec
  git -C "$SUPPORT_DIR" checkout HEAD -- .rspec
fi

test -d "$SUPPORT_DIR/spec" || git -C "$SUPPORT_DIR" sparse-checkout set spec
test -f "$SUPPORT_DIR/.rspec" || git -C "$SUPPORT_DIR" checkout HEAD -- .rspec

rm -rf "$TMP_APP"
mkdir -p "$TMP_APP"
copy_container="fleexa-chatwoot-rspec-copy-$$"
docker create --platform linux/amd64 --name "$copy_container" "$BASE_IMAGE" sh >/dev/null
trap 'docker rm -f "$copy_container" >/dev/null 2>&1 || true' EXIT
docker cp "$copy_container:/app/." "$TMP_APP"
docker rm -f "$copy_container" >/dev/null
trap - EXIT

cp -R "$SUPPORT_DIR/spec" "$TMP_APP/spec"
cp "$SUPPORT_DIR/.rspec" "$TMP_APP/.rspec"

PATCHES="
instagram-human-agent-activity-window.patch
crm-models.rb.patch
crm-controllers.rb.patch
crm-routes.rb.patch
crm-ensure-from-conversation.patch
crm-webhook-listener.patch
crm-deal-fields-backend.patch
crm-deal-query-backend.patch
crm-deals-export-backend.patch
crm-deal-backfill.patch
crm-marketing-dashboard-config-backend.patch
crm-marketing-spend-backend.patch
crm-marketing-google-airbyte-backend.patch
crm-marketing-meta-airbyte-backend.patch
crm-marketing-source-mapping-backend.patch
crm-marketing-monthly-spend-source-backend.patch
crm-marketing-source-settings-backend.patch
crm-marketing-source-detection-rules-backend.patch
crm-marketing-attribution-settings-native-backend.patch
crm-manual-spend-attribution-sources-backend.patch
crm-marketing-economics-kpi-layer-backend.patch
crm-marketing-demo-seed-backend.patch
fleexa-manager-chat-api-backend.patch
fleexa-manager-conversation-filters-backend.patch
fleexa-manager-linked-deal-backend.patch
fleexa-manager-pipeline-api-backend.patch
fleexa-manager-booking-sync-foundation-backend.patch
fleexa-manager-booking-sync-logic-backend.patch
fleexa-manager-security-rate-limits-backend.patch
fleexa-manager-session-strategy-backend.patch
fleexa-manager-concurrency-safety-backend.patch
fleexa-manager-realtime-backend.patch
"

for patch_file in $PATCHES; do
  patch -d "$TMP_APP" -p1 --forward < "chatwoot-patches/$patch_file" >/tmp/fleexa-manager-rspec-patch.log
done

if ! docker image inspect "$RSPEC_IMAGE" >/dev/null 2>&1; then
  docker build --platform linux/amd64 \
    --build-arg CHATWOOT_BASE_IMAGE="$BASE_IMAGE" \
    -t "$RSPEC_IMAGE" - <<'DOCKERFILE'
ARG CHATWOOT_BASE_IMAGE
FROM ${CHATWOOT_BASE_IMAGE}
ENV RAILS_ENV=test RACK_ENV=test NODE_ENV=test
RUN cd /app && bundle config set without "" && bundle install --jobs=4 --retry=2
DOCKERFILE
fi

docker compose --env-file "$ENV_FILE" -f docker-compose.local.yml up -d postgres redis

docker run --rm --platform linux/amd64 \
  --network "$TEST_NETWORK" \
  --env-file "$ENV_FILE" \
  -e RAILS_ENV=test \
  -e RACK_ENV=test \
  -e NODE_ENV=test \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB="$TEST_DB" \
  -e REDIS_URL=redis://redis:6379/1 \
  -e SECRET_KEY_BASE=test_secret_key_base_for_fleexa_manager_rspec \
  -v "$TMP_APP:/app" \
  -v "$ROOT_DIR:/workspace:ro" \
  "$RSPEC_IMAGE" sh -lc '
set -eu
cd /app
export POSTGRES_USERNAME="${POSTGRES_USERNAME:-chatwoot}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-chatwoot_dev_password}"
bundle check
bundle exec rails db:drop db:create db:schema:load
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" -d "$POSTGRES_DB" -f /workspace/chatwoot-patches/crm-pipeline-migration.sql >/tmp/crm-pipeline-migration.log
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" -d "$POSTGRES_DB" -f /workspace/chatwoot-patches/fleexa-manager-booking-sync-foundation.sql >/tmp/fleexa-manager-booking-sync-foundation.log
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" -d "$POSTGRES_DB" -f /workspace/chatwoot-patches/fleexa-manager-sessions.sql >/tmp/fleexa-manager-sessions.log
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" -d "$POSTGRES_DB" -f /workspace/chatwoot-patches/fleexa-manager-concurrency-safety.sql >/tmp/fleexa-manager-concurrency-safety.log
bundle exec rspec \
  spec/requests/api/fleexa_manager/v1/chat_api_spec.rb \
  spec/requests/api/fleexa_manager/v1/booking_sync_foundation_spec.rb \
  spec/requests/api/fleexa_manager/v1/booking_sync_logic_spec.rb \
  spec/requests/api/fleexa_manager/v1/security_rate_limits_spec.rb \
  spec/requests/api/fleexa_manager/v1/session_strategy_spec.rb \
  spec/channels/fleexa_manager/v1/realtime_channel_spec.rb \
  spec/services/fleexa_manager/v1/realtime_broadcaster_spec.rb \
  --format documentation
'
