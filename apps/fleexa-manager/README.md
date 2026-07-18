# Fleexa Manager Expo App

Fleexa Manager is the future manager frontend: Expo React Native, web first and
iPhone later from the same codebase.

## Environment

Copy values from `.env.example` into a local env file or export them before
running Expo.

- `EXPO_PUBLIC_FLEEXA_APP_ENV`: `development`, `preview`, or `production`
- `EXPO_PUBLIC_FLEEXA_API_MODE`: `live` or `mock`
- `EXPO_PUBLIC_FLEEXA_API_DRIVER`: `manager` or `chatwoot`
- `EXPO_PUBLIC_FLEEXA_API_BASE_URL`: Manager API base path
- `EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID`: required only for the local
  Chatwoot driver
- `EXPO_PUBLIC_SENTRY_DSN`: optional runtime Sentry DSN
- `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`: optional number from `0` to `1`

Mock mode is only for UI development. It is rejected when
`EXPO_PUBLIC_FLEEXA_APP_ENV=production` and cannot satisfy production acceptance
criteria.

For the real local Chatwoot vertical slice, use `EXPO_PUBLIC_FLEEXA_API_MODE=live`,
`EXPO_PUBLIC_FLEEXA_API_DRIVER=chatwoot`,
`EXPO_PUBLIC_FLEEXA_API_BASE_URL=http://localhost:3000`, and
`EXPO_PUBLIC_FLEEXA_CHATWOOT_ACCOUNT_ID=1`. The login token is the Chatwoot
`api_access_token`, not a Manager bearer token.

## Scripts

- `npm --workspace @fleexa/manager run validate:env`
- `npm --workspace @fleexa/manager run typecheck`
- `npm --workspace @fleexa/manager run web`
- `npm --workspace @fleexa/manager run smoke:web`
