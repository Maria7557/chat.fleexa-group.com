# Fleexa Manager Current State Audit

Date: 2026-07-18
Branch: `codex/fleexa-manager-foundation`
Repository: `/Users/Caro/Documents/Chat`

## Executive Summary

Chatwoot remains the operational backoffice/admin shell and the current carrier
for CRM patches. It should not become the long-term manager frontend.

Fleexa Manager should move toward an Expo React Native codebase, web first and
iPhone later, backed by stable domain APIs. The most important near-term
architecture change is to stop letting large Vue screens be the source of truth
for CRM, attribution, and marketing economics behavior.

## Baseline Before Documentation Changes

Initial repository state:

- `git status --short --branch` on `main`: clean, `main...origin/main [ahead 2]`
- Created and switched to `codex/fleexa-manager-foundation`
- Root structure: wrapper repo with `Makefile`, Docker Compose files,
  `chatwoot-patches/`, `docs/`, and `waha-poc/`
- Root package manager files: none found
- Generated Chatwoot build app: `pnpm@10.2.0`, `package.json`,
  `pnpm-lock.yaml`, `Gemfile`, and `Gemfile.lock` in
  `/tmp/fleexa-chatwoot-app-build`

Checks run before editing:

| Check | Result | Notes |
| --- | --- | --- |
| `make crm-patch-check` | Failed baseline | Running Rails container already has CRM model files, e.g. `app/models/crm_pipeline_stage.rb` and `app/models/crm_deal.rb`; `git apply --check` reports files already exist. |
| `make crm-vue-check` | Failed baseline | Running Rails container already has CRM Vue/API files; first failure is `app/javascript/dashboard/api/crmPipeline.js` already exists plus patch conflicts in sidebar/contact panel routes. |
| `make crm-assets-build-host` | Passed | Applies patches to a fresh Chatwoot base image copy and runs Vite production build. Warnings: platform mismatch on Apple Silicon, outdated Browserslist DB, `url.parse()` deprecation, large chunk warnings. |
| `HUSKY=0 npx --yes pnpm@10.2.0 run eslint` in generated app | Failed baseline | `1595 problems`; examples include prettier errors in `app/javascript/dashboard/api/crmPipeline.js` and `app/javascript/shared/components/emoji/EmojiInput.vue`, plus many upstream i18n warnings. |
| Typecheck | Not available | No `typecheck` script found in generated Chatwoot `package.json`. |
| `HUSKY=0 npx --yes pnpm@10.2.0 test` in generated app | Passed | `351` test files and `3492` tests passed. Warnings include missing prosemirror sourcemap, jsdom navigation warnings, and Vue lifecycle warnings. |

These failures are pre-existing baseline failures. This audit change adds only
documentation and should not be treated as the cause.

## Patch Inventory

Chatwoot modifications are carried through `chatwoot-patches/`.

Backend CRM patches include:

- `crm-pipeline-migration.sql`: CRM stages, deals, deal activities, field
  definitions, stage required fields, loss reason options, custom attributes,
  and indexes.
- `crm-models.rb.patch`: CRM ActiveRecord models.
- `crm-controllers.rb.patch`, `crm-routes.rb.patch`: initial CRM controllers
  and route namespace.
- `crm-deal-fields-backend.patch`, `crm-deal-query-backend.patch`,
  `crm-deals-export-backend.patch`, `crm-deal-backfill.patch`: field
  management, server-side filtering/sorting/pagination, CSV export, and
  backfill behavior.
- `crm-marketing-dashboard-config-backend.patch`,
  `crm-marketing-spend-backend.patch`,
  `crm-marketing-monthly-spend-source-backend.patch`,
  `crm-marketing-source-settings-backend.patch`,
  `crm-marketing-source-detection-rules-backend.patch`,
  `crm-marketing-attribution-settings-native-backend.patch`,
  `crm-manual-spend-attribution-sources-backend.patch`,
  `crm-marketing-economics-kpi-layer-backend.patch`: marketing dashboard
  config, spend APIs, attribution defaults/rules, and KPI-related API support.
- `crm-marketing-google-airbyte-backend.patch`,
  `crm-marketing-meta-airbyte-backend.patch`,
  `crm-marketing-source-mapping-backend.patch`: mock Airbyte import tables,
  normalizers, and source mapping resolver.
