COMPOSE_FILE := docker-compose.local.yml
ENV_FILE := .env.local
COMPOSE := docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)
COMPOSE_NO_ENV := docker compose -f $(COMPOSE_FILE)
CHATWOOT_BASE_IMAGE := chatwoot/chatwoot:v4.14.2
CHATWOOT_LOCAL_IMAGE := fleexa-chatwoot:v4.14.2-patch1
CRM_ASSETS_BUILD_DIR := /tmp/fleexa-chatwoot-app-build

.PHONY: setup up down logs migrate seed shell verify-patch ensure-env crm-apply crm-migrate crm-seed crm-copy-patches crm-patch-check crm-patch crm-install crm-vue-copy crm-vue-check crm-vue-patch crm-assets-build-host crm-assets-install-local crm-assets-refresh-local

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
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-pipeline-migration.sql
	@echo "CRM tables applied"

crm-migrate: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-pipeline-migration.sql postgres:/tmp/crm-pipeline-migration.sql
	$(COMPOSE) exec postgres psql -U chatwoot -d chatwoot_production -f /tmp/crm-pipeline-migration.sql
	@echo "CRM migration complete"

crm-seed:
	@test -n "$(ACCOUNT_ID)" || (echo "Usage: ACCOUNT_ID=1 make crm-seed" && exit 1)
	sed "s/ACCOUNT_ID/$(ACCOUNT_ID)/g" chatwoot-patches/crm-pipeline-seed.sql | $(COMPOSE) exec -T postgres psql -U chatwoot -d chatwoot_production
	@echo "CRM seed complete"

crm-copy-patches: ensure-env
	$(COMPOSE) cp chatwoot-patches/crm-models.rb.patch rails:/tmp/crm-models.rb.patch
	$(COMPOSE) cp chatwoot-patches/crm-controllers.rb.patch rails:/tmp/crm-controllers.rb.patch
	$(COMPOSE) cp chatwoot-patches/crm-routes.rb.patch rails:/tmp/crm-routes.rb.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-fields-backend.patch rails:/tmp/crm-deal-fields-backend.patch
	$(COMPOSE) cp chatwoot-patches/crm-deal-query-backend.patch rails:/tmp/crm-deal-query-backend.patch
	@echo "CRM patch files copied to Rails container"

crm-patch-check: crm-copy-patches
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-models.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-controllers.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-routes.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-fields-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-query-backend.patch"
	@echo "CRM patches validated"

crm-patch:
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-models.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-controllers.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-routes.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-fields-backend.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-query-backend.patch"
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
	@echo "CRM Vue patch copied to Rails container"

crm-vue-check: crm-vue-copy
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-pipeline-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-fields-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-inbox-chat-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-sidebar-style-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-emoji-picker-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-deal-workspace-tabs-vue.patch"
	@echo "CRM Vue patch validated"

crm-vue-patch: crm-vue-copy
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-pipeline-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-fields-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-inbox-chat-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-sidebar-style-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-emoji-picker-vue.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-deal-workspace-tabs-vue.patch"
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
	perl -0pi -e "s/import \\{ colors \\} from '\\.\\/theme\\/colors';/const { colors } = require('.\\/theme\\/colors.js');/; s/import \\{ icons \\} from '\\.\\/theme\\/icons';/const { icons } = require('.\\/theme\\/icons.js');/" tailwind.config.js; \
	git apply "$(CURDIR)/chatwoot-patches/instagram-human-agent-activity-window.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-models.rb.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-controllers.rb.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-routes.rb.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-fields-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-query-backend.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-pipeline-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-fields-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-inbox-chat-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-sidebar-style-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-emoji-picker-vue.patch"; \
	git apply "$(CURDIR)/chatwoot-patches/crm-deal-workspace-tabs-vue.patch"; \
	grep -n "ConversationBox" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "CRM Deal" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "isDealEditing" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "crm-deal-chat-shell" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "emoji-dialog" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "activeSidebarTab" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "Show tracking" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	grep -n "client" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; \
	if grep -n "Reply to client" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi; \
	if grep -nE ">Title<|Title \\*" app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi; \
	npx --yes pnpm@10.2.0 install --frozen-lockfile; \
	(node node_modules/esbuild/install.js 2>/dev/null || true); \
	NODE_OPTIONS=--max-old-space-size=4096 npx --yes pnpm@10.2.0 exec vite build --mode production; \
	test -d public/vite/assets; \
	test -f public/vite/.vite/manifest.json; \
	ls public/vite/assets/DealWorkspace-*.js >/dev/null; \
	grep -E "CRM Deal|Field setup" public/vite/assets/DealWorkspace-*.js >/dev/null; \
	grep -E "Pipeline|crm_pipeline_index|crm_deal_workspace" public/vite/.vite/manifest.json public/vite/assets/Pipeline-*.js >/dev/null; \
	echo "CRM host assets built"

