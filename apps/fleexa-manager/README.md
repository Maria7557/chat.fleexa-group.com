# Fleexa Manager Expo App

Fleexa Manager is the future manager frontend: Expo React Native, web first and
iPhone later from the same codebase.

## Environment

Copy values from `.env.example` into a local env file or export them before
running Expo.

- `EXPO_PUBLIC_FLEEXA_APP_ENV`: `development`, `preview`, or `production`
- `EXPO_PUBLIC_FLEEXA_API_MODE`: `live` or `mock`
- `EXPO_PUBLIC_FLEEXA_API_BASE_URL`: Manager API base path
- `EXPO_PUBLIC_SENTRY_DSN`: optional runtime Sentry DSN
- `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`: optional number from `0` to `1`

Mock mode is only for UI development. It is rejected when
`EXPO_PUBLIC_FLEEXA_APP_ENV=production` and cannot satisfy production acceptance
criteria.

## Scripts

- `npm --workspace @fleexa/manager run validate:env`
- `npm --workspace @fleexa/manager run typecheck`
- `npm --workspace @fleexa/manager run web`
- `npm --workspace @fleexa/manager run smoke:web`
