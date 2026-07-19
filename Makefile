COMPOSE_FILE := docker-compose.local.yml
ENV_FILE := .env.local
COMPOSE := docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)
COMPOSE_NO_ENV := docker compose -f $(COMPOSE_FILE)
CHATWOOT_BASE_IMAGE := chatwoot/chatwoot:v4.14.2
CHATWOOT_LOCAL_IMAGE := fleexa-chatwoot:v4.14.2-patch1
CRM_ASSETS_BUILD_DIR := /tmp/fleexa-chatwoot-app-build

.PHONY: setup up down logs migrate seed shell verify-patch ensure-env crm-apply crm-migrate crm-seed crm-autocreate-backfill crm-marketing-spend-migrate crm-marketing-spend-demo crm-marketing-spend-rebuild crm-marketing-demo-seed crm-marketing-google-airbyte-migrate crm-marketing-google-airbyte-seed crm-marketing-google-airbyte-normalize crm-marketing-google-airbyte-clear crm-marketing-meta-airbyte-migrate crm-marketing-meta-airbyte-seed crm-marketing-meta-airbyte-normalize crm-marketing-meta-airbyte-clear crm-marketing-source-mapping-migrate crm-marketing-source-mapping-seed fleexa-manager-booking-sync-migrate fleexa-manager-session-migrate fleexa-manager-concurrency-migrate fleexa-manager-openapi-check fleexa-manager-rspec fleexa-manager-e2e-smoke fleexa-manager-health-check fleexa-manager-ci-check crm-copy-patches crm-patch-check crm-patch crm-install crm-vue-copy crm-vue-check crm-vue-patch crm-assets-build-host crm-assets-install-local crm-assets-refresh-local

ensure-env:
	@test -f $(ENV_FILE) || (echo "$(ENV_FILE) is missing. Run: make setup"; exit 1)

setup:
	@if [ ! -f $(ENV_FILE) ]; then cp .env.local.example $(ENV_FILE); echo "Created $(ENV_FILE)"; else echo "$(ENV_FILE) already exists"; fi
	$(COMPOSE) build

up: ensure-env
	$(COMPOSE) up -d

down:
	$(COMPOSE_NO_ENV) down

logs:
	$(COMPOSE_NO_ENV) logs -f rails

migrate: ensure-env
	$(COMPOSE) exec rails bundle exec rails db:migrate

seed: ensure-env
	$(COMPOSE) exec rails bundle exec rails db:seed

shell: ensure-env
	$(COMPOSE) exec rails bash

verify-patch: ensure-env
	$(COMPOSE) exec rails grep -n "message_for_window" /app/app/services/conversations/message_window_service.rb

crm-apply: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-pipeline-migration.sql postgres:/tmp/crm-pipeline-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-spend-migration.sql postgres:/tmp/crm-marketing-spend-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-google-airbyte-migration.sql postgres:/tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-meta-airbyte-migration.sql postgres:/tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-mapping-migration.sql postgres:/tmp/crm-marketing-source-mapping-migration.sql
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-booking-sync-foundation.sql postgres:/tmp/fleexa-manager-booking-sync-foundation.sql
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-sessions.sql postgres:/tmp/fleexa-manager-sessions.sql
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-concurrency-safety.sql postgres:/tmp/fleexa-manager-concurrency-safety.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-pipeline-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-spend-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-source-mapping-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-booking-sync-foundation.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-sessions.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-concurrency-safety.sql
	@echo "CRM tables applied"

crm-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-pipeline-migration.sql postgres:/tmp/crm-pipeline-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-spend-migration.sql postgres:/tmp/crm-marketing-spend-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-google-airbyte-migration.sql postgres:/tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-meta-airbyte-migration.sql postgres:/tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-mapping-migration.sql postgres:/tmp/crm-marketing-source-mapping-migration.sql
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-booking-sync-foundation.sql postgres:/tmp/fleexa-manager-booking-sync-foundation.sql
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-sessions.sql postgres:/tmp/fleexa-manager-sessions.sql
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-concurrency-safety.sql postgres:/tmp/fleexa-manager-concurrency-safety.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-pipeline-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-spend-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-source-mapping-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-booking-sync-foundation.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-sessions.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-concurrency-safety.sql
	@echo "CRM migration complete"

crm-seed:
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-seed" && exit 1)
	sed "s/ACCOUNT_ID/$(ACCOUNT_ID)/g" chatwoot-patches/crm-pipeline-seed.sql | $(COMPOSE) exec -T postgres psql -U chatwoot -d chatwoot_production
	@echo "CRM seed complete"

crm-autocreate-backfill: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-autocreate-backfill" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:backfill_unassigned_deals[$(ACCOUNT_ID)]"

crm-marketing-spend-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-marketing-spend-migration.sql postgres:/tmp/crm-marketing-spend-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-google-airbyte-migration.sql postgres:/tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-meta-airbyte-migration.sql postgres:/tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-mapping-migration.sql postgres:/tmp/crm-marketing-source-mapping-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-spend-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-source-mapping-migration.sql
	@echo "CRM marketing spend migration complete"

crm-marketing-spend-demo: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-spend-demo" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:demo_manual_entry[$(ACCOUNT_ID)]"

crm-marketing-spend-rebuild: ensure-env
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:rebuild[$(ACCOUNT_ID),$(ENTRY_ID)]"

crm-marketing-google-airbyte-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-marketing-google-airbyte-migration.sql postgres:/tmp/crm-marketing-google-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-google-airbyte-migration.sql
	@echo "CRM marketing Google Airbyte migration complete"

crm-marketing-google-airbyte-seed: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-google-airbyte-seed" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:seed_google_ads_mock[$(ACCOUNT_ID)]"

crm-marketing-google-airbyte-normalize: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-google-airbyte-normalize" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:normalize_google_ads[$(ACCOUNT_ID)]"

crm-marketing-google-airbyte-clear: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-google-airbyte-clear" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:clear_google_ads_mock[$(ACCOUNT_ID)]"

crm-marketing-meta-airbyte-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-marketing-meta-airbyte-migration.sql postgres:/tmp/crm-marketing-meta-airbyte-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-meta-airbyte-migration.sql
	@echo "CRM marketing Meta Airbyte migration complete"