- `crm-marketing-demo-seed-backend.patch`: demo data seeding task.
- `instagram-human-agent-activity-window.patch`: Instagram reply window behavior.

Frontend CRM patches include:

- `crm-pipeline-vue.patch`: CRM sidebar entry, pipeline route, list/board UI,
  filters, bulk selection, CSV export trigger, and conversation widget link.
- `crm-deal-workspace-vue.patch` plus incremental workspace patches:
  deal detail, conversation shell, tabs, sidebar polish, emoji handling,
  assignee display, source attribution, lead qualification, and field settings.
- `crm-marketing-analytics-vue.patch` plus incremental marketing patches:
  dashboard, widget config, manual spend, source settings, detection rules,
  source visibility, date filters, economics, loss analysis, funnels, demo
  readiness, and meeting polish.
- `fleexa-global-branding-visible-ui.patch` and
  `fleexa-global-branding-vue.patch`: broad visible branding changes across
  Chatwoot dashboard, widget, mailers, manifest, assets, and theme colors.

## CRM Endpoint Map

Current account-scoped routes live under:

`/api/v1/accounts/:account_id/crm`

| Area | Methods | Authorization | Notes |
| --- | --- | --- | --- |
| `pipeline_stages` | `GET /pipeline_stages` | Any account user | Ordered stage list. |
| `pipeline_stages` | `POST /pipeline_stages`, `PATCH /pipeline_stages/:id`, `DELETE /pipeline_stages/:id`, `PATCH /pipeline_stages/:id/reorder` | Account administrator | Stage create/update/delete/reorder. System stages have extra immutability checks. |
| `deals` | `GET /deals`, `GET /deals/:id` | Any account user | Server-side filters, search, sort, pagination, and optional metadata. |
| `deals` | `POST /deals`, `PATCH /deals/:id`, `DELETE /deals/:id`, `GET /deals/export.csv`, `POST /deals/ensure_from_conversation` | Account administrator | Deal writes, CSV export, and conversation-to-deal creation are admin-gated by the current controller. |
| `deal_fields` | `GET /deal_fields`, `POST /deal_fields`, `PATCH /deal_fields/:id`, `DELETE /deal_fields/:id`, `PATCH /deal_fields/stage_requirements` | Account administrator | Field definitions and required-field rules. Even read is admin-only. |
| `marketing_dashboard` | `GET /marketing_dashboard`, `GET /marketing_dashboard/spend`, `GET /marketing_dashboard/monthly_spend` | Any account user | Dashboard config and spend aggregation reads. |
| `marketing_dashboard` | `PATCH /marketing_dashboard`, `GET /marketing_dashboard/manual_spend_entries`, `POST /marketing_dashboard/manual_spend_entries`, `PATCH /marketing_dashboard/manual_spend_entries/:id` | Account administrator | Dashboard config and manual spend management. Manual spend list is admin-only today. |
| `loss_reasons` | `GET /loss_reasons`, `POST /loss_reasons`, `PATCH /loss_reasons/:id` | Account administrator | Loss reason option management. Even read is admin-only. |

## Current Data And Domain Ownership

Current durable data is still inside the Chatwoot database:

- `crm_pipeline_stages`
- `crm_deals`
- `crm_deal_field_definitions`
- `crm_pipeline_stage_required_fields`
- `crm_deal_activities`
- `crm_loss_reason_options`
- `manual_spend_entries`
- `marketing_spend_daily`
- `airbyte_google_ads_daily_spend_mock`
- `airbyte_meta_ads_daily_spend_mock`
- `marketing_source_mappings`
- account settings key `crm_marketing_dashboard`

Backend logic already owns some important behavior:

- deal query filtering, search, sort, pagination, and export CSV generation
- deal required-field validation on stage movement
- dashboard config normalization for widgets, traffic sources, lead origins,
  and detection rules
- spend date ranges and spend/monthly spend aggregation
- manual spend normalization into `marketing_spend_daily`
- source mapping and mock Airbyte normalization

However, significant business logic still lives in Vue screens.

## Manager UI Areas In Chatwoot

Current CRM UI is concentrated in three very large Vue surfaces in the generated
Chatwoot app:

- `MarketingAnalytics.vue`: 4361 lines
- `Pipeline.vue`: 3062 lines
- `DealWorkspace.vue`: 2269 lines

