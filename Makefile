.PHONY: help install setup dev docker-up docker-down docker-build docker-rebuild typecheck build env validate health

export DOCKER_BUILDKIT ?= 1
export COMPOSE_DOCKER_CLI_BUILD ?= 1

help:
	@echo "Targets: install setup dev docker-up docker-down docker-build docker-rebuild typecheck build env"

install:
	corepack enable
	pnpm install --frozen-lockfile

env:
	node scripts/ensure-env.mjs

setup: env
	bash scripts/setup.sh

dev:
	bash scripts/dev.sh

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build

docker-rebuild:
	bash scripts/docker-rebuild.sh

typecheck:
	pnpm typecheck

build:
	pnpm build

validate:
	pnpm validate

health:
	node scripts/health-check.mjs