crm-marketing-meta-airbyte-seed: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-meta-airbyte-seed" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:seed_meta_ads_mock[$(ACCOUNT_ID)]"

crm-marketing-meta-airbyte-normalize: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-meta-airbyte-normalize" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:normalize_meta_ads[$(ACCOUNT_ID)]"

crm-marketing-meta-airbyte-clear: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-meta-airbyte-clear" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:clear_meta_ads_mock[$(ACCOUNT_ID)]"

crm-marketing-source-mapping-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-mapping-migration.sql postgres:/tmp/crm-marketing-source-mapping-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-marketing-source-mapping-migration.sql
	@echo "CRM marketing source mapping migration complete"

crm-marketing-source-mapping-seed: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-source-mapping-seed" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_spend:seed_source_mappings[$(ACCOUNT_ID)]"

fleexa-manager-booking-sync-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-booking-sync-foundation.sql postgres:/tmp/fleexa-manager-booking-sync-foundation.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-booking-sync-foundation.sql
	@echo "Fleexa Manager booking sync foundation migration complete"

fleexa-manager-session-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-sessions.sql postgres:/tmp/fleexa-manager-sessions.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-sessions.sql
	@echo "Fleexa Manager session tables applied"

fleexa-manager-concurrency-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-concurrency-safety.sql postgres:/tmp/fleexa-manager-concurrency-safety.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/fleexa-manager-concurrency-safety.sql
	@echo "Fleexa Manager concurrency safety applied"

fleexa-manager-rspec: ensure-env
	sh scripts/fleexa-manager-rspec.sh

fleexa-manager-e2e-smoke: ensure-env
	FLEEXA_MANAGER_RSPEC_FILES="spec/requests/api/fleexa_manager/v1/controlled_beta_smoke_spec.rb" sh scripts/fleexa-manager-rspec.sh

fleexa-manager-openapi-check:
	ruby -ryaml -e "YAML.load_file('docs/fleexa-manager/openapi.yaml'); puts 'OpenAPI YAML parsed'"

fleexa-manager-health-check:
	sh scripts/fleexa-manager-health-check.sh

fleexa-manager-ci-check:
	npm run lint
	npm run typecheck
	npm test
	npm run smoke:web
	$(MAKE) fleexa-manager-openapi-check
	$(MAKE) fleexa-manager-rspec
	$(MAKE) fleexa-manager-e2e-smoke
	$(MAKE) crm-assets-build-host
	git diff --check

crm-marketing-demo-seed: ensure-env
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-marketing-demo-seed" && exit 1)
	$(COMPOSE) exec rails bundle exec rake "crm:marketing_demo:seed[$(ACCOUNT_ID)]"

crm-copy-patches: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-models.rb.patch rails:/tmp/crm-models.rb.patch
	$(COMPOSE) cp chatwoot-patches/crm-controllers.rb.patch rails:/tmp/crm-controllers.rb.patch
	$(COMPOSE) cp chatwoot-patches/crm-routes.rb.patch rails:/tmp/crm-routes.rb.patch
	$(COMPOSE) cp chatwoot-patches/crm-ensure-from-conversation.patch rails:/tmp/crm-ensure-from-conversation.patch
	$(COMPOSE) cp chatwoot-patches/crm-webhook-listener.patch rails:/tmp/crm-webhook-listener.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-fields-backend.patch rails:/tmp/crm-deal-fields-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-query-backend.patch rails:/tmp/crm-deal-query-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-deals-export-backend.patch rails:/tmp/crm-deals-export-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-backfill.patch rails:/tmp/crm-deal-backfill.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-dashboard-config-backend.patch rails:/tmp/crm-marketing-dashboard-config-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-spend-backend.patch rails:/tmp/crm-marketing-spend-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-google-airbyte-backend.patch rails:/tmp/crm-marketing-google-airbyte-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-meta-airbyte-backend.patch rails:/tmp/crm-marketing-meta-airbyte-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-mapping-backend.patch rails:/tmp/crm-marketing-source-mapping-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-monthly-spend-source-backend.patch rails:/tmp/crm-marketing-monthly-spend-source-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-settings-backend.patch rails:/tmp/crm-marketing-source-settings-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-detection-rules-backend.patch rails:/tmp/crm-marketing-source-detection-rules-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-attribution-settings-native-backend.patch rails:/tmp/crm-marketing-attribution-settings-native-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-manual-spend-attribution-sources-backend.patch rails:/tmp/crm-manual-spend-attribution-sources-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-economics-kpi-layer-backend.patch rails:/tmp/crm-marketing-economics-kpi-layer-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-demo-seed-backend.patch rails:/tmp/crm-marketing-demo-seed-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-chat-api-backend.patch rails:/tmp/fleexa-manager-chat-api-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-conversation-filters-backend.patch rails:/tmp/fleexa-manager-conversation-filters-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-linked-deal-backend.patch rails:/tmp/fleexa-manager-linked-deal-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-pipeline-api-backend.patch rails:/tmp/fleexa-manager-pipeline-api-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-booking-sync-foundation-backend.patch rails:/tmp/fleexa-manager-booking-sync-foundation-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-booking-sync-logic-backend.patch rails:/tmp/fleexa-manager-booking-sync-logic-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-security-rate-limits-backend.patch rails:/tmp/fleexa-manager-security-rate-limits-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-session-strategy-backend.patch rails:/tmp/fleexa-manager-session-strategy-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-concurrency-safety-backend.patch rails:/tmp/fleexa-manager-concurrency-safety-backend.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-manager-realtime-backend.patch rails:/tmp/fleexa-manager-realtime-backend.patch
	@echo "CRM patch files copied to Rails container"

crm-patch-check: crm-copy-patches
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-models.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-controllers.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-routes.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-ensure-from-conversation.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-webhook-listener.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-fields-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-query-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deals-export-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-backfill.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-dashboard-config-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-spend-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-google-airbyte-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-meta-airbyte-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-source-mapping-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-monthly-spend-source-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-source-settings-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-source-detection-rules-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-attribution-settings-native-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-manual-spend-attribution-sources-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-economics-kpi-layer-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-demo-seed-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-chat-api-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-conversation-filters-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-linked-deal-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-pipeline-api-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-booking-sync-foundation-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-booking-sync-logic-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-security-rate-limits-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-session-strategy-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-concurrency-safety-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-manager-realtime-backend.patch"
	@echo "CRM patches validated"

