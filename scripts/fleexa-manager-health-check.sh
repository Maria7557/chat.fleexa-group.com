#!/usr/bin/env sh
set -eu

API_BASE_URL=${FLEEXA_MANAGER_HEALTH_API_BASE_URL:-http://localhost:3000/api/fleexa-manager/v1}
ORIGIN=${FLEEXA_MANAGER_HEALTH_ORIGIN:-http://127.0.0.1:8082}
TOKEN=${FLEEXA_MANAGER_HEALTH_BEARER_TOKEN:-}

request() {
  method=$1
  path=$2
  output_file=$3
  shift 3

  curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$API_BASE_URL$path" "$@"
}

assert_status() {
  actual=$1
  expected=$2
  label=$3

  if [ "$actual" != "$expected" ]; then
    echo "$label failed: expected HTTP $expected, got HTTP $actual"
    exit 1
  fi
}

tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/fleexa-manager-health.XXXXXX")
trap 'rm -rf "$tmp_dir"' EXIT

preflight_status=$(request OPTIONS /session/current "$tmp_dir/preflight.json" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization")
assert_status "$preflight_status" "204" "Manager API preflight"

if [ -n "$TOKEN" ]; then
  current_status=$(request GET /session/current "$tmp_dir/current.json" \
    -H "Authorization: Bearer $TOKEN")
  assert_status "$current_status" "200" "Manager API authenticated session/current"
else
  current_status=$(request GET /session/current "$tmp_dir/current.json")
  assert_status "$current_status" "401" "Manager API unauthenticated session/current"

  if ! grep -q '"code":"unauthenticated"' "$tmp_dir/current.json"; then
    echo "Manager API unauthenticated session/current failed: missing stable unauthenticated error code"
    exit 1
  fi
fi

echo "Fleexa Manager health check passed"
