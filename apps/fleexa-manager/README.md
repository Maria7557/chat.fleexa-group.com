# Fleexa Manager Expo App

Fleexa Manager is the future manager frontend: Expo React Native, web first and
iPhone later from the same codebase.

## Environment

Copy values from `.env.example` into a local env file or export them before
running Expo.

- `EXPO_PUBLIC_FLEEXA_APP_ENV`: `development`, `preview`, or `production`
- `EXPO_PUBLIC_FLEEXA_API_MODE`: `live` or `mock`
- `EXPO_PUBLIC_FLEEXA_API_DRIVER`: `manager` or `chatwoot`
- `EXPO_PUBLIC_FLEEXA_API_BASE_URL`: Manager API base path ending in
  `/api/fleexa-manager/v1`
- `EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID`: required only for the local
  Chatwoot driver
- `EXPO_PUBLIC_SENTRY_DSN`: optional runtime Sentry DSN
- `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`: optional number from `0` to `1`

Mock mode is only for UI development. It is rejected when
`EXPO_PUBLIC_FLEEXA_APP_ENV=production` and cannot satisfy production acceptance
criteria.

For Stage 2 Manager API live mode, use `EXPO_PUBLIC_FLEEXA_API_DRIVER=manager`
and point `EXPO_PUBLIC_FLEEXA_API_BASE_URL` at `/api/fleexa-manager/v1`. This is
the default live path and the only route that can satisfy production acceptance.
Until Manager-owned session endpoints exist, the token field accepts an existing
Chatwoot user access token and sends it as `Authorization: Bearer ...`.

The legacy `EXPO_PUBLIC_FLEEXA_API_DRIVER=chatwoot` adapter still exists for
local development against raw Chatwoot `/api/v1` routes:
`EXPO_PUBLIC_FLEEXA_API_MODE=live`,
`EXPO_PUBLIC_FLEEXA_API_BASE_URL=http://localhost:3000`, and
`EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID=1`. It is rejected in production config
and must not be used for live acceptance.

## Scripts

- `npm --workspace @fleexa/manager run validate:env`
- `npm --workspace @fleexa/manager run typecheck`
- `npm --workspace @fleexa/manager run web`
- `npm --workspace @fleexa/manager run smoke:web`