crm-patch:
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-models.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-controllers.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-routes.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-ensure-from-conversation.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-webhook-listener.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-fields-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-query-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deals-export-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-backfill.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-dashboard-config-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-spend-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-google-airbyte-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-meta-airbyte-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-source-mapping-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-monthly-spend-source-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-source-settings-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-source-detection-rules-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-attribution-settings-native-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-manual-spend-attribution-sources-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-economics-kpi-layer-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-demo-seed-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-chat-api-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-conversation-filters-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-linked-deal-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-pipeline-api-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-booking-sync-foundation-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-booking-sync-logic-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-security-rate-limits-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-session-strategy-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-concurrency-safety-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-manager-realtime-backend.patch"
	@echo "CRM patches applied to Rails container"

crm-install: crm-copy-patches crm-patch
	@echo "CRM backend installed in Rails container"

crm-vue-copy: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-pipeline-vue.patch rails:/tmp/crm-pipeline-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-vue.patch rails:/tmp/crm-deal-workspace-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-fields-vue.patch rails:/tmp/crm-deal-fields-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-inbox-chat-vue.patch rails:/tmp/crm-deal-workspace-inbox-chat-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-sidebar-style-vue.patch rails:/tmp/crm-deal-workspace-sidebar-style-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-emoji-picker-vue.patch rails:/tmp/crm-deal-workspace-emoji-picker-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-tabs-vue.patch rails:/tmp/crm-deal-workspace-tabs-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-conversation-load-fix-vue.patch rails:/tmp/crm-deal-workspace-conversation-load-fix-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-workspace-assignee-vue.patch rails:/tmp/crm-deal-workspace-assignee-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-analytics-vue.patch rails:/tmp/crm-marketing-analytics-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-date-input-format-vue.patch rails:/tmp/crm-date-input-format-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-dashboard-config-vue.patch rails:/tmp/crm-marketing-dashboard-config-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-spend-vue.patch rails:/tmp/crm-marketing-spend-vue.patch
	$(COMPOSE) cp chatwoot-patches/fleexa-global-branding-visible-ui.patch rails:/tmp/fleexa-global-branding-visible-ui.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-lead-trend-polish-vue.patch rails:/tmp/crm-marketing-lead-trend-polish-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-monthly-spend-revenue-vue.patch rails:/tmp/crm-marketing-monthly-spend-revenue-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-settings-vue.patch rails:/tmp/crm-marketing-source-settings-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-detection-rules-vue.patch rails:/tmp/crm-marketing-source-detection-rules-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-source-visibility-analytics-vue.patch rails:/tmp/crm-marketing-source-visibility-analytics-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-attribution-settings-native-vue.patch rails:/tmp/crm-marketing-attribution-settings-native-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-page-level-controls-vue.patch rails:/tmp/crm-marketing-page-level-controls-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-reuse-chatwoot-date-filter-vue.patch rails:/tmp/crm-marketing-reuse-chatwoot-date-filter-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-remove-legacy-attribution-vue.patch rails:/tmp/crm-marketing-remove-legacy-attribution-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-manual-spend-attribution-sources-vue.patch rails:/tmp/crm-manual-spend-attribution-sources-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-attribution-settings-board-vue.patch rails:/tmp/crm-marketing-attribution-settings-board-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-economics-foundation-vue.patch rails:/tmp/crm-marketing-economics-foundation-vue.patch
	$(COMPOSE) cp chatwoot-patches/crm-marketing-economics-kpi-layer-vue.patch rails:/tmp/crm-marketing-economics-kpi-layer-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-loss-analysis-vue.patch rails:/tmp/crm-marketing-loss-analysis-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-demo-readiness-vue.patch rails:/tmp/crm-marketing-demo-readiness-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-economics-meeting-polish-vue.patch rails:/tmp/crm-marketing-economics-meeting-polish-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-two-funnels-vue.patch rails:/tmp/crm-marketing-two-funnels-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-leads-as-clients-vue.patch rails:/tmp/crm-marketing-leads-as-clients-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-loss-summary-panel-vue.patch rails:/tmp/crm-marketing-loss-summary-panel-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-pipeline-funnel-reach-vue.patch rails:/tmp/crm-marketing-pipeline-funnel-reach-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-lead-trend-after-economics-vue.patch rails:/tmp/crm-marketing-lead-trend-after-economics-vue.patch
		$(COMPOSE) cp chatwoot-patches/crm-marketing-monthly-chart-all-periods-vue.patch rails:/tmp/crm-marketing-monthly-chart-all-periods-vue.patch
		@echo "CRM Vue patch copied to Rails container"

crm-vue-check: crm-vue-copy
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-pipeline-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-fields-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-inbox-chat-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-sidebar-style-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-emoji-picker-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-tabs-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-conversation-load-fix-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-assignee-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-analytics-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-date-input-format-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-dashboard-config-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-spend-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/fleexa-global-branding-visible-ui.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-lead-trend-polish-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-monthly-spend-revenue-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-source-settings-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-source-detection-rules-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-source-visibility-analytics-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-attribution-settings-native-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-page-level-controls-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-reuse-chatwoot-date-filter-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-remove-legacy-attribution-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-manual-spend-attribution-sources-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-attribution-settings-board-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-economics-foundation-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-economics-kpi-layer-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-loss-analysis-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-demo-readiness-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-economics-meeting-polish-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-two-funnels-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-leads-as-clients-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-loss-summary-panel-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-pipeline-funnel-reach-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-lead-trend-after-economics-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-marketing-monthly-chart-all-periods-vue.patch"
		@echo "CRM Vue patch validated"

crm-vue-patch: crm-vue-copy
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-pipeline-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-fields-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-inbox-chat-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-sidebar-style-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-emoji-picker-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-tabs-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-conversation-load-fix-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-assignee-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-analytics-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-date-input-format-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-dashboard-config-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-spend-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/fleexa-global-branding-visible-ui.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-lead-trend-polish-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-monthly-spend-revenue-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-source-settings-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-source-detection-rules-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-source-visibility-analytics-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-attribution-settings-native-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-page-level-controls-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-reuse-chatwoot-date-filter-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-remove-legacy-attribution-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-manual-spend-attribution-sources-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-attribution-settings-board-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-economics-foundation-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-economics-kpi-layer-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-loss-analysis-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-demo-readiness-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-economics-meeting-polish-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-two-funnels-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-leads-as-clients-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-loss-summary-panel-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-pipeline-funnel-reach-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-lead-trend-after-economics-vue.patch"
		$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-marketing-monthly-chart-all-periods-vue.patch"
		@echo "CRM Vue patch applied"

