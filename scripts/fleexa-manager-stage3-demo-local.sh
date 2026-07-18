#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.local.yml}"
ENV_FILE="${ENV_FILE:-.env.local}"
RAILS_SERVICE="${FLEEXA_MANAGER_RAILS_SERVICE:-rails}"
REMOTE_SCRIPT="/tmp/fleexa_manager_stage3_demo_seed.rb"

if [ ! -f "$ROOT_DIR/$ENV_FILE" ]; then
  echo "$ENV_FILE is missing. Run make setup or set ENV_FILE." >&2
  exit 1
fi

compose=(docker compose --env-file "$ROOT_DIR/$ENV_FILE" -f "$ROOT_DIR/$COMPOSE_FILE")

"${compose[@]}" cp "$ROOT_DIR/scripts/fleexa_manager_stage3_demo_seed.rb" "$RAILS_SERVICE:$REMOTE_SCRIPT"
"${compose[@]}" exec -T -e RAILS_LOG_LEVEL=warn "$RAILS_SERVICE" sh -lc "cd /app && bundle exec rails runner $REMOTE_SCRIPT"