crm-assets-install-local: ensure-env
	@set -e; \
	test -d "$(CRM_ASSETS_BUILD_DIR)/public/vite" || (echo "Built assets missing: $(CRM_ASSETS_BUILD_DIR)/public/vite. Run: make crm-assets-build-host"; exit 1); \
	docker image inspect "$(CHATWOOT_LOCAL_IMAGE)" >/dev/null 2>&1 || (echo "Local image $(CHATWOOT_LOCAL_IMAGE) is missing. Build it before installing CRM host assets."; exit 1); \
	install_container="fleexa-chatwoot-assets-install-$$(date +%s)-$$$$"; \
	docker create --name "$$install_container" "$(CHATWOOT_LOCAL_IMAGE)" sh -lc "sleep 600" >/dev/null; \
	trap 'docker rm -f "$$install_container" >/dev/null 2>&1 || true' EXIT; \
	docker start "$$install_container" >/dev/null; \
	docker exec "$$install_container" sh -lc "mkdir -p /app/app/controllers/api/v1/accounts /app/app/javascript/dashboard/routes/dashboard /app/app/javascript/dashboard/api /app/app/javascript/dashboard/components-next/sidebar"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/controllers/api/v1/accounts/crm" "$$install_container:/app/app/controllers/api/v1/accounts/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_deal.rb" "$$install_container:/app/app/models/crm_deal.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_deal_activity.rb" "$$install_container:/app/app/models/crm_deal_activity.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_deal_field_definition.rb" "$$install_container:/app/app/models/crm_deal_field_definition.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_loss_reason_option.rb" "$$install_container:/app/app/models/crm_loss_reason_option.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_pipeline_stage.rb" "$$install_container:/app/app/models/crm_pipeline_stage.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/models/crm_pipeline_stage_required_field.rb" "$$install_container:/app/app/models/crm_pipeline_stage_required_field.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/config/routes.rb" "$$install_container:/app/config/routes.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/services/conversations/message_window_service.rb" "$$install_container:/app/app/services/conversations/message_window_service.rb"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/api/crmPipeline.js" "$$install_container:/app/app/javascript/dashboard/api/crmPipeline.js"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/conversation/CrmDealWidget.vue" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/conversation/CrmDealWidget.vue"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/crm" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/routes/dashboard/dashboard.routes.js" "$$install_container:/app/app/javascript/dashboard/routes/dashboard/dashboard.routes.js"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/app/javascript/dashboard/components-next/sidebar/Sidebar.vue" "$$install_container:/app/app/javascript/dashboard/components-next/sidebar/Sidebar.vue"; \
	docker exec "$$install_container" sh -lc "rm -rf /app/public/vite && mkdir -p /app/public"; \
	docker cp "$(CRM_ASSETS_BUILD_DIR)/public/vite" "$$install_container:/app/public/vite"; \
	docker exec "$$install_container" sh -lc "test -d /app/public/vite/assets && test -f /app/public/vite/.vite/manifest.json"; \
	docker exec "$$install_container" sh -lc "grep -n 'deals_index_response' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'Required deal fields are missing for this stage' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	docker exec "$$install_container" sh -lc "grep -n 'ConversationBox' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'CRM Deal' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'isDealEditing' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'crm-deal-chat-shell' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'emoji-dialog' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'activeSidebarTab' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'Show tracking' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	docker exec "$$install_container" sh -lc "grep -n 'client' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
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
		if [ "$$attempt" -ge 30 ]; then exit 1; fi; \
		sleep 2; \
	done; \
	head /tmp/fleexa-chatwoot-pipeline-headers; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'deals_index_response' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Required deal fields are missing for this stage' /app/app/controllers/api/v1/accounts/crm/deals_controller.rb"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'ConversationBox' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'CRM Deal' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'isDealEditing' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'crm-deal-chat-shell' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'emoji-dialog' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'activeSidebarTab' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "grep -n 'Show tracking' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue"; \
	$(COMPOSE) exec -T rails sh -lc "if grep -n 'Reply to client' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	$(COMPOSE) exec -T rails sh -lc "if grep -nE '>Title<|Title \\*' /app/app/javascript/dashboard/routes/dashboard/crm/DealWorkspace.vue; then exit 1; fi"; \
	$(COMPOSE) exec -T rails sh -lc "test -d /app/public/vite/assets && test -f /app/public/vite/.vite/manifest.json && ls /app/public/vite/assets/DealWorkspace-*.js >/dev/null && grep -E 'CRM Deal|Field setup' /app/public/vite/assets/DealWorkspace-*.js >/dev/null"; \
	echo "CRM local frontend assets refreshed"