crm-assets-build-host:
	@set -e; \
	build_dir="$(CRM_ASSETS_BUILD_DIR)"; \
	copy_container="fleexa-chatwoot-app-copy-$$(date +%s)-$$$$"; \
	rm -rf "$$build_dir"; \
	mkdir -p "$$build_dir"; \
	docker create --name "$$copy_container" "$(CHATWOOT_BASE_IMAGE)" >/dev/null; \
	trap 'docker rm -f "$$copy_container" >/dev/null 2>&1 || true' EXIT; \
	docker cp "$$copy_container:/app/." "$$build_dir"; \
	docker rm -f "$$copy_container" >/dev/null; \
	trap - EXIT; \
	cd "$$build_dir"; \
	git apply "$(CURDIR)/chatwoot-patches/instagram-human-agent-activity-window.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-models.rb.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-controllers.rb.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-routes.rb.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-ensure-from-conversation.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-webhook-listener.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-fields-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-query-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deals-export-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-backfill.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-dashboard-config-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-spend-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-google-airbyte-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-meta-airbyte-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-source-mapping-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-monthly-spend-source-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-source-settings-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-source-detection-rules-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-attribution-settings-native-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-manual-spend-attribution-sources-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-economics-kpi-layer-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-demo-seed-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-chat-api-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-conversation-filters-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-linked-deal-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-pipeline-api-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-booking-sync-foundation-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-booking-sync-logic-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-security-rate-limits-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-session-strategy-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-concurrency-safety-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-manager-realtime-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-pipeline-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-fields-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-inbox-chat-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-sidebar-style-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-emoji-picker-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-tabs-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-conversation-load-fix-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-assignee-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-analytics-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-date-input-format-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-dashboard-config-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-spend-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/fleexa-global-branding-visible-ui.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-lead-trend-polish-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-monthly-spend-revenue-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-source-settings-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-source-detection-rules-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-source-visibility-analytics-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-attribution-settings-native-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-marketing-page-level-controls-vue.patch"; \
		git apply "$(CURDIR)/chatwoot-patches/crm-marketing-reuse-chatwoot-date-filter-vue.patch"; \
		git apply "$(CURDIR)/chatwoot-patches/crm-marketing-remove-legacy-attribution-vue.patch"; \
		git apply "$(CURDIR)/chatwoot-patches/crm-manual-spend-attribution-sources-vue.patch"; \
		git apply "$(CURDIR)/chatwoot-patches/crm-marketing-attribution-settings-board-vue.patch"; \
		git apply "$(CURDIR)/chatwoot-patches/crm-marketing-economics-foundation-vue.patch"; \
		git apply "$(CURDIR)/chatwoot-patches/crm-marketing-economics-kpi-layer-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-loss-analysis-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-demo-readiness-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-economics-meeting-polish-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-two-funnels-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-leads-as-clients-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-loss-summary-panel-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-pipeline-funnel-reach-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-lead-trend-after-economics-vue.patch"; \
			git apply "$(CURDIR)/chatwoot-patches/crm-marketing-monthly-chart-all-periods-vue.patch"; \
		perl -0pi -e "s/import \\{ colors \\} from '\\.\\/theme\\/colors';/const { colors } = require('.\\/theme\\/colors.js');/; s/import \\{ icons \\} from '\\.\\/theme\\/icons';/const { icons } = require('.\\/theme\\/icons.js');/" tailwind.config.js; \
	perl -0pi -e "s/export const colors =/const colors =/; s/\\n\\};\\s*\\z/\\n};\\nmodule.exports = { colors };\\n/s" theme/colors.js; \
	perl -0pi -e "s/export const icons =/const icons =/; s/\\n\\};\\s*\\z/\\n};\\nmodule.exports = { icons };\\n/s" theme/icons.js; \
	grep -n "ConversationBox" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "CRM Deal" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Operator" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "isDealEditing" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "crm-deal-chat-shell" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "emoji-dialog" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "activeSidebarTab" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Show tracking" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "client" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "MarketingDashboardController" app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb; \
	grep -n "DEFAULT_WIDGETS" app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb; \
	grep -n "manual_spend_traffic_source" app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb; \
	grep -n "ManualEntryNormalizer" app/services/crm/marketing_spend/manual_entry_normalizer.rb; \
	grep -n "GoogleAdsAirbyteNormalizer" app/services/crm/marketing_spend/google_ads_airbyte_normalizer.rb; \
	grep -n "AirbyteGoogleAdsDailySpendMock" app/models/airbyte_google_ads_daily_spend_mock.rb; \
	grep -n "seed_google_ads_mock" lib/tasks/crm_marketing_spend.rake; \
	grep -n "MetaAdsAirbyteNormalizer" app/services/crm/marketing_spend/meta_ads_airbyte_normalizer.rb; \
	grep -n "AirbyteMetaAdsDailySpendMock" app/models/airbyte_meta_ads_daily_spend_mock.rb; \
	grep -n "seed_meta_ads_mock" lib/tasks/crm_marketing_spend.rake; \
	grep -n "SourceMappingResolver" app/services/crm/marketing_spend/source_mapping_resolver.rb; \
	grep -n "MarketingSourceMapping" app/models/marketing_source_mapping.rb; \
	grep -n "seed_source_mappings" lib/tasks/crm_marketing_spend.rake; \
	grep -n "namespace :marketing_demo" lib/tasks/crm_marketing_demo.rake; \
	grep -n "Customize dashboard" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Manual Spend Entries" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "activeManualSpendTrafficSources" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Spend & Revenue by Month" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Attribution Settings" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Search sources, origins, rules" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Fallback Priority" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Traffic Sources" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Lead Origins" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Detection Rules" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "fallbackPriorityLabels" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "marketingSourceSeries" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Source filters" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "selectedSourceKey" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "WootDatePicker" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "selectedDateRange" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "traffic_source_label" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Traffic source label" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Lead Qualification" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Qualification Status" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Lost Reason" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Unique new clients in selected period" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Marketing spend in selected period" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Qualified Leads" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Successful Deal Amount" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "CPLQ" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Pipeline ROAS" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Completed ROAS" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Source Economics" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
		grep -n "Причины отказа" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Эффективность менеджеров" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "SLA ответа" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "lostReasonSummaryRows" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "managerPerformanceRows" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Reached stage from selected deals" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "deals reached" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "Stage Reach" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "New clients by source over time" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	if grep -nE "source_request|first_touch_source|first_touch_entry_point|source_raw_snapshot" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi; \
	grep -n "trafficSourceDisplay" app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue; \
	grep -n "fleexa.crm.pipeline.list_columns.v3" app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue; \
	grep -n "Source Attribution" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Detection method" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "lead_origin_key" app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb; \
	grep -n "traffic_sources" app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb; \
	grep -n "detection_rules" app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb; \
	grep -n "leadTrendLayeredSeries" app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue; \
	grep -n "fleexa_visible_config" app/views/layouts/vueapp.html.erb; \
	grep -n "Chat Fleexa" public/manifest.json; \
	grep -n "#0EA5A0" theme/colors.js; \
	grep -n "getMarketingSpend" app/javascript/dashboard/api/crmPipeline.js; \
	grep -n "getManualSpendEntries" app/javascript/dashboard/api/crmPipeline.js; \
	grep -n "#0EA5A0" theme/colors.js; \
	grep -n "14 165 160" app/javascript/dashboard/assets/scss/_next-colors.scss; \
	grep -n "Chat Fleexa" app/javascript/dashboard/i18n/locale/en/login.json; \
	grep -nE "visibleInstallationName|replaceInstallationName" app/javascript/shared/composables/useBranding.js; \
	grep -n "Fleexa brand color" app/javascript/dashboard/components-next/HelpCenter/PortalSwitcher/CreatePortalDialog.vue; \
	if grep -n "Reply to client" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi; \
	if grep -nE ">Title<|Title \\*" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi; \
	HUSKY=0 npx --yes pnpm@10.2.0 install --frozen-lockfile; \
	(node node_modules/esbuild/install.js 2>/dev/null || true); \
	NODE_OPTIONS=--max-old-space-size=4096 npx --yes pnpm@10.2.0 exec vite build --mode production; \
	test -d public/vite/assets; \
	test -f public/vite/.vite/manifest.json; \
	ls public/vite/assets/DealWorkspace-*.js >/dev/null; \
	grep -E "CRM Deal|Field setup|Operator" public/vite/assets/DealWorkspace-*.js >/dev/null; \
	grep -E "Pipeline|crm_pipeline_index|crm_deal_workspace|crm_marketing_analytics|MarketingAnalytics" public/vite/.vite/manifest.json public/vite/assets/Pipeline-*.js public/vite/assets/MarketingAnalytics-*.js >/dev/null; \
			grep -E "Customize dashboard|Add metric|Marketing spend in selected period|Manual Spend Entries|Spend & Revenue by Month|Add spend|Attribution Settings|Search sources, origins, rules|Show issues only|Legend|Fallback Priority|Traffic Sources|Lead Origins|Detection Rules|Source filters|Traffic Source|Campaign / placement|Select traffic source|Unique new clients in selected period|Qualified Leads|Successful Deal Amount|CPLQ|Pipeline ROAS|Completed ROAS|Source Economics|Pipeline Funnel|Marketing Funnel|Причины отказа|Эффективность менеджеров|SLA ответа|Stage Reach|New clients by source over time|need clarification" public/vite/assets/MarketingAnalytics-*.js >/dev/null; \
	grep -E "Traffic Source|Lead Origin|Needs source clarification" public/vite/assets/Pipeline-*.js >/dev/null; \
	grep -E "Source Attribution|Traffic Source|Lead Origin|Detection method|Needs clarification|Lead Qualification|Qualification Status|Lost Reason" public/vite/assets/DealWorkspace-*.js >/dev/null; \
	echo "CRM host assets built"

