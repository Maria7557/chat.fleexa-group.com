COMPOSE_FILE := docker-compose.local.yml
ENV_FILE := .env.local
COMPOSE := docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)
COMPOSE_NO_ENV := docker compose -f $(COMPOSE_FILE)

.PHONY: setup up down logs migrate seed shell verify-patch ensure-env crm-apply crm-migrate crm-seed crm-copy-patches crm-patch-check crm-patch crm-install

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
	@echo "CRM patch files copied to Rails container"

crm-patch-check: crm-copy-patches
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-models.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-controllers.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply --check /tmp/crm-routes.rb.patch"
	@echo "CRM patches validated"

crm-patch:
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-models.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-controllers.rb.patch"
	$(COMPOSE) exec rails sh -lc "cd /app && git apply /tmp/crm-routes.rb.patch"
	@echo "CRM patches applied to Rails container"

crm-install: crm-copy-patches crm-patch
	@echo "CRM backend installed in Rails container"