These are tightly coupled to Chatwoot dashboard routing, Vue composition state,
Chatwoot API clients, local browser state, and Tailwind/Dashboard component
assumptions. They are useful as current backoffice surfaces, but they should not
be treated as the portable product foundation for Fleexa Manager.

## Frontend Business Logic To Move Out

The following logic should move toward backend/domain APIs before or while it is
rebuilt in Expo:

- marketing KPI math: leads, qualified leads, successful deals, revenue,
  CPL/CPLQ, conversion rates, ROAS, and source economics
- attribution matching and display: traffic source, lead origin, detection
  method, fallback priority, source clarification, and source filter behavior
- lead trend, monthly spend/revenue chart rows, and source series generation
- loss reason summaries and manager performance calculations
- stage reach and funnel transitions
- stage/field requirement interpretation that affects whether a deal can move
- export semantics and exact CSV contract
- default attribution config cloning/normalization duplicated in Vue
- list column preferences and filter query hydration that should not become
  canonical product state

The UI may keep presentation-level transforms, but API responses should carry
the stable normalized facts and metrics that Expo web/native screens render.

## Admin-Only API Considerations

Current authorization is mostly coarse:

- read-only deal and marketing dashboard reads are available to any account user
- most writes require `Current.account_user.administrator?`
- some reads that feel product-facing, such as `deal_fields`,
  `loss_reasons`, and manual spend entries, are admin-only
- CSV export is admin-only because it falls under `check_write_authorization`
  in the deals controller

For Fleexa Manager, define role capabilities explicitly instead of inheriting
Chatwoot administrator semantics. Likely future roles include operator,
manager, marketing/admin, and owner. The API should expose only the data each
role needs and should not require Expo screens to infer permissions from
Chatwoot UI conventions.

## Key Risks

- Patch chain fragility: many incremental patches target the same Vue files and
  can become difficult to rebase across Chatwoot upgrades.
- Running-container checks are misleading once patches are already installed:
  `git apply --check` fails because files already exist, even though the clean
  host build still succeeds.
- The analytics surface is too large and too stateful for mobile reuse.
- Marketing metrics are partly backend-supported but still heavily assembled in
  the frontend, making numbers easier to drift between Chatwoot and Manager.
- `custom_attributes` is flexible but currently carries canonical CRM and
  attribution data without a strong typed API contract.
- Branding patches touch many unrelated Chatwoot files and increase upgrade
  blast radius.
- Admin-only behavior is not aligned with future Manager roles.
- Mock Airbyte tables and seed tasks are useful for demos, but they should not
  be mistaken for production integration boundaries.

## What Stays In Chatwoot

Keep Chatwoot focused on:

- inboxes, conversations, contacts, message history, and operator backoffice
  workflows
- admin/settings screens needed to operate the legacy shell
- emergency CRM visibility while Fleexa Manager is being built
- patched Instagram human-agent reply-window behavior
- broad Chatwoot branding required for the current deployment
- existing patch-based durability until the custom image strategy changes

Chatwoot may continue to host temporary CRM pages, but it should not be the
place where new manager product behavior is designed.

## What Moves Toward Fleexa Manager

Move or prepare to move these surfaces into the Expo Manager product:

- daily manager/operator CRM workspace
- pipeline board and list views
- deal detail workspace and task-oriented deal editing
- attribution setup and source clarification workflows
- marketing analytics and economics dashboards
- manager performance, loss analysis, and funnel reporting
- field definitions and stage requirement management once API contracts are
  stable
- import/source mapping operations once production integrations are defined

The migration should be API-first: extract stable domain responses first, then
build Expo screens against those responses. Avoid a direct Vue-to-Expo port that
copies frontend business logic.

## Recommended Foundation Path

1. Define a versioned Fleexa Manager API boundary for CRM, marketing analytics,
   attribution, and permissions.
2. Move KPI, attribution, funnel, loss, and manager performance calculations
   into backend services with testable inputs and outputs.
3. Add contract tests or documented JSON examples for the manager-facing API.
4. Keep Chatwoot Vue pages consuming the same backend facts where feasible, so
   old and new UIs do not diverge.
5. Create Expo web screens only after the API shape is stable enough to support
   iPhone without a rewrite.