crm-assets-install-local: ensure-env
	@set -e; \
	test -d "$(CRM_ASSETS_BUILD_DIR)/public/vite" || (echo "Built assets missing: $(CRM_ASSETS_BUILD_DIR)/public/vite. Run: make crm-assets-build-host"; exit 1); \
	docker image inspect "$(CHATWOOT_LOCAL_IMAGE)" >/dev/null 2>&1 || (echo "Local image $(CHATWOOT_LOCAL_IMAGE) is missing. Build it before installing CRM host assets."; exit 1); \
	install_container="fleexa-chatwoot-assets-install-$$(date +%s)-$$$$"; \
	docker create --name "$$install_container" "$(CHATWOOT_LOCAL_IMAGE)" sh -lc "sleep 600" >/dev/null; \
	trap 'docker rm -f "$$install_container" >/dev/null 2>&1 || true' EXIT; \
	docker start "$$install_container" >/dev/null; \
	docker exec "$$install_container" sh -lc "mkdir -p /app/app/controllers/api/v1/accounts /app/app/controllers/api/fleexa_manager /app/app/javascript/dashboard/routes/dashboard /app/app/javascript/dashboard/api /app/app/javascript/dashboard/components-next/sidebar /app/app/services/crm/marketing_spend /app/app/services/fleexa_manager /app/app/services/onboarding /app/app/jobs/crm /app/lib/tasks /app/app/listeners /app/app/views/layouts/mailer /app/app/views/devise/mailer /app/app/views/installation/onboarding /app/app/views/mailers/administrator_notifications/account_compliance_mailer /app/app/views/mailers/administrator_notifications/account_notification_mailer /app/app/views/super_admin/application /app/app/views/super_admin/devise/sessions /app/app/views/super_admin/settings /app/public/brand-assets /app/public/packs/brand-assets /app/public/packs/js /app/theme /app/spec/requests/api /app/app/assets/stylesheets/administrate/library /app/app/assets/stylesheets/administrate/utilities"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/controllers/api/v1/accounts/crm" "$$install_container:/app/app/controllers/api/v1/accounts/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/controllers/api/fleexa_manager" "$$install_container:/app/app/controllers/api/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_deal.rb" "$$install_container:/app/app/models/crm_deal.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_deal_activity.rb" "$$install_container:/app/app/models/crm_deal_activity.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_deal_field_definition.rb" "$$install_container:/app/app/models/crm_deal_field_definition.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_loss_reason_option.rb" "$$install_container:/app/app/models/crm_loss_reason_option.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_pipeline_stage.rb" "$$install_container:/app/app/models/crm_pipeline_stage.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_pipeline_stage_required_field.rb" "$$install_container:/app/app/models/crm_pipeline_stage_required_field.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/manual_spend_entry.rb" "$$install_container:/app/app/models/manual_spend_entry.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/marketing_spend_daily.rb" "$$install_container:/app/app/models/marketing_spend_daily.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/airbyte_google_ads_daily_spend_mock.rb" "$$install_container:/app/app/models/airbyte_google_ads_daily_spend_mock.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/airbyte_meta_ads_daily_spend_mock.rb" "$$install_container:/app/app/models/airbyte_meta_ads_daily_spend_mock.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/marketing_source_mapping.rb" "$$install_container:/app/app/models/marketing_source_mapping.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/fleexa_manager_session.rb" "$$install_container:/app/app/models/fleexa_manager_session.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/portal.rb" "$$install_container:/app/app/models/portal.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/config/routes.rb" "$$install_container:/app/config/routes.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/config/locales/en.yml" "$$install_container:/app/config/locales/en.yml"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/config/locales/ru.yml" "$$install_container:/app/config/locales/ru.yml"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/crm/ensure_from_conversation_service.rb" "$$install_container:/app/app/services/crm/ensure_from_conversation_service.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/crm/marketing_spend/manual_entry_normalizer.rb" "$$install_container:/app/app/services/crm/marketing_spend/manual_entry_normalizer.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/crm/marketing_spend/google_ads_airbyte_normalizer.rb" "$$install_container:/app/app/services/crm/marketing_spend/google_ads_airbyte_normalizer.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/crm/marketing_spend/meta_ads_airbyte_normalizer.rb" "$$install_container:/app/app/services/crm/marketing_spend/meta_ads_airbyte_normalizer.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/crm/marketing_spend/source_mapping_resolver.rb" "$$install_container:/app/app/services/crm/marketing_spend/source_mapping_resolver.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/fleexa_manager" "$$install_container:/app/app/services/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/spec/requests/api/fleexa_manager" "$$install_container:/app/spec/requests/api/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/onboarding/web_widget_creation_service.rb" "$$install_container:/app/app/services/onboarding/web_widget_creation_service.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/jobs/crm/ensure_from_conversation_job.rb" "$$install_container:/app/app/jobs/crm/ensure_from_conversation_job.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/listeners/webhook_listener.rb" "$$install_container:/app/app/listeners/webhook_listener.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/lib/tasks/crm_deal_backfill.rake" "$$install_container:/app/lib/tasks/crm_deal_backfill.rake"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/lib/tasks/crm_marketing_spend.rake" "$$install_container:/app/lib/tasks/crm_marketing_spend.rake"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/lib/tasks/crm_marketing_demo.rake" "$$install_container:/app/lib/tasks/crm_marketing_demo.rake"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/conversations/message_window_service.rb" "$$install_container:/app/app/services/conversations/message_window_service.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/api/crmPipeline.js" "$$install_container:/app/app/javascript/dashboard/api/crmPipeline.js"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/conversation/CrmDealWidget.vue" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/conversation/CrmDealWidget.vue"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/crm" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/dashboard.routes.js" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/dashboard.routes.js"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/components-next/sidebar/Sidebar.vue" "$$install_container:/app/app/javascript/dashboard/components-next/sidebar/Sidebar.vue"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/layouts/vueapp.html.erb" "$$install_container:/app/app/views/layouts/vueapp.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/layouts/mailer/base.liquid" "$$install_container:/app/app/views/layouts/mailer/base.liquid"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/devise/mailer/_confirmation_body.html.erb" "$$install_container:/app/app/views/devise/mailer/_confirmation_body.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/devise/mailer/confirmation_instructions.html.erb" "$$install_container:/app/app/views/devise/mailer/confirmation_instructions.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/installation/onboarding/index.html.erb" "$$install_container:/app/app/views/installation/onboarding/index.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid" "$$install_container:/app/app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_for_inactivity.liquid" "$$install_container:/app/app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_for_inactivity.liquid"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_user_initiated.liquid" "$$install_container:/app/app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_user_initiated.liquid"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/super_admin/application/_navigation.html.erb" "$$install_container:/app/app/views/super_admin/application/_navigation.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/super_admin/devise/sessions/new.html.erb" "$$install_container:/app/app/views/super_admin/devise/sessions/new.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/views/super_admin/settings/show.html.erb" "$$install_container:/app/app/views/super_admin/settings/show.html.erb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/config/initializers/fleexa_manager_filter_parameter_logging.rb" "$$install_container:/app/config/initializers/fleexa_manager_filter_parameter_logging.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/assets/stylesheets/administrate/library/_variables.scss" "$$install_container:/app/app/assets/stylesheets/administrate/library/_variables.scss"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/assets/stylesheets/administrate/utilities/_variables.scss" "$$install_container:/app/app/assets/stylesheets/administrate/utilities/_variables.scss"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/manifest.json" "$$install_container:/app/public/manifest.json"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/packs/manifest.json" "$$install_container:/app/public/packs/manifest.json"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/brand-assets/logo.svg" "$$install_container:/app/public/brand-assets/logo.svg"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/brand-assets/logo_dark.svg" "$$install_container:/app/public/brand-assets/logo_dark.svg"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/brand-assets/logo_thumbnail.svg" "$$install_container:/app/public/brand-assets/logo_thumbnail.svg"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/packs/brand-assets/logo.svg" "$$install_container:/app/public/packs/brand-assets/logo.svg"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/packs/brand-assets/logo_dark.svg" "$$install_container:/app/public/packs/brand-assets/logo_dark.svg"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/packs/brand-assets/logo_thumbnail.svg" "$$install_container:/app/public/packs/brand-assets/logo_thumbnail.svg"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/packs/js/sdk.js" "$$install_container:/app/public/packs/js/sdk.js"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/theme/colors.js" "$$install_container:/app/theme/colors.js"; \
	docker exec "$$install_container" sh -lc "rm -rf /app/public/vite && mkdir -p /app/public"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/vite" "$$install_container:/app/public/vite"; \
	docker exec "$$install_container" sh -lc "test -d /app/public/vite/assets && test -f /app/public/vite/.vite/manifest.json"; \
	docker exec "$$install_container" sh -lc "grep -n 'deals_index_response' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'Required deal fields are missing for this stage' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'MarketingDashboardController' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'manual_spend_traffic_source' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'traffic_sources' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'detection_rules' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'ManualEntryNormalizer' /app/app/services/crm/marketing_spend/manual_entry_normalizer.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'GoogleAdsAirbyteNormalizer' /app/app/services/crm/marketing_spend/google_ads_airbyte_normalizer.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'AirbyteGoogleAdsDailySpendMock' /app/app/models/airbyte_google_ads_daily_spend_mock.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'seed_google_ads_mock' /app/lib/tasks/crm_marketing_spend.rake"; \
	docker exec "$$install_container" sh -lc "grep -n 'MetaAdsAirbyteNormalizer' /app/app/services/crm/marketing_spend/meta_ads_airbyte_normalizer.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'AirbyteMetaAdsDailySpendMock' /app/app/models/airbyte_meta_ads_daily_spend_mock.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'seed_meta_ads_mock' /app/lib/tasks/crm_marketing_spend.rake"; \
	docker exec "$$install_container" sh -lc "grep -n 'SourceMappingResolver' /app/app/services/crm/marketing_spend/source_mapping_resolver.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'MarketingSourceMapping' /app/app/models/marketing_source_mapping.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'seed_source_mappings' /app/lib/tasks/crm_marketing_spend.rake"; \
	docker exec "$$install_container" sh -lc "grep -n 'namespace :marketing_demo' /app/lib/tasks/crm_marketing_demo.rake"; \
	docker exec "$$install_container" sh -lc "grep -n 'ConversationBox' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'CRM Deal' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Operator' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'isDealEditing' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'crm-deal-chat-shell' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'emoji-dialog' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'activeSidebarTab' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Show tracking' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'client' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Marketing Analytics' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Customize dashboard' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Attribution Settings' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Search sources, origins, rules' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Fallback Priority' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Traffic Sources' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Lead Origins' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Detection Rules' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'fallbackPriorityLabels' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'marketingSourceSeries' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'trafficSourceDisplay' /app/app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'fleexa.crm.pipeline.list_columns.v3' /app/app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Source Attribution' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Detection method' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'lead_origin_key' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'DEFAULT_WIDGETS' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'Manual Spend Entries' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'activeManualSpendTrafficSources' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Spend & Revenue by Month' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Source filters' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'selectedSourceKey' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'WootDatePicker' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'selectedDateRange' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'traffic_source_label' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Traffic source label' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Lead Qualification' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Qualification Status' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Lost Reason' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Unique new clients in selected period' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Marketing spend in selected period' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Qualified Leads' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Successful Deal Amount' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'CPLQ' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Pipeline ROAS' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Completed ROAS' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Source Economics' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		docker exec "$$install_container" sh -lc "grep -n 'Причины отказа' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Эффективность менеджеров' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'SLA ответа' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'lostReasonSummaryRows' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'managerPerformanceRows' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Reached stage from selected deals' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'deals reached' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Stage Reach' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'New clients by source over time' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "if grep -nE 'source_request|first_touch_source|first_touch_entry_point|source_raw_snapshot' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue /app/app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	docker exec "$$install_container" sh -lc "grep -n 'leadTrendLayeredSeries' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'fleexa_visible_config' /app/app/views/layouts/vueapp.html.erb"; \
	docker exec "$$install_container" sh -lc "grep -n 'Chat Fleexa' /app/public/manifest.json"; \
	docker exec "$$install_container" sh -lc "grep -n '#0EA5A0' /app/theme/colors.js"; \
	docker exec "$$install_container" sh -lc "grep -n 'getMarketingDashboardConfig' /app/app/javascript/dashboard/api/crmPipeline.js"; \
	docker exec "$$install_container" sh -lc "grep -n 'getMarketingSpend' /app/app/javascript/dashboard/api/crmPipeline.js"; \
	docker exec "$$install_container" sh -lc "grep -n 'getManualSpendEntries' /app/app/javascript/dashboard/api/crmPipeline.js"; \
	docker exec "$$install_container" sh -lc "grep -n '#0EA5A0' /app/theme/colors.js"; \
	docker exec "$$install_container" sh -lc "grep -n '14 165 160' /app/app/javascript/dashboard/assets/scss/_next-colors.scss"; \
	docker exec "$$install_container" sh -lc "grep -n 'Chat Fleexa' /app/app/javascript/dashboard/i18n/locale/en/login.json"; \
	docker exec "$$install_container" sh -lc "grep -nE 'visibleInstallationName|replaceInstallationName' /app/app/javascript/shared/composables/useBranding.js"; \
	docker exec "$$install_container" sh -lc "grep -n 'Fleexa brand color' /app/app/javascript/dashboard/components-next/HelpCenter/PortalSwitcher/CreatePortalDialog.vue"; \
	docker exec "$$install_container" sh -lc "if grep -n 'Reply to client' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	docker exec "$$install_container" sh -lc "if grep -nE '>Title<|Title \\*' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	docker commit "$$install_container" "$(CHATWOOT_LOCAL_IMAGE)" >/dev/null; \
	docker rm -f "$$install_container" >/dev/null; \
	trap - EXIT; \
	$(COMPOSE) up -d --force-recreate rails sidekiq; \
	echo "CRM patched source and host assets installed into local image"

