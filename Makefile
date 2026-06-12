.DEFAULT_GOAL := help
.PHONY: help check-pnpm install env shared dev emulators run build typecheck lint clean mcp-build

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

check-pnpm:
	@command -v pnpm >/dev/null 2>&1 || { \
		echo "error: pnpm not found on PATH."; \
		echo "  install with: brew install pnpm   (or: npm install -g pnpm@9.12.0)"; \
		exit 1; \
	}

install: check-pnpm ## Install workspace dependencies
	pnpm install

env: apps/web/.env.local ## Create apps/web/.env.local from the dev template

apps/web/.env.local: apps/web/.env.local.example
	cp apps/web/.env.local.example apps/web/.env.local
	@echo "Wrote apps/web/.env.local from .env.local.example."

shared: check-pnpm ## Build @protypic/shared (required before web typecheck/dev)
	pnpm -F @protypic/shared build

dev: shared ## Run the Next.js dev server on :3000 (run `make emulators` in another terminal)
	pnpm -F @protypic/web dev

# Brew's openjdk is keg-only; prepend it so the Firestore/Auth emulators find `java`.
JAVA_BIN := /opt/homebrew/opt/openjdk/bin
EMULATOR_ENV := PATH="$(JAVA_BIN):$$PATH"

emulators: ## Start Firebase Auth + Firestore + Storage emulators
	$(EMULATOR_ENV) firebase emulators:start

run: shared ## Build shared, start emulators + Next.js dev server together (Ctrl-C stops both)
	@set -e; \
	trap 'kill 0' INT TERM EXIT; \
	$(EMULATOR_ENV) firebase emulators:start & \
	pnpm -F @protypic/web dev; \
	wait

build: shared ## Build everything (shared + web + mcp)
	pnpm -F @protypic/web build
	pnpm -F @protypic/mcp build

mcp-build: shared ## Build only the MCP server bundle
	pnpm -F @protypic/mcp build

typecheck: shared ## Typecheck all packages
	pnpm -r typecheck

lint: ## Lint apps/web
	pnpm -F @protypic/web lint

clean: ## Remove build artifacts and node_modules
	rm -rf packages/shared/dist packages/mcp-server/dist apps/web/.next
	find . -name node_modules -type d -prune -exec rm -rf {} +
