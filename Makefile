COMPOSE_FILE := docker-compose.local.yml
ENV_FILE := .env.local
COMPOSE := docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)
COMPOSE_NO_ENV := docker compose -f $(COMPOSE_FILE)

.PHONY: setup up down logs migrate seed shell verify-patch ensure-env

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