crm-assets-refresh-local: crm-assets-build-host crm-assets-install-local
	@set -e; \
	attempt=0; \
	until curl --max-time 5 -fsSI http://localhost:3000/app/accounts/1/pipeline > /tmp/fleexa-chatwoot-pipeline-headers || \
			curl --max-time 5 -fsSI http://localhost:3000/ > /tmp/fleexa-chatwoot-pipeline-headers; do \
		attempt=$$((attempt + 1)); \
		if [ "$$attempt" -ge 90 ]; then exit 1; fi; \
		sleep 2; \
	done; \
	head /tmp/fleexa-chatwoot-pipeline-headers; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'deals_index_response' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Required deal fields are missing for this stage' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'MarketingDashboardController' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'DEFAULT_WIDGETS' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'manual_spend_traffic_source' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'traffic_sources' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'detection_rules' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'ManualEntryNormalizer' /app/app/services/crm/marketing_spend/manual_entry_normalizer.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'GoogleAdsAirbyteNormalizer' /app/app/services/crm/marketing_spend/google_ads_airbyte_normalizer.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'AirbyteGoogleAdsDailySpendMock' /app/app/models/airbyte_google_ads_daily_spend_mock.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'seed_google_ads_mock' /app/lib/tasks/crm_marketing_spend.rake"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'MetaAdsAirbyteNormalizer' /app/app/services/crm/marketing_spend/meta_ads_airbyte_normalizer.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'AirbyteMetaAdsDailySpendMock' /app/app/models/airbyte_meta_ads_daily_spend_mock.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'seed_meta_ads_mock' /app/lib/tasks/crm_marketing_spend.rake"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'SourceMappingResolver' /app/app/services/crm/marketing_spend/source_mapping_resolver.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'MarketingSourceMapping' /app/app/models/marketing_source_mapping.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'seed_source_mappings' /app/lib/tasks/crm_marketing_spend.rake"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'namespace :marketing_demo' /app/lib/tasks/crm_marketing_demo.rake"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'ConversationBox' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'CRM Deal' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Operator' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'isDealEditing' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'crm-deal-chat-shell' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'emoji-dialog' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'activeSidebarTab' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Show tracking' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Marketing Analytics' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Customize dashboard' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Attribution Settings' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Search sources, origins, rules' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Fallback Priority' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Traffic Sources' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Lead Origins' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Detection Rules' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'fallbackPriorityLabels' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'marketingSourceSeries' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'trafficSourceDisplay' /app/app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'fleexa.crm.pipeline.list_columns.v3' /app/app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Source Attribution' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Detection method' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'lead_origin_key' /app/app/controllers/api/v1/accounts/crm/marketing_dashboard_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Manual Spend Entries' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'activeManualSpendTrafficSources' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Spend & Revenue by Month' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Source filters' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'selectedSourceKey' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'WootDatePicker' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'selectedDateRange' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'traffic_source_label' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Traffic source label' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Lead Qualification' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Qualification Status' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Lost Reason' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Unique new clients in selected period' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Marketing spend in selected period' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Qualified Leads' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Successful Deal Amount' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'CPLQ' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Pipeline ROAS' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Completed ROAS' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Source Economics' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
		$(COMPOSE) exec -T rails sh -lc "grep -n 'Причины отказа' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Эффективность менеджеров' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'SLA ответа' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'lostReasonSummaryRows' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'managerPerformanceRows' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Reached stage from selected deals' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'deals reached' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Stage Reach' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'New clients by source over time' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'monthlyChartSpendRows' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "if grep -nE 'source_request|first_touch_source|first_touch_entry_point|source_raw_snapshot' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue /app/app/javascript/dashboard/routes/dashboard/crm/Pipeline.vue /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'leadTrendLayeredSeries' /app/app/javascript/dashboard/routes/dashboard/crm/MarketingAnalytics.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'fleexa_visible_config' /app/app/views/layouts/vueapp.html.erb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Chat Fleexa' /app/public/manifest.json"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n '#0EA5A0' /app/theme/colors.js"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'getMarketingDashboardConfig' /app/app/javascript/dashboard/api/crmPipeline.js"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'getMarketingSpend' /app/app/javascript/dashboard/api/crmPipeline.js"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'getManualSpendEntries' /app/app/javascript/dashboard/api/crmPipeline.js"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n '#0EA5A0' /app/theme/colors.js"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n '14 165 160' /app/app/javascript/dashboard/assets/scss/_next-colors.scss"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Chat Fleexa' /app/app/javascript/dashboard/i18n/locale/en/login.json"; \
	$(COMPOSE) exec -T rails sh -lc "grep -nE 'visibleInstallationName|replaceInstallationName' /app/app/javascript/shared/composables/useBranding.js"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Fleexa brand color' /app/app/javascript/dashboard/components-next/HelpCenter/PortalSwitcher/CreatePortalDialog.vue"; \
	$(COMPOSE) exec -T rails sh -lc "if grep -n 'Reply to client' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	$(COMPOSE) exec -T rails sh -lc "if grep -nE '>Title<|Title \\*' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
			$(COMPOSE) exec -T rails sh -lc "test -d /app/public/vite/assets && test -f /app/public/vite/.vite/manifest.json && ls /app/public/vite/assets/DealWorkspace-*.js >/dev/null && ls /app/public/vite/assets/MarketingAnalytics-*.js >/dev/null && ls /app/public/vite/assets/Pipeline-*.js >/dev/null && grep -E 'CRM Deal|Field setup|Operator|Source Attribution|Traffic Source|Lead Origin|Detection method|Needs clarification|Lead Qualification|Qualification Status|Lost Reason' /app/public/vite/assets/DealWorkspace-*.js >/dev/null && grep -E 'Traffic Source|Lead Origin|Needs source clarification' /app/public/vite/assets/Pipeline-*.js >/dev/null && grep -E 'Marketing Analytics|Stage Reach|Customize dashboard|Add metric|Marketing spend in selected period|Manual Spend Entries|Spend & Revenue by Month|Add spend|Attribution Settings|Search sources, origins, rules|Show issues only|Legend|Fallback Priority|Traffic Sources|Lead Origins|Detection Rules|Source filters|Traffic Source|Campaign / placement|Select traffic source|Unique new clients in selected period|Qualified Leads|Successful Deal Amount|CPLQ|Pipeline ROAS|Completed ROAS|Source Economics|Pipeline Funnel|Reached stage from selected deals|Marketing Funnel|Причины отказа|Эффективность менеджеров|SLA ответа|New clients by source over time|need clarification' /app/public/vite/assets/MarketingAnalytics-*.js >/dev/null"; \
	echo "CRM local frontend assets refreshed"
